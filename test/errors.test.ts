/**
 * Tests for rich error formatting
 */
import { describe, test, expect } from 'bun:test'
import { render, compile, TemplateSyntaxError, TemplateRuntimeError } from '../src'
import { findSimilar } from '../src/errors'

describe('Error Messages', () => {
  describe('TemplateSyntaxError', () => {
    test('unclosed variable tag', async () => {
      try {
        await render('Hello {{ name', {})
        expect(true).toBe(false) // Should not reach here
      } catch (e: any) {
        expect(e).toBeInstanceOf(TemplateSyntaxError)
        expect(e.message).toContain('Unclosed template tag')
        expect(e.line).toBe(1)
      }
    })

    test('unclosed string literal', async () => {
      try {
        await render('{{ "hello }}', {})
        expect(true).toBe(false)
      } catch (e: any) {
        expect(e).toBeInstanceOf(TemplateSyntaxError)
        expect(e.message).toContain('Unterminated string')
        expect(e.message).toContain("'\"'") // Suggests closing quote
      }
    })

    test('unclosed raw block', async () => {
      try {
        await render('{% raw %}hello', {})
        expect(true).toBe(false)
      } catch (e: any) {
        expect(e).toBeInstanceOf(TemplateSyntaxError)
        expect(e.message).toContain("Unclosed 'raw' block")
        expect(e.message).toContain('endraw') // Suggests how to close
      }
    })

    test('unexpected character', async () => {
      try {
        await render('{{ !invalid }}', {})
        expect(true).toBe(false)
      } catch (e: any) {
        expect(e).toBeInstanceOf(TemplateSyntaxError)
        expect(e.message).toContain("Unexpected character '!'")
        expect(e.message).toContain('!=') // Suggests correct usage
      }
    })

    test('shows source snippet with caret', async () => {
      try {
        await render('line1\nline2\n{{ "unclosed\nline4', {})
        expect(true).toBe(false)
      } catch (e: any) {
        expect(e.message).toContain('\u2192') // Arrow indicator
        expect(e.message).toContain('^') // Caret
      }
    })
  })

  describe('TemplateRuntimeError', () => {
    test('unknown filter with suggestion', async () => {
      try {
        await render('{{ name|tite }}', { name: 'test' })
        expect(true).toBe(false)
      } catch (e: any) {
        expect(e).toBeInstanceOf(TemplateRuntimeError)
        expect(e.message).toContain("Unknown filter 'tite'")
        expect(e.message).toContain('title') // "Did you mean?"
      }
    })

    test('unknown filter shows available options', async () => {
      try {
        await render('{{ name|xyz123 }}', { name: 'test' })
        expect(true).toBe(false)
      } catch (e: any) {
        expect(e).toBeInstanceOf(TemplateRuntimeError)
        expect(e.message).toContain('Available')
      }
    })
  })

  describe('findSimilar', () => {
    test('finds exact typos', () => {
      const filters = ['title', 'upper', 'lower', 'trim', 'escape']
      expect(findSimilar('tite', filters)).toBe('title')
      expect(findSimilar('uper', filters)).toBe('upper')
      expect(findSimilar('lowwer', filters)).toBe('lower')
    })

    test('returns null for very different strings', () => {
      const filters = ['title', 'upper', 'lower']
      expect(findSimilar('xyz123abc', filters)).toBe(null)
    })

    test('case insensitive matching', () => {
      const filters = ['title', 'upper', 'lower']
      expect(findSimilar('TITLE', filters)).toBe('title')
      expect(findSimilar('UPER', filters)).toBe('upper')
    })
  })

  describe('Error location tracking', () => {
    test('tracks line number for multiline templates', async () => {
      try {
        await render('line 1\nline 2\nline 3 {{ "unclosed\nline 5', {})
        expect(true).toBe(false)
      } catch (e: any) {
        // Line 4 because the unclosed string spans to line 4
        expect(e.line).toBe(4)
      }
    })

    test('tracks column number', async () => {
      try {
        await render('{{ "unclosed }}', {})
        expect(true).toBe(false)
      } catch (e: any) {
        expect(e.column).toBeGreaterThan(0)
      }
    })
  })

  describe('AOT Compilation Errors', () => {
    test('unknown filter in compiled template', () => {
      try {
        const fn = compile('{{ name|unknownfilter }}')
        fn({ name: 'test' })
        expect(true).toBe(false)
      } catch (e: any) {
        expect(e.message).toContain('Unknown filter')
      }
    })
  })
})
