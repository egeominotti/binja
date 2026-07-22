import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import fc from 'fast-check'
import { Environment } from '../../src'
import { compileToFunction } from '../../src/compiler'
import { Lexer } from '../../src/lexer'
import { Parser, type TemplateNode } from '../../src/parser'
import { Runtime } from '../../src/runtime'
import { hostileTemplateArbitrary, hostileTemplateNameArbitrary } from './corpus'

const DEFAULT_RUNS = 400

describe('Template input fuzzing', () => {
  test('corpus-seeded mutations produce output or a controlled Error', async () => {
    await fc.assert(
      fc.asyncProperty(hostileTemplateArbitrary, async (source) => {
        const ast = parseOrControlledError(source)
        if (ast === null) return

        await expectStringOrControlledError(() => new Runtime().render(ast, boundedContext()))
        expectStringOrControlledErrorSync(() => compileToFunction(ast)(boundedContext()))
      }),
      fuzzParameters()
    )
  }, 60_000)

  describe('loader containment', () => {
    let temporaryDirectory = ''
    let templatesDirectory = ''
    let environment: Environment

    beforeAll(() => {
      temporaryDirectory = mkdtempSync(join(tmpdir(), `binja-fuzz-${process.pid}-`))
      templatesDirectory = join(temporaryDirectory, 'templates')
      mkdirSync(templatesDirectory)
      writeFileSync(join(templatesDirectory, 'inside.html'), 'INSIDE')
      writeFileSync(join(temporaryDirectory, 'outside.html'), 'OUTSIDE-SECRET')
      environment = new Environment({
        cache: false,
        extensions: [''],
        templates: templatesDirectory,
      })
    })

    afterAll(() => {
      rmSync(temporaryDirectory, { force: true, recursive: true })
    })

    test('arbitrary names never read beyond the configured template root', async () => {
      await fc.assert(
        fc.asyncProperty(hostileTemplateNameArbitrary, async (name) => {
          let output: string
          try {
            output = await environment.render(name)
          } catch (error) {
            expect(error).toBeInstanceOf(Error)
            return
          }

          expect(output).toBe('INSIDE')
          expect(output).not.toContain('OUTSIDE-SECRET')
        }),
        fuzzParameters(2)
      )
    }, 60_000)
  })
})

function parseOrControlledError(source: string): TemplateNode | null {
  try {
    const tokens = new Lexer(source).tokenize()
    return new Parser(tokens, source).parse()
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    return null
  }
}

async function expectStringOrControlledError(action: () => Promise<string>): Promise<void> {
  let output: string
  try {
    output = await action()
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    return
  }

  expect(typeof output).toBe('string')
  expect(output).not.toContain('[object Promise]')
}

function expectStringOrControlledErrorSync(action: () => string): void {
  let output: string
  try {
    output = action()
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    return
  }

  expect(typeof output).toBe('string')
  expect(output).not.toContain('[object Promise]')
}

function boundedContext(): Record<string, unknown> {
  return {
    base: { safe: true },
    items: [-1, 0, 1],
    value: '</script><script>alert(1)</script>',
  }
}

function fuzzParameters(runDivisor = 1): {
  endOnFailure: boolean
  interruptAfterTimeLimit: number
  numRuns: number
  seed: number | undefined
} {
  const configuredRuns = optionalInteger(Bun.env.BINJA_FUZZ_RUNS) ?? DEFAULT_RUNS
  return {
    endOnFailure: true,
    interruptAfterTimeLimit: 55_000,
    numRuns: Math.max(1, Math.ceil(configuredRuns / runDivisor)),
    seed: optionalInteger(Bun.env.BINJA_FUZZ_SEED),
  }
}

function optionalInteger(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`expected a signed safe integer, received ${value}`)
  }
  return parsed
}
