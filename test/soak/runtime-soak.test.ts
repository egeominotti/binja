import { describe, expect, test } from 'bun:test'
import { Lexer } from '../../src/lexer'
import { Parser } from '../../src/parser'
import { Runtime } from '../../src/runtime'

describe('Runtime soak invariants', () => {
  test('isolates state across 10,000 interleaved renders', async () => {
    const template = parse('{% include "yield" %}{{ marker }}:{% cycle "A" "B" %}')
    const emptyTemplate = parse('')
    const runtime = new Runtime({
      templateLoader: async () => {
        await Bun.sleep(0)
        return emptyTemplate
      },
    })

    for (let batch = 0; batch < 40; batch++) {
      const markers = Array.from({ length: 250 }, (_, index) => batch * 250 + index)
      const results = await Promise.all(
        markers.map((marker) => runtime.render(template, { marker }))
      )
      expect(results).toEqual(markers.map((marker) => `${marker}:A`))
    }
  }, 30_000)

  test('recovers cleanly when successful and failing renders are interleaved', async () => {
    const successfulTemplate = parse('{% include "success" %}{{ marker }}:{% cycle "A" "B" %}')
    const failingTemplate = parse('{% include "failure" %}')
    const emptyTemplate = parse('')
    const runtime = new Runtime({
      templateLoader: async (name) => {
        await Bun.sleep(0)
        if (name === 'failure') throw new Error('expected soak failure')
        return emptyTemplate
      },
    })

    const attempts = Array.from({ length: 2_000 }, (_, index) =>
      index % 5 === 0
        ? runtime.render(failingTemplate, {})
        : runtime.render(successfulTemplate, { marker: index })
    )
    const results = await Promise.allSettled(attempts)

    for (const [index, result] of results.entries()) {
      if (index % 5 === 0) {
        expect(result.status).toBe('rejected')
      } else {
        expect(result).toEqual({ status: 'fulfilled', value: `${index}:A` })
      }
    }

    expect(await runtime.render(successfulTemplate, { marker: 'after' })).toBe('after:A')
  }, 30_000)
})

function parse(source: string) {
  return new Parser(new Lexer(source).tokenize(), source).parse()
}
