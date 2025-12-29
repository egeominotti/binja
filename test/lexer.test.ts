/**
 * Lexer Tests - Replicated from Jinja2 test_lexnparse.py
 * https://github.com/pallets/jinja/blob/main/tests/test_lexnparse.py
 */
import { describe, test, expect } from 'bun:test'
import { Lexer, TokenType } from '../src/lexer'

describe('Lexer', () => {
  // ==================== TestTokenStream ====================
  describe('TokenStream', () => {
    test('test_simple - basic token stream navigation', () => {
      const lexer = new Lexer('{{ foo }}')
      const tokens = lexer.tokenize()

      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF)
    })

    test('test_iter - token iteration', () => {
      const lexer = new Lexer('{{ foo }}{% if bar %}{% endif %}')
      const tokens = lexer.tokenize()

      const types = tokens.map(t => t.type)
      expect(types).toContain(TokenType.VARIABLE_START)
      expect(types).toContain(TokenType.BLOCK_START)
      expect(types).toContain(TokenType.NAME)
    })
  })

  // ==================== TestLexer ====================
  describe('Lexer Basic', () => {
    test('test_raw1 - raw block basic', () => {
      // Note: raw blocks are handled by parser, lexer just tokenizes
      const lexer = new Lexer('{% raw %}foo{% endraw %}')
      const tokens = lexer.tokenize()
      expect(tokens.length).toBeGreaterThan(0)
    })

    test('test_string_escapes - escape sequences in strings', () => {
      const lexer = new Lexer('{{ "foo\\"bar" }}')
      const tokens = lexer.tokenize()

      const stringToken = tokens.find(t => t.type === TokenType.STRING)
      expect(stringToken).toBeDefined()
      expect(stringToken?.value).toContain('\\')
    })

    test('test_operators - operator recognition', () => {
      const operators = [
        ['{{ 1 + 2 }}', TokenType.ADD],
        ['{{ 1 - 2 }}', TokenType.SUB],
        ['{{ 1 * 2 }}', TokenType.MUL],
        ['{{ 1 / 2 }}', TokenType.DIV],
        ['{{ 1 % 2 }}', TokenType.MOD],
        ['{{ 1 == 2 }}', TokenType.EQ],
        ['{{ 1 != 2 }}', TokenType.NE],
        ['{{ 1 < 2 }}', TokenType.LT],
        ['{{ 1 > 2 }}', TokenType.GT],
        ['{{ 1 <= 2 }}', TokenType.LE],
        ['{{ 1 >= 2 }}', TokenType.GE],
      ]

      for (const [template, expectedOp] of operators) {
        const lexer = new Lexer(template as string)
        const tokens = lexer.tokenize()
        const opToken = tokens.find(t => t.type === expectedOp)
        expect(opToken).toBeDefined()
      }
    })

    test('test_normalizing - newline normalization', () => {
      const lexer = new Lexer('line1\r\nline2\rline3\nline4')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe(TokenType.TEXT)
    })

    test('test_trailing_newline - preserve trailing newlines', () => {
      const lexer = new Lexer('hello\n')
      const tokens = lexer.tokenize()
      expect(tokens[0].value).toBe('hello\n')
    })

    test('test_name - valid identifiers', () => {
      const validNames = ['foo', '_foo', 'foo_bar', 'fooBar', 'foo123', '_123']

      for (const name of validNames) {
        const lexer = new Lexer(`{{ ${name} }}`)
        const tokens = lexer.tokenize()
        const nameToken = tokens.find(t => t.type === TokenType.NAME)
        expect(nameToken?.value).toBe(name)
      }
    })
  })

  // ==================== String Literals ====================
  describe('String Literals', () => {
    test('tokenizes double-quoted strings', () => {
      const lexer = new Lexer('{{ "hello world" }}')
      const tokens = lexer.tokenize()
      const stringToken = tokens.find(t => t.type === TokenType.STRING)
      expect(stringToken?.value).toBe('hello world')
    })

    test('tokenizes single-quoted strings', () => {
      const lexer = new Lexer("{{ 'hello world' }}")
      const tokens = lexer.tokenize()
      const stringToken = tokens.find(t => t.type === TokenType.STRING)
      expect(stringToken?.value).toBe('hello world')
    })

    test('tokenizes empty strings', () => {
      const lexer = new Lexer('{{ "" }}')
      const tokens = lexer.tokenize()
      const stringToken = tokens.find(t => t.type === TokenType.STRING)
      expect(stringToken?.value).toBe('')
    })

    test('tokenizes strings with spaces', () => {
      const lexer = new Lexer('{{ "  spaces  " }}')
      const tokens = lexer.tokenize()
      const stringToken = tokens.find(t => t.type === TokenType.STRING)
      expect(stringToken?.value).toBe('  spaces  ')
    })

    test('tokenizes strings with special characters', () => {
      const lexer = new Lexer('{{ "hello\\nworld" }}')
      const tokens = lexer.tokenize()
      const stringToken = tokens.find(t => t.type === TokenType.STRING)
      expect(stringToken).toBeDefined()
    })
  })

  // ==================== Numbers ====================
  describe('Numbers', () => {
    test('tokenizes integers', () => {
      const lexer = new Lexer('{{ 42 }}')
      const tokens = lexer.tokenize()
      const numToken = tokens.find(t => t.type === TokenType.NUMBER)
      expect(numToken?.value).toBe('42')
    })

    test('tokenizes floats', () => {
      const lexer = new Lexer('{{ 3.14159 }}')
      const tokens = lexer.tokenize()
      const numToken = tokens.find(t => t.type === TokenType.NUMBER)
      expect(numToken?.value).toBe('3.14159')
    })

    test('tokenizes zero', () => {
      const lexer = new Lexer('{{ 0 }}')
      const tokens = lexer.tokenize()
      const numToken = tokens.find(t => t.type === TokenType.NUMBER)
      expect(numToken?.value).toBe('0')
    })

    test('tokenizes large numbers', () => {
      const lexer = new Lexer('{{ 1234567890 }}')
      const tokens = lexer.tokenize()
      const numToken = tokens.find(t => t.type === TokenType.NUMBER)
      expect(numToken?.value).toBe('1234567890')
    })

    test('tokenizes float starting with zero', () => {
      const lexer = new Lexer('{{ 0.5 }}')
      const tokens = lexer.tokenize()
      const numToken = tokens.find(t => t.type === TokenType.NUMBER)
      expect(numToken?.value).toBe('0.5')
    })
  })

  // ==================== Operators ====================
  describe('Operators', () => {
    test('tokenizes all comparison operators', () => {
      const ops: [string, TokenType][] = [
        ['==', TokenType.EQ],
        ['!=', TokenType.NE],
        ['<', TokenType.LT],
        ['>', TokenType.GT],
        ['<=', TokenType.LE],
        ['>=', TokenType.GE],
      ]

      for (const [op, type] of ops) {
        const lexer = new Lexer(`{{ a ${op} b }}`)
        const tokens = lexer.tokenize()
        expect(tokens.some(t => t.type === type)).toBe(true)
      }
    })

    test('tokenizes all arithmetic operators', () => {
      const ops: [string, TokenType][] = [
        ['+', TokenType.ADD],
        ['-', TokenType.SUB],
        ['*', TokenType.MUL],
        ['/', TokenType.DIV],
        ['%', TokenType.MOD],
      ]

      for (const [op, type] of ops) {
        const lexer = new Lexer(`{{ a ${op} b }}`)
        const tokens = lexer.tokenize()
        expect(tokens.some(t => t.type === type)).toBe(true)
      }
    })

    test('tokenizes pipe operator', () => {
      const lexer = new Lexer('{{ name|upper }}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.PIPE)).toBe(true)
    })

    test('tokenizes dot operator', () => {
      const lexer = new Lexer('{{ obj.attr }}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.DOT)).toBe(true)
    })

    test('tokenizes comma operator', () => {
      const lexer = new Lexer('{{ func(a, b, c) }}')
      const tokens = lexer.tokenize()
      expect(tokens.filter(t => t.type === TokenType.COMMA).length).toBe(2)
    })

    test('tokenizes colon operator', () => {
      const lexer = new Lexer('{{ {"key": "value"} }}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.COLON)).toBe(true)
    })

    test('tokenizes assignment operator', () => {
      const lexer = new Lexer('{% set x = 1 %}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.ASSIGN)).toBe(true)
    })

    test('tokenizes tilde operator for string concat', () => {
      const lexer = new Lexer('{{ a ~ b }}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.TILDE)).toBe(true)
    })
  })

  // ==================== Keywords ====================
  describe('Keywords', () => {
    test('tokenizes and as keyword', () => {
      const lexer = new Lexer('{% if a and b %}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.AND)).toBe(true)
    })

    test('tokenizes or as keyword', () => {
      const lexer = new Lexer('{% if a or b %}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.OR)).toBe(true)
    })

    test('tokenizes not as keyword', () => {
      const lexer = new Lexer('{% if not a %}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.NOT)).toBe(true)
    })

    test('tokenizes true/false/none as names', () => {
      const keywords = ['true', 'false', 'True', 'False', 'none', 'None']

      for (const kw of keywords) {
        const lexer = new Lexer(`{{ ${kw} }}`)
        const tokens = lexer.tokenize()
        const nameToken = tokens.find(t => t.type === TokenType.NAME && t.value === kw)
        expect(nameToken).toBeDefined()
      }
    })
  })

  // ==================== Brackets ====================
  describe('Brackets', () => {
    test('tokenizes parentheses', () => {
      const lexer = new Lexer('{{ (a + b) }}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.LPAREN)).toBe(true)
      expect(tokens.some(t => t.type === TokenType.RPAREN)).toBe(true)
    })

    test('tokenizes square brackets', () => {
      const lexer = new Lexer('{{ list[0] }}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.LBRACKET)).toBe(true)
      expect(tokens.some(t => t.type === TokenType.RBRACKET)).toBe(true)
    })

    test('tokenizes curly braces in dict', () => {
      const lexer = new Lexer('{{ {"a": 1} }}')
      const tokens = lexer.tokenize()
      expect(tokens.some(t => t.type === TokenType.LBRACE)).toBe(true)
      expect(tokens.some(t => t.type === TokenType.RBRACE)).toBe(true)
    })

    test('tokenizes nested brackets', () => {
      const lexer = new Lexer('{{ func((a + b), [1, 2]) }}')
      const tokens = lexer.tokenize()
      expect(tokens.filter(t => t.type === TokenType.LPAREN).length).toBe(2)
      expect(tokens.filter(t => t.type === TokenType.RPAREN).length).toBe(2)
    })
  })

  // ==================== Comments ====================
  describe('Comments', () => {
    test('skips single line comments', () => {
      const lexer = new Lexer('{# comment #}Hello')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe(TokenType.TEXT)
      expect(tokens[0].value).toBe('Hello')
    })

    test('skips multiline comments', () => {
      const lexer = new Lexer('{# line1\nline2\nline3 #}Hello')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe(TokenType.TEXT)
      expect(tokens[0].value).toBe('Hello')
    })

    test('handles empty comments', () => {
      const lexer = new Lexer('{##}Hello')
      const tokens = lexer.tokenize()
      expect(tokens[0].value).toBe('Hello')
    })

    test('handles comment with template syntax inside', () => {
      const lexer = new Lexer('{# {{ foo }} {% if bar %} #}Hello')
      const tokens = lexer.tokenize()
      expect(tokens[0].value).toBe('Hello')
    })
  })

  // ==================== Line Tracking ====================
  describe('Line Tracking', () => {
    test('tracks line numbers correctly', () => {
      const lexer = new Lexer('line1\n{{ var }}\nline3')
      const tokens = lexer.tokenize()

      expect(tokens[0].line).toBe(1)
      expect(tokens[1].line).toBe(2) // {{
    })

    test('tracks column numbers', () => {
      const lexer = new Lexer('{{ foo }}')
      const tokens = lexer.tokenize()
      expect(tokens[0].column).toBe(1)
    })

    test('handles multiple newlines', () => {
      const lexer = new Lexer('a\n\n\nb')
      const tokens = lexer.tokenize()
      expect(tokens[0].value).toBe('a\n\n\nb')
    })
  })

  // ==================== Whitespace ====================
  describe('Whitespace', () => {
    test('preserves whitespace in text', () => {
      const lexer = new Lexer('  hello  ')
      const tokens = lexer.tokenize()
      expect(tokens[0].value).toBe('  hello  ')
    })

    test('handles whitespace inside tags', () => {
      const lexer = new Lexer('{{   foo   }}')
      const tokens = lexer.tokenize()
      const nameToken = tokens.find(t => t.type === TokenType.NAME)
      expect(nameToken?.value).toBe('foo')
    })

    test('handles tabs', () => {
      const lexer = new Lexer('\t{{ foo }}\t')
      const tokens = lexer.tokenize()
      expect(tokens[0].value).toBe('\t')
    })
  })

  // ==================== Mixed Content ====================
  describe('Mixed Content', () => {
    test('tokenizes text and variables', () => {
      const lexer = new Lexer('Hello {{ name }}!')
      const tokens = lexer.tokenize()

      expect(tokens[0].type).toBe(TokenType.TEXT)
      expect(tokens[0].value).toBe('Hello ')
      expect(tokens[1].type).toBe(TokenType.VARIABLE_START)
      expect(tokens[4].type).toBe(TokenType.TEXT)
      expect(tokens[4].value).toBe('!')
    })

    test('tokenizes text and blocks', () => {
      const lexer = new Lexer('{% if true %}yes{% endif %}')
      const tokens = lexer.tokenize()

      expect(tokens[0].type).toBe(TokenType.BLOCK_START)
      expect(tokens.some(t => t.type === TokenType.TEXT && t.value === 'yes')).toBe(true)
    })

    test('tokenizes complex template', () => {
      const template = `
        {% for item in items %}
          <li>{{ item.name }}: {{ item.value|default:"N/A" }}</li>
        {% endfor %}
      `
      const lexer = new Lexer(template)
      const tokens = lexer.tokenize()

      expect(tokens.filter(t => t.type === TokenType.BLOCK_START).length).toBe(2)
      expect(tokens.filter(t => t.type === TokenType.VARIABLE_START).length).toBe(2)
    })
  })

  // ==================== Error Handling ====================
  describe('Error Handling', () => {
    test('throws on unterminated string', () => {
      const lexer = new Lexer('{{ "unterminated }}')
      expect(() => lexer.tokenize()).toThrow()
    })

    test('throws on unclosed variable tag', () => {
      const lexer = new Lexer('{{ foo')
      expect(() => lexer.tokenize()).toThrow()
    })

    test('throws on unclosed block tag', () => {
      const lexer = new Lexer('{% if true')
      expect(() => lexer.tokenize()).toThrow()
    })

    test('throws on invalid operator', () => {
      const lexer = new Lexer('{{ a ! b }}')
      expect(() => lexer.tokenize()).toThrow()
    })
  })

  // ==================== Edge Cases ====================
  describe('Edge Cases', () => {
    test('handles empty template', () => {
      const lexer = new Lexer('')
      const tokens = lexer.tokenize()
      expect(tokens.length).toBe(1)
      expect(tokens[0].type).toBe(TokenType.EOF)
    })

    test('handles only whitespace', () => {
      const lexer = new Lexer('   \n\t  ')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe(TokenType.TEXT)
    })

    test('handles adjacent tags', () => {
      const lexer = new Lexer('{{ a }}{{ b }}{% if c %}{% endif %}')
      const tokens = lexer.tokenize()
      expect(tokens.filter(t => t.type === TokenType.VARIABLE_START).length).toBe(2)
      expect(tokens.filter(t => t.type === TokenType.BLOCK_START).length).toBe(2)
    })

    test('handles deeply nested expressions', () => {
      const lexer = new Lexer('{{ ((((a)))) }}')
      const tokens = lexer.tokenize()
      expect(tokens.filter(t => t.type === TokenType.LPAREN).length).toBe(4)
    })

    test('handles filter chain', () => {
      const lexer = new Lexer('{{ x|a|b|c|d|e }}')
      const tokens = lexer.tokenize()
      expect(tokens.filter(t => t.type === TokenType.PIPE).length).toBe(5)
    })

    test('handles complex attribute chain', () => {
      const lexer = new Lexer('{{ a.b.c.d.e.f }}')
      const tokens = lexer.tokenize()
      expect(tokens.filter(t => t.type === TokenType.DOT).length).toBe(5)
    })
  })
})
