import { describe, expect, test } from 'bun:test'
import fc from 'fast-check'
import { Environment } from '../../src'
import { compileToFunction } from '../../src/compiler'
import * as liquid from '../../src/engines/liquid'
import { rejectattr, selectattr } from '../../src/filters'
import { Context, Runtime } from '../../src/runtime'

const attributeTest = fc.constantFrom('eq', 'ne', 'gt', 'lt', 'ge', 'le')

describe('Algorithm model invariants', () => {
  test('selectattr and rejectattr form the same partition as the predicate model', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.nat(), score: fc.integer() }), { maxLength: 100 }),
        attributeTest,
        fc.integer(),
        (items, operator, expectedValue) => {
          const selected = selectattr(items, 'score', operator, expectedValue) as typeof items
          const rejected = rejectattr(items, 'score', operator, expectedValue) as typeof items
          const expectedSelected = items.filter((item) =>
            compare(item.score, operator, expectedValue)
          )
          const expectedRejected = items.filter(
            (item) => !compare(item.score, operator, expectedValue)
          )

          expect(selected).toEqual(expectedSelected)
          expect(rejected).toEqual(expectedRejected)
          expect(selected.length + rejected.length).toBe(items.length)
        }
      ),
      { numRuns: 400 }
    )
  })

  test('Liquid loop modifiers match the slice/reverse model in runtime and AOT', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: -1_000, max: 1_000 }), { maxLength: 60 }),
        fc.nat({ max: 80 }),
        fc.nat({ max: 80 }),
        fc.boolean(),
        async (items, offset, limit, reversed) => {
          const reverseTag = reversed ? ' reversed' : ''
          const source =
            `{% for item in items offset: ${offset} limit: ${limit}${reverseTag} %}` +
            '{{ item }},{% else %}empty{% endfor %}'
          const ast = liquid.parse(source)
          const selected = items.slice(offset, offset + limit)
          if (reversed) selected.reverse()
          const expected =
            selected.length === 0 ? 'empty' : selected.map((item) => `${item},`).join('')

          expect(await new Runtime().render(ast, { items }), 'runtime output').toBe(expected)
          expect(compileToFunction(ast)({ items }), 'AOT output').toBe(expected)
        }
      ),
      { numRuns: 250 }
    )
  })

  test('Context lookup caching follows the nearest-scope state model', () => {
    const name = fc.constantFrom('alpha', 'beta', 'gamma', 'delta')
    const value = fc.oneof(fc.integer(), fc.string({ maxLength: 20 }), fc.constant(null))
    const operation = fc.oneof(
      fc.record({ type: fc.constant('push' as const), name, value }),
      fc.record({ type: fc.constant('set' as const), name, value }),
      fc.record({ type: fc.constant('pop' as const) })
    )

    fc.assert(
      fc.property(fc.array(operation, { maxLength: 100 }), (operations) => {
        const context = new Context()
        const scopes: Array<Record<string, unknown>> = [{}]
        const names = ['alpha', 'beta', 'gamma', 'delta']

        for (const command of operations) {
          if (command.type === 'push') {
            const data = { [command.name]: command.value }
            context.push(data)
            scopes.push(data)
          } else if (command.type === 'set') {
            context.set(command.name, command.value)
            scopes[scopes.length - 1][command.name] = command.value
          } else if (scopes.length > 1) {
            context.pop()
            scopes.pop()
          }

          for (const key of names) {
            const expected = lookup(scopes, key)
            expect(context.has(key)).toBe(expected.found)
            expect(context.get(key)).toEqual(expected.value)
            // Resolve twice to exercise the cached path.
            expect(context.get(key)).toEqual(expected.value)
          }
        }
      }),
      { numRuns: 300 }
    )
  })

  test('Liquid raw scanning preserves arbitrary content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 500 }).filter((value) => !/\{%\s*endraw\s*%\}/.test(value)),
        async (value) => {
          expect(await liquid.render(`{% raw %}${value}{% endraw %}`)).toBe(value)
        }
      ),
      { numRuns: 300 }
    )
  })

  test('ifchanged uses structural, order-independent and cycle-safe equality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          count: fc.integer(),
          values: fc.array(fc.integer(), { maxLength: 20 }),
        }),
        async (value) => {
          const reordered = { values: [...value.values], count: value.count }
          const source =
            '{% for item in items %}{% ifchanged item %}changed{% endifchanged %}{% endfor %}'
          const ast = new Environment().compile(source)
          expect(await new Runtime().render(ast, { items: [value, reordered] })).toBe('changed')
        }
      ),
      { numRuns: 200 }
    )

    const first: Record<string, unknown> = { value: 1 }
    const second: Record<string, unknown> = { value: 1 }
    first.self = first
    second.self = second
    const source =
      '{% for item in items %}{% ifchanged item %}changed{% endifchanged %}{% endfor %}'
    const ast = new Environment().compile(source)
    expect(await new Runtime().render(ast, { items: [first, second] })).toBe('changed')
    expect(await new Runtime().render(ast, { items: [undefined, undefined] })).toBe('changed')
  })
})

function compare(left: number, operator: string, right: number): boolean {
  if (operator === 'eq') return left === right
  if (operator === 'ne') return left !== right
  if (operator === 'gt') return left > right
  if (operator === 'lt') return left < right
  if (operator === 'ge') return left >= right
  return left <= right
}

function lookup(
  scopes: Array<Record<string, unknown>>,
  name: string
): { found: boolean; value: unknown } {
  for (let i = scopes.length - 1; i >= 0; i--) {
    if (name in scopes[i]) return { found: true, value: scopes[i][name] }
  }
  return { found: false, value: undefined }
}
