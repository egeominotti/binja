import { describe, expect, test } from 'bun:test'
import fc from 'fast-check'
import { compile, render } from '../../src'

const safeText = fc
  .array(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;_-'),
    {
      maxLength: 30,
    }
  )
  .map((characters) => characters.join(''))

describe('Rendering model invariants', () => {
  test('runtime and AOT loops match a small reference renderer', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeText,
        safeText,
        fc.array(fc.integer({ min: -10_000, max: 10_000 }), { maxLength: 30 }),
        async (prefix, suffix, items) => {
          const source =
            '{{ prefix }}{% for item in items %}[{{ forloop.counter }}={{ item }}]' +
            '{% empty %}[empty]{% endfor %}{{ suffix }}'
          const context = { items, prefix, suffix }
          const body =
            items.length === 0
              ? '[empty]'
              : items.map((item, index) => `[${index + 1}=${item}]`).join('')
          const expected = `${prefix}${body}${suffix}`

          expect(await render(source, context), 'runtime output').toBe(expected)
          expect(compile(source)(context), 'AOT output').toBe(expected)
        }
      ),
      { numRuns: 200 }
    )
  })

  test('autoescape follows the HTML escaping reference model', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 100 }), async (value) => {
        expect(await render('{{ value }}', { value })).toBe(escapeHtml(value))
      }),
      { numRuns: 300 }
    )
  })

  test('trim markers remove only adjacent whitespace', async () => {
    const whitespace = fc
      .array(fc.constantFrom(' ', '\t', '\n', '\r'), { maxLength: 10 })
      .map((characters) => characters.join(''))

    await fc.assert(
      fc.asyncProperty(
        safeText,
        whitespace,
        safeText,
        whitespace,
        safeText,
        async (left, leftWhitespace, value, rightWhitespace, right) => {
          const source = `${left}${leftWhitespace}{{- value -}}${rightWhitespace}${right}`
          const expected = `${left.replace(/\s+$/, '')}${value}${right.replace(/^\s+/, '')}`
          expect(await render(source, { value })).toBe(expected)
        }
      ),
      { numRuns: 200 }
    )
  })
})

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;')
}
