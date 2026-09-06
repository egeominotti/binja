import { cpus, totalmem } from 'node:os'
import { compile, Environment, Lexer, Runtime } from '../src'
import * as liquid from '../src/engines/liquid'
import { rejectattr } from '../src/filters'

type BenchmarkCase = SyncBenchmarkCase | AsyncBenchmarkCase

interface BenchmarkCaseBase {
  iterations: number
  name: string
}

interface SyncBenchmarkCase extends BenchmarkCaseBase {
  mode: 'sync'
  run: () => unknown
}

interface AsyncBenchmarkCase extends BenchmarkCaseBase {
  mode: 'async'
  run: () => Promise<unknown>
}

interface BenchmarkResult {
  batchMedianMs: number
  iterations: number
  maxOpsPerSecond: number
  medianOpsPerSecond: number
  minOpsPerSecond: number
  mode: 'sync' | 'async'
  name: string
  relativeStdDev: number
  samplesMs: number[]
}

const requestedRounds = Number(Bun.env.BENCH_ROUNDS ?? 7)
const rounds = Number.isInteger(requestedRounds) && requestedRounds >= 3 ? requestedRounds : 7
const jsonOutput = process.argv.includes('--json')

const environment = new Environment({ autoescape: false })
const simpleSource = '<h1>{{ title }}</h1><p>{{ description }}</p>'
const loopSource =
  '{% for item in items %}<article>{{ forloop.counter }}:{{ item.name }}</article>{% endfor %}'
const simpleContext = { description: 'A fast template engine', title: 'binja' }
const loopContext = {
  items: Array.from({ length: 100 }, (_, index) => ({ name: `item-${index}` })),
}

const simpleAst = environment.compile(simpleSource)
const loopAst = environment.compile(loopSource)
const runtime = new Runtime({ autoescape: false })
const emptyAst = environment.compile('')
const includeLoopAst = environment.compile('{% include "empty" %}' + loopSource)
const includeRuntime = new Runtime({ autoescape: false, templateLoader: async () => emptyAst })
const simpleAot = compile(simpleSource, { autoescape: false })
const loopAot = compile(loopSource, { autoescape: false })
const liquidLoop = liquid.compile(
  '{% for item in items offset: 10 limit: 80 reversed %}{{ item.name }}{% endfor %}'
)
const filterItems = Array.from({ length: 20_000 }, (_, index) => ({
  enabled: index % 2 === 0,
  index,
}))
const lexerSource = `${'Static HTML and prose. '.repeat(100)}{{ title }}{% if enabled %}yes{% endif %}`
const customDelimiterSource = `${'Static HTML and prose. '.repeat(100)}[[ title ]]<% if enabled %>yes<% endif %>`

const cases: BenchmarkCase[] = [
  {
    iterations: 10_000,
    mode: 'sync',
    name: 'Lexer / default delimiters (2.3K chars)',
    run: () => new Lexer(lexerSource).tokenize(),
  },
  {
    iterations: 10_000,
    mode: 'sync',
    name: 'Lexer / custom delimiters (2.3K chars)',
    run: () =>
      new Lexer(customDelimiterSource, {
        blockEnd: '%>',
        blockStart: '<%',
        variableEnd: ']]',
        variableStart: '[[',
      }).tokenize(),
  },
  {
    iterations: 20_000,
    mode: 'async',
    name: 'Runtime / simple cached AST',
    run: () => runtime.render(simpleAst, simpleContext),
  },
  {
    iterations: 2_000,
    mode: 'async',
    name: 'Runtime / loop (100 items)',
    run: () => runtime.render(loopAst, loopContext),
  },
  {
    iterations: 2_000,
    mode: 'async',
    name: 'Runtime / loop with cached include (100 items)',
    run: () => includeRuntime.render(includeLoopAst, loopContext),
  },
  {
    iterations: 200_000,
    mode: 'sync',
    name: 'AOT / simple',
    run: () => simpleAot(simpleContext),
  },
  {
    iterations: 10_000,
    mode: 'sync',
    name: 'AOT / loop (100 items)',
    run: () => loopAot(loopContext),
  },
  {
    iterations: 2_000,
    mode: 'async',
    name: 'Liquid / loop modifiers (100 items)',
    run: () => liquidLoop(loopContext),
  },
  {
    iterations: 1_000,
    mode: 'sync',
    name: 'Filter / rejectattr (20K items)',
    run: () => rejectattr(filterItems, 'enabled', 'eq', true),
  },
]

let checksum = 0
await verifyCorrectness()

const results: BenchmarkResult[] = []
for (const benchmarkCase of cases) {
  results.push(await measure(benchmarkCase))
}

const metadata = {
  arch: process.arch,
  bun: Bun.version,
  cpu: cpus()[0]?.model ?? 'unknown',
  memoryGiB: Number((totalmem() / 1024 ** 3).toFixed(1)),
  platform: process.platform,
  rounds,
}

if (jsonOutput) {
  console.log(JSON.stringify({ metadata, results, checksum }, null, 2))
} else {
  console.log(`binja benchmark — Bun ${metadata.bun} — ${metadata.platform}/${metadata.arch}`)
  console.log(`${metadata.cpu} — ${metadata.memoryGiB} GiB RAM`)
  console.log(
    `Median of ${rounds} warmed rounds. Sync and async cases use separate harnesses; setup/compile time is excluded.\n`
  )
  console.log('| Case | Mode | median ops/s | min–max ops/s | RSD | batch median |')
  console.log('|---|:---:|---:|---:|---:|---:|')
  for (const result of results) {
    console.log(
      `| ${result.name} | ${result.mode} | ${formatInteger(result.medianOpsPerSecond)} | ${formatInteger(result.minOpsPerSecond)}–${formatInteger(result.maxOpsPerSecond)} | ${result.relativeStdDev.toFixed(1)}% | ${result.batchMedianMs.toFixed(2)} ms |`
    )
  }
  console.log('\nUse BENCH_ROUNDS=N to change rounds or --json for machine-readable output.')
}

async function verifyCorrectness(): Promise<void> {
  const [runtimeSimple, runtimeLoop, liquidOutput] = await Promise.all([
    runtime.render(simpleAst, simpleContext),
    runtime.render(loopAst, loopContext),
    liquidLoop(loopContext),
  ])
  const aotSimple = simpleAot(simpleContext)
  const aotLoop = loopAot(loopContext)
  if (runtimeSimple !== aotSimple || runtimeLoop !== aotLoop) {
    throw new Error('Runtime/AOT correctness check failed; benchmark aborted')
  }
  if ((await includeRuntime.render(includeLoopAst, loopContext)) !== runtimeLoop) {
    throw new Error('Cached-include correctness check failed; benchmark aborted')
  }

  const defaultTokens = new Lexer(lexerSource).tokenize()
  const customTokens = new Lexer(customDelimiterSource, {
    blockEnd: '%>',
    blockStart: '<%',
    variableEnd: ']]',
    variableStart: '[[',
  }).tokenize()
  if (
    defaultTokens.length !== customTokens.length ||
    !liquidOutput.startsWith('item-89') ||
    !liquidOutput.endsWith('item-10')
  ) {
    throw new Error('Lexer/Liquid correctness check failed; benchmark aborted')
  }

  const filtered = rejectattr(filterItems, 'enabled', 'eq', true) as typeof filterItems
  if (filtered.length !== 10_000 || filtered.some((item) => item.enabled)) {
    throw new Error('Filter correctness check failed; benchmark aborted')
  }
}

async function measure(benchmarkCase: BenchmarkCase): Promise<BenchmarkResult> {
  const warmupIterations = Math.min(1_000, Math.max(50, Math.floor(benchmarkCase.iterations / 10)))
  if (benchmarkCase.mode === 'sync') {
    for (let index = 0; index < warmupIterations; index++) consume(benchmarkCase.run())
  } else {
    for (let index = 0; index < warmupIterations; index++) consume(await benchmarkCase.run())
  }

  const samplesMs: number[] = []
  for (let round = 0; round < rounds; round++) {
    const start = performance.now()
    if (benchmarkCase.mode === 'sync') {
      for (let index = 0; index < benchmarkCase.iterations; index++) {
        consume(benchmarkCase.run())
      }
    } else {
      for (let index = 0; index < benchmarkCase.iterations; index++) {
        consume(await benchmarkCase.run())
      }
    }
    samplesMs.push(performance.now() - start)
  }

  const sortedMs = [...samplesMs].sort((left, right) => left - right)
  const batchMedianMs = median(sortedMs)
  const opsSamples = samplesMs.map(
    (milliseconds) => benchmarkCase.iterations / (milliseconds / 1_000)
  )
  const meanOps = mean(opsSamples)
  const deviation = Math.sqrt(mean(opsSamples.map((sample) => (sample - meanOps) ** 2)))

  return {
    batchMedianMs,
    iterations: benchmarkCase.iterations,
    maxOpsPerSecond: Math.max(...opsSamples),
    medianOpsPerSecond: benchmarkCase.iterations / (batchMedianMs / 1_000),
    minOpsPerSecond: Math.min(...opsSamples),
    mode: benchmarkCase.mode,
    name: benchmarkCase.name,
    relativeStdDev: meanOps === 0 ? 0 : (deviation / meanOps) * 100,
    samplesMs,
  }
}

function consume(value: unknown): void {
  if (typeof value === 'string') {
    checksum = (checksum + value.length + (value.charCodeAt(value.length - 1) || 0)) >>> 0
  } else if (Array.isArray(value)) {
    checksum = (checksum + value.length) >>> 0
  }
}

function median(sortedValues: number[]): number {
  const middle = Math.floor(sortedValues.length / 2)
  return sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle]
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}
