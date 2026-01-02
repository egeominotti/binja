/**
 * Handlebars Lexer
 * Tokenizes Handlebars template syntax: {{expr}}, {{#if}}, {{/if}}, {{>partial}}
 */

export enum HbsTokenType {
  TEXT = 'TEXT',
  OPEN = 'OPEN',           // {{
  OPEN_BLOCK = 'OPEN_BLOCK', // {{#
  OPEN_END = 'OPEN_END',   // {{/
  OPEN_PARTIAL = 'OPEN_PARTIAL', // {{>
  OPEN_UNESCAPED = 'OPEN_UNESCAPED', // {{{
  OPEN_COMMENT = 'OPEN_COMMENT', // {{!
  CLOSE = 'CLOSE',         // }}
  CLOSE_UNESCAPED = 'CLOSE_UNESCAPED', // }}}
  ID = 'ID',               // identifier
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DOT = 'DOT',
  DOTDOT = 'DOTDOT',       // ..
  SLASH = 'SLASH',
  EQUALS = 'EQUALS',
  PIPE = 'PIPE',
  EOF = 'EOF',
}

export interface HbsToken {
  type: HbsTokenType
  value: string
  line: number
  column: number
}

export class HandlebarsLexer {
  private source: string
  private pos: number = 0
  private line: number = 1
  private column: number = 1
  private tokens: HbsToken[] = []

  constructor(source: string) {
    this.source = source
  }

  tokenize(): HbsToken[] {
    while (!this.isAtEnd()) {
      this.scanToken()
    }
    this.addToken(HbsTokenType.EOF, '')
    return this.tokens
  }

  private scanToken(): void {
    // Check for mustache open
    if (this.check('{{{')) {
      this.match('{{{')
      this.addToken(HbsTokenType.OPEN_UNESCAPED, '{{{')
      this.scanExpression(true)
      return
    }

    if (this.check('{{!--')) {
      // Block comment {{!-- --}}
      this.match('{{!--')
      this.scanBlockComment()
      return
    }

    if (this.check('{{!')) {
      // Comment {{! }}
      this.match('{{!')
      this.addToken(HbsTokenType.OPEN_COMMENT, '{{!')
      this.scanComment()
      return
    }

    if (this.check('{{#')) {
      this.match('{{#')
      this.addToken(HbsTokenType.OPEN_BLOCK, '{{#')
      this.scanExpression(false)
      return
    }

    if (this.check('{{/')) {
      this.match('{{/')
      this.addToken(HbsTokenType.OPEN_END, '{{/')
      this.scanExpression(false)
      return
    }

    if (this.check('{{>')) {
      this.match('{{>')
      this.addToken(HbsTokenType.OPEN_PARTIAL, '{{>')
      this.scanExpression(false)
      return
    }

    if (this.check('{{')) {
      this.match('{{')
      this.addToken(HbsTokenType.OPEN, '{{')
      this.scanExpression(false)
      return
    }

    // Regular text
    this.scanText()
  }

  private scanText(): void {
    const start = this.pos
    const startLine = this.line
    const startColumn = this.column

    while (!this.isAtEnd() && !this.check('{{')) {
      if (this.peek() === '\n') {
        this.line++
        this.column = 0
      }
      this.advance()
    }

    if (this.pos > start) {
      const text = this.source.slice(start, this.pos)
      this.tokens.push({
        type: HbsTokenType.TEXT,
        value: text,
        line: startLine,
        column: startColumn,
      })
    }
  }

  private scanExpression(unescaped: boolean): void {
    this.skipWhitespace()

    while (!this.isAtEnd()) {
      this.skipWhitespace()

      // Check for close
      if (unescaped && this.check('}}}')) {
        this.match('}}}')
        this.addToken(HbsTokenType.CLOSE_UNESCAPED, '}}}')
        return
      }

      if (this.check('}}')) {
        this.match('}}')
        this.addToken(HbsTokenType.CLOSE, '}}')
        return
      }

      this.scanExpressionToken()
    }
  }

  private scanExpressionToken(): void {
    const c = this.peek()

    // String
    if (c === '"' || c === "'") {
      this.scanString(c)
      return
    }

    // Number
    if (this.isDigit(c) || (c === '-' && this.isDigit(this.peekNext()))) {
      this.scanNumber()
      return
    }

    // Operators
    if (c === '.') {
      if (this.peekNext() === '.') {
        this.advance()
        this.advance()
        this.addToken(HbsTokenType.DOTDOT, '..')
      } else {
        this.advance()
        this.addToken(HbsTokenType.DOT, '.')
      }
      return
    }

    if (c === '/') {
      this.advance()
      this.addToken(HbsTokenType.SLASH, '/')
      return
    }

    if (c === '=') {
      this.advance()
      this.addToken(HbsTokenType.EQUALS, '=')
      return
    }

    if (c === '|') {
      this.advance()
      this.addToken(HbsTokenType.PIPE, '|')
      return
    }

    // Identifier
    if (this.isAlpha(c) || c === '_' || c === '@') {
      this.scanIdentifier()
      return
    }

    // Skip unknown
    this.advance()
  }

  private scanString(quote: string): void {
    this.advance() // opening quote
    const start = this.pos

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') this.advance()
      this.advance()
    }

    const value = this.source.slice(start, this.pos)
    this.advance() // closing quote
    this.addToken(HbsTokenType.STRING, value)
  }

  private scanNumber(): void {
    const start = this.pos
    if (this.peek() === '-') this.advance()

    while (this.isDigit(this.peek())) this.advance()

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance()
      while (this.isDigit(this.peek())) this.advance()
    }

    this.addToken(HbsTokenType.NUMBER, this.source.slice(start, this.pos))
  }

  private scanIdentifier(): void {
    const start = this.pos

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '-' || this.peek() === '@') {
      this.advance()
    }

    const value = this.source.slice(start, this.pos)

    // Check for boolean
    if (value === 'true' || value === 'false') {
      this.addToken(HbsTokenType.BOOLEAN, value)
    } else {
      this.addToken(HbsTokenType.ID, value)
    }
  }

  private scanComment(): void {
    while (!this.isAtEnd() && !this.check('}}')) {
      if (this.peek() === '\n') {
        this.line++
        this.column = 0
      }
      this.advance()
    }
    if (this.check('}}')) {
      this.match('}}')
      this.addToken(HbsTokenType.CLOSE, '}}')
    }
  }

  private scanBlockComment(): void {
    while (!this.isAtEnd() && !this.check('--}}')) {
      if (this.peek() === '\n') {
        this.line++
        this.column = 0
      }
      this.advance()
    }
    if (this.check('--}}')) {
      this.match('--}}')
    }
  }

  // Helpers
  private isAtEnd(): boolean {
    return this.pos >= this.source.length
  }

  private peek(): string {
    return this.source[this.pos] || '\0'
  }

  private peekNext(): string {
    return this.source[this.pos + 1] || '\0'
  }

  private advance(): string {
    const c = this.source[this.pos]
    this.pos++
    this.column++
    return c
  }

  private check(expected: string): boolean {
    for (let i = 0; i < expected.length; i++) {
      if (this.source[this.pos + i] !== expected[i]) return false
    }
    return true
  }

  private match(expected: string): boolean {
    if (!this.check(expected)) return false
    this.pos += expected.length
    this.column += expected.length
    return true
  }

  private skipWhitespace(): void {
    while (this.peek() === ' ' || this.peek() === '\t' || this.peek() === '\n' || this.peek() === '\r') {
      if (this.peek() === '\n') {
        this.line++
        this.column = 0
      }
      this.advance()
    }
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9'
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isDigit(c) || this.isAlpha(c)
  }

  private addToken(type: HbsTokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column - value.length,
    })
  }
}
