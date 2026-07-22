import { describe, expect, test } from 'bun:test'
import fc from 'fast-check'
import { compile, render } from '../../src'
import { json_script, length as mappingLength } from '../../src/filters'
import { Lexer, TokenType } from '../../src/lexer'
import { htmlSafeJson, safeGet, safeResolve } from '../../src/security'

const BLOCKED_KEYS = [
  '__proto__',
  'prototype',
  'constructor',
  'caller',
  'callee',
  'arguments',
] as const

const DEFAULT_RUNS = 400

describe('Core property invariants', () => {
  test('runtime and AOT autoescape match Bun for arbitrary Unicode strings', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 256 }), async (value) => {
        const expected = Bun.escapeHTML(value)

        expect(await render('{{ value }}', { value }), 'runtime autoescape').toBe(expected)
        expect(compile('{{ value }}')({ value }), 'AOT autoescape').toBe(expected)
        expect(await render('{{ value }}', { value }, { autoescape: false })).toBe(value)
        expect(compile('{{ value }}', { autoescape: false })({ value })).toBe(value)
      }),
      propertyParameters()
    )
  })

  test('HTML-safe JSON round-trips and cannot terminate its script element', () => {
    fc.assert(
      fc.property(fc.jsonValue(), fc.string({ maxLength: 64 }), (value, elementId) => {
        const expected = JSON.parse(JSON.stringify(value))
        const serialized = htmlSafeJson(value)

        expect(JSON.parse(serialized), 'JSON semantic round-trip').toEqual(expected)
        expect(serialized, 'literal HTML-significant characters').not.toMatch(/[<>&\u2028\u2029]/u)

        const script = String(json_script(value, elementId))
        expect(script.match(/<script\b/g)?.length).toBe(1)
        expect(script.match(/<\/script>/g)?.length).toBe(1)
        expect(script.toLowerCase().indexOf('</script')).toBe(script.length - 9)

        const openEnd = script.indexOf('>')
        const payload = script.slice(openEnd + 1, -'</script>'.length)
        expect(JSON.parse(payload), 'json_script semantic round-trip').toEqual(expected)

        if (elementId.length === 0) {
          expect(script).not.toContain(' id=')
        } else {
          expect(script).toContain(` id="${Bun.escapeHTML(elementId)}"`)
        }
      }),
      propertyParameters()
    )
  })

  test('plain-text lexing preserves every code unit and ends once', () => {
    const plainText = fc
      .string({ maxLength: 512 })
      .filter((value) => !value.includes('{{') && !value.includes('{%') && !value.includes('{#'))

    fc.assert(
      fc.property(plainText, (source) => {
        const tokens = new Lexer(source).tokenize()
        const body = tokens.filter((token) => token.type !== TokenType.EOF)

        expect(tokens.at(-1)?.type).toBe(TokenType.EOF)
        expect(tokens.filter((token) => token.type === TokenType.EOF)).toHaveLength(1)
        expect(body.every((token) => token.type === TokenType.TEXT)).toBe(true)
        expect(body.map((token) => token.value).join('')).toBe(source)
      }),
      propertyParameters()
    )
  })

  test('numeric dot paths equal bracket paths in runtime and AOT', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer(), { minLength: 1, maxLength: 64 }),
        fc.nat({ max: 10_000 }),
        async (values, candidate) => {
          const index = candidate % values.length
          const dotSource = `{{ values.${index} }}`
          const bracketSource = `{{ values[${index}] }}`
          const context = { values }
          const expected = String(values[index])

          expect(await render(dotSource, context)).toBe(expected)
          expect(await render(bracketSource, context)).toBe(expected)
          expect(compile(dotSource)(context)).toBe(expected)
          expect(compile(bracketSource)(context)).toBe(expected)
        }
      ),
      propertyParameters()
    )
  })

  test('protected lookup never exposes blocked or inherited properties', () => {
    const allowedKey = fc
      .string({ minLength: 1, maxLength: 40 })
      .filter((key) => !(BLOCKED_KEYS as readonly string[]).includes(key))

    fc.assert(
      fc.property(
        allowedKey,
        fc.jsonValue(),
        fc.constantFrom(...BLOCKED_KEYS),
        (key, value, blockedKey) => {
          const prototype = Object.create(null) as Record<string, unknown>
          prototype[key] = value
          prototype[blockedKey] = 'prototype-secret'

          const inherited = Object.create(prototype) as Record<string, unknown>
          expect(safeResolve(inherited, key)).toBeUndefined()

          Object.defineProperty(inherited, blockedKey, {
            configurable: true,
            enumerable: true,
            value: 'own-secret',
          })
          expect(safeResolve(inherited, blockedKey)).toBeUndefined()
          expect(safeGet(inherited, blockedKey)).toBeUndefined()

          const own = Object.create(null) as Record<string, unknown>
          own[key] = value
          expect(safeResolve(own, key)).toEqual(value)
          expect(safeGet(own, key)).toEqual(value)
        }
      ),
      propertyParameters()
    )
  })

  test('mapping length counts exactly the own enumerable keys', async () => {
    const propertyName = fc
      .string({ minLength: 1, maxLength: 40 })
      .filter((key) => key !== '__proto__')

    await fc.assert(
      fc.asyncProperty(
        propertyName,
        propertyName,
        fc.jsonValue(),
        fc.jsonValue(),
        async (ownKey, inheritedKey, ownValue, inheritedValue) => {
          fc.pre(ownKey !== inheritedKey)
          const prototype = Object.create(null) as Record<string, unknown>
          Object.defineProperty(prototype, inheritedKey, {
            enumerable: true,
            value: inheritedValue,
          })
          const value = Object.create(prototype) as Record<string, unknown>
          Object.defineProperty(value, ownKey, { enumerable: true, value: ownValue })

          expect(mappingLength(value), 'filter registry').toBe(1)
          expect(await render('{{ value|length }}', { value }), 'runtime fast path').toBe('1')
          expect(compile('{{ value|length }}')({ value }), 'AOT registry path').toBe('1')
        }
      ),
      propertyParameters()
    )
  })
})

function propertyParameters(): {
  endOnFailure: boolean
  numRuns: number
  seed: number | undefined
} {
  return {
    endOnFailure: true,
    numRuns: optionalInteger(Bun.env.BINJA_PROPERTY_RUNS) ?? DEFAULT_RUNS,
    seed: optionalInteger(Bun.env.BINJA_PROPERTY_SEED),
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
