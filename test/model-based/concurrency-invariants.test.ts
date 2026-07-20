import { describe, expect, test } from 'bun:test'
import fc from 'fast-check'
import { Lexer } from '../../src/lexer'
import { Parser } from '../../src/parser'
import { Runtime } from '../../src/runtime'

describe('Concurrent rendering invariants', () => {
  test('every concurrent history owns independent cycle and include state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: -1_000_000, max: 1_000_000 }), {
          minLength: 2,
          maxLength: 10,
        }),
        fc.integer({ min: 0, max: 5 }),
        async (markers, delay) => {
          const template = parse('{% include "slow" %}{{ marker }}:{% cycle "A" "B" %}')
          const emptyTemplate = parse('')
          const runtime = new Runtime({
            templateLoader: async () => {
              await Bun.sleep(delay)
              return emptyTemplate
            },
          })

          const results = await Promise.all(
            markers.map((marker) => runtime.render(template, { marker }))
          )

          expect(results).toEqual(markers.map((marker) => `${marker}:A`))
        }
      ),
      {
        interruptAfterTimeLimit: 20_000,
        numRuns: 150,
        verbose: 2,
      }
    )
  }, 25_000)
})

function parse(source: string) {
  const tokens = new Lexer(source).tokenize()
  return new Parser(tokens, source).parse()
}
