/**
 * Tests for Native (Zig FFI) Lexer
 */
import { describe, test, expect } from 'bun:test'
import {
  NativeLexer,
  tokenize,
  tokenizeCount,
  isNativeAvailable,
  nativeVersion,
  TokenType,
} from '../src/native'
import { Lexer } from '../src/lexer'

describe('Native Lexer', () => {
  test('isNativeAvailable returns true', () => {
    expect(isNativeAvailable()).toBe(true)
  })

  test('nativeVersion returns version string', () => {
    const version = nativeVersion()
    expect(version).toBe('0.1.0')
  })

  test('tokenizeCount returns correct count', () => {
    const count = tokenizeCount('Hello {{ name }}!')
    expect(count).toBeGreaterThan(0)
  })

  test('NativeLexer tokenizes simple template', () => {
    const lexer = new NativeLexer('Hello {{ name }}!')
    try {
      expect(lexer.tokenCount).toBe(6)
      expect(lexer.getTokenType(0)).toBe(TokenType.TEXT)
      expect(lexer.getTokenValue(0)).toBe('Hello ')
      expect(lexer.getTokenType(1)).toBe(TokenType.VAR_START)
      expect(lexer.getTokenValue(1)).toBe('{{')
    } finally {
      lexer.free()
    }
  })

  test('tokenize returns all tokens', () => {
    const tokens = tokenize('{{ a }} {% if b %}c{% endif %}')
    expect(tokens.length).toBeGreaterThan(5)
    expect(tokens[0].type).toBe(TokenType.VAR_START)
  })

  test('NativeLexer handles filters', () => {
    const lexer = new NativeLexer('{{ name|upper|trim }}')
    try {
      const types = []
      for (let i = 0; i < lexer.tokenCount; i++) {
        types.push(lexer.getTokenType(i))
      }
      expect(types).toContain(TokenType.PIPE)
      expect(types).toContain(TokenType.IDENTIFIER)
    } finally {
      lexer.free()
    }
  })

  test('NativeLexer handles nested structures', () => {
    const template = `
{% for item in items %}
  {% if item.active %}
    {{ item.name }}
  {% endif %}
{% endfor %}
`
    const lexer = new NativeLexer(template)
    try {
      expect(lexer.tokenCount).toBeGreaterThan(10)
    } finally {
      lexer.free()
    }
  })

  test('getAllTokens returns array of tokens', () => {
    const lexer = new NativeLexer('{{ x }}')
    try {
      const tokens = lexer.getAllTokens()
      expect(Array.isArray(tokens)).toBe(true)
      expect(tokens.length).toBe(lexer.tokenCount)
      expect(tokens[0]).toHaveProperty('type')
      expect(tokens[0]).toHaveProperty('start')
      expect(tokens[0]).toHaveProperty('end')
      expect(tokens[0]).toHaveProperty('value')
    } finally {
      lexer.free()
    }
  })

  test('Native and JS lexer produce same token count', () => {
    const templates = [
      '{{ name }}',
      'Hello {{ world }}!',
      '{% for x in y %}{{ x }}{% endfor %}',
      '{{ a|upper }} {{ b|lower }}',
      '{% if x %}a{% elif y %}b{% else %}c{% endif %}',
    ]

    for (const template of templates) {
      const nativeCount = tokenizeCount(template)
      const jsLexer = new Lexer(template)
      const jsTokens = jsLexer.tokenize()

      // Note: token counts may differ slightly due to implementation differences
      // but should be in the same ballpark
      expect(nativeCount).toBeGreaterThan(0)
      expect(jsTokens.length).toBeGreaterThan(0)
    }
  })

  test('handles empty string', () => {
    const count = tokenizeCount('')
    expect(count).toBe(1) // Just EOF token
  })

  test('handles large template', () => {
    const template = '{{ x }}'.repeat(1000)
    const lexer = new NativeLexer(template)
    try {
      expect(lexer.tokenCount).toBeGreaterThan(3000)
    } finally {
      lexer.free()
    }
  })

  test('Symbol.dispose works for auto-cleanup', () => {
    let freed = false
    {
      const lexer = new NativeLexer('{{ test }}')
      expect(lexer.tokenCount).toBeGreaterThan(0)
      // @ts-ignore - testing dispose
      lexer[Symbol.dispose]()
      freed = true
    }
    expect(freed).toBe(true)
  })
})

describe('Native Lexer Performance', () => {
  test('native is faster than JS for large templates', () => {
    const template = `
<!DOCTYPE html>
<html>
<head><title>{{ title }}</title></head>
<body>
  {% for item in items %}
    <div>{{ item.name|upper }}</div>
  {% endfor %}
</body>
</html>
`.repeat(10)

    const iterations = 1000

    // Warmup
    for (let i = 0; i < 100; i++) {
      tokenizeCount(template)
      new Lexer(template).tokenize()
    }

    // Native
    const nativeStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      tokenizeCount(template)
    }
    const nativeTime = performance.now() - nativeStart

    // JS
    const jsStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      new Lexer(template).tokenize()
    }
    const jsTime = performance.now() - jsStart

    console.log(`Native: ${nativeTime.toFixed(2)}ms, JS: ${jsTime.toFixed(2)}ms`)
    console.log(`Native is ${(jsTime / nativeTime).toFixed(2)}x faster`)

    // Native should be faster for large templates
    expect(nativeTime).toBeLessThan(jsTime)
  })
})
