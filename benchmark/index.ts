import { compile, Environment, Runtime } from '../src'
import * as liquid from '../src/engines/liquid'
import { rejectattr } from '../src/filters'

interface BenchmarkCase {
  iterations: number
  name: string
  run: () => unknown | Promise<unknown>
}

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
const simpleAot = compile(simpleSource, { autoescape: false })
const loopAot = compile(loopSource, { autoescape: false })
const liquidLoop = liquid.compile(
  '{% for item in items offset: 10 limit: 80 reversed %}{{ item.name }}{% endfor %}'
)
const filterItems = Array.from({ length: 20_000 }, (_, index) => ({
  enabled: index % 2 === 0,
  index,
}))

const cases: BenchmarkCase[] = [
  {
    name: 'Runtime / simple cached AST',
    iterations: 20_000,
    run: () => runtime.render(simpleAst, simpleContext),
  },
  {
    name: 'Runtime / loop (100 items)',
    iterations: 2_000,
    run: () => runtime.render(loopAst, loopContext),
  },
  {
    name: 'AOT / simple',
    iterations: 200_000,
    run: () => simpleAot(simpleContext),
  },
  {
    name: 'AOT / loop (100 items)',
    iterations: 10_000,
    run: () => loopAot(loopContext),
  },
  {
    name: 'Liquid / modifiers (100 items)',
    iterations: 2_000,
    run: () => liquidLoop(loopContext),
  },
  {
    name: 'Filter / rejectattr (20K items)',
    iterations: 1_000,
    run: () => rejectattr(filterItems, 'enabled', 'eq', true),
  },
]

let checksum = 0

console.log(`binja benchmark — Bun ${Bun.version} — ${process.platform}/${process.arch}`)
console.log('Each result is the median of 5 warmed-up rounds.\n')
console.log('| Case | ops/s | batch median ms |')
console.log('|---|---:|---:|')

for (const benchmarkCase of cases) {
  const milliseconds = await measure(benchmarkCase)
  const operationsPerSecond = benchmarkCase.iterations / (milliseconds / 1_000)
  console.log(
    `| ${benchmarkCase.name} | ${Math.round(operationsPerSecond).toLocaleString('en-US')} | ${milliseconds.toFixed(2)} |`
  )
}

// Make the consumption of benchmark outputs observable.
if (checksum === Number.MIN_SAFE_INTEGER) console.log(checksum)

async function measure(benchmarkCase: BenchmarkCase): Promise<number> {
  const warmupIterations = Math.min(500, benchmarkCase.iterations)
  for (let i = 0; i < warmupIterations; i++) {
    consume(await benchmarkCase.run())
  }

  const samples: number[] = []
  for (let round = 0; round < 5; round++) {
    const start = performance.now()
    for (let i = 0; i < benchmarkCase.iterations; i++) {
      consume(await benchmarkCase.run())
    }
    samples.push(performance.now() - start)
  }
  samples.sort((left, right) => left - right)
  return samples[Math.floor(samples.length / 2)]
}

function consume(value: unknown): void {
  if (typeof value === 'string') {
    checksum ^= value.length
    if (value.length > 0) checksum ^= value.charCodeAt(value.length - 1)
    return
  }
  if (Array.isArray(value)) checksum ^= value.length
}
