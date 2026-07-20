/**
 * Liquid Lexer
 * Tokenizes Liquid template syntax: {{ output }}, {% tags %}
 * Shopify-compatible implementation
 */

export enum LiquidTokenType {
  TEXT = 'TEXT',
  VAR_START = 'VAR_START', // {{
  VAR_END = 'VAR_END', // }}
  TAG_START = 'TAG_START', // {%
  TAG_END = 'TAG_END', // %}
  ID = 'ID',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  DOT = 'DOT',
  PIPE = 'PIPE',
  COLON = 'COLON',
  COMMA = 'COMMA',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  RANGE = 'RANGE', // ..
  EQUALS = 'EQUALS', // =
  EQ = 'EQ', // ==
  NE = 'NE', // != or <>
  LT = 'LT',
  LE = 'LE',
  GT = 'GT',
  GE = 'GE',
  CONTAINS = 'CONTAINS',
  AND = 'AND',
  OR = 'OR',
  EOF = 'EOF',
}

export interface LiquidToken {
  type: LiquidTokenType
  value: string
  line: number
  column: number
}

const RAW_OPEN_PATTERN = /\{%\s*raw\s*%\}/y
const RAW_END_PATTERN = /\{%\s*endraw\s*%\}/g

export class LiquidLexer {
  private source: string
  private pos: number = 0
  private line: number = 1
  private column: number = 1
  private tokens: LiquidToken[] = []

  constructor(source: string) {
    this.source = source
  }

  tokenize(): LiquidToken[] {
    while (!this.isAtEnd()) {
      this.scanToken()
    }
    this.addToken(LiquidTokenType.EOF, '')
    return this.tokens
  }

  private scanToken(): void {
    // Check for raw tag - capture everything as text until endraw
    if (this.checkRawTag()) {
      this.scanRawBlock()
      return
    }

    // Check for variable output {{ }}
    if (this.check('{{')) {
      this.match('{{')
      // Check for whitespace control {{-
      if (this.peek() === '-') this.advance()
      this.addToken(LiquidTokenType.VAR_START, '{{')
      this.scanExpression('}}')
      return
    }

    // Check for tag {% %}
    if (this.check('{%')) {
      this.match('{%')
      // Check for whitespace control {%-
      if (this.peek() === '-') this.advance()
      this.addToken(LiquidTokenType.TAG_START, '{%')
      this.scanExpression('%}')
      return
    }

    // Regular text
    this.scanText()
  }

  private checkRawTag(): boolean {
    RAW_OPEN_PATTERN.lastIndex = this.pos
    return RAW_OPEN_PATTERN.test(this.source)
  }

  private scanRawBlock(): void {
    // Match {% raw %}
    RAW_OPEN_PATTERN.lastIndex = this.pos
    const rawMatch = RAW_OPEN_PATTERN.exec(this.source)
    if (!rawMatch) return

    const rawOpen = rawMatch[0]
    this.advanceTo(this.pos + rawOpen.length)

    // Add tokens for {% raw %}
    this.addToken(LiquidTokenType.TAG_START, '{%')
    this.addToken(LiquidTokenType.ID, 'raw')
    this.addToken(LiquidTokenType.TAG_END, '%}')

    // Find {% endraw %}
    const contentStart = this.pos
    const startLine = this.line
    const startColumn = this.column

    RAW_END_PATTERN.lastIndex = this.pos
    const endMatch = RAW_END_PATTERN.exec(this.source)
    this.advanceTo(endMatch?.index ?? this.source.length)

    // Add raw content as TEXT
    if (this.pos > contentStart) {
      const content = this.source.slice(contentStart, this.pos)
      this.tokens.push({
        type: LiquidTokenType.TEXT,
        value: content,
        line: startLine,
        column: startColumn,
      })
    }

    // Match {% endraw %}
    if (endMatch) {
      const endRaw = endMatch[0]
      this.advanceTo(this.pos + endRaw.length)
      this.addToken(LiquidTokenType.TAG_START, '{%')
      this.addToken(LiquidTokenType.ID, 'endraw')
      this.addToken(LiquidTokenType.TAG_END, '%}')
    }
  }

  private scanText(): void {
    const start = this.pos
    const startLine = this.line
    const startColumn = this.column

    while (!this.isAtEnd()) {
      const nextBrace = this.source.indexOf('{', this.pos)
      if (nextBrace === -1) {
        this.advanceTo(this.source.length)
        break
      }

      this.advanceTo(nextBrace)
      if (this.check('{{') || this.check('{%')) break

      this.advance()
    }

    if (this.pos > start) {
      this.tokens.push({
        type: LiquidTokenType.TEXT,
        value: this.source.slice(start, this.pos),
        line: startLine,
        column: startColumn,
      })
    }
  }

  private scanExpression(closeTag: string): void {
    this.skipWhitespace()

    while (!this.isAtEnd()) {
      this.skipWhitespace()

      // Check for whitespace control -}} or -%}
      if (this.peek() === '-' && this.check(`-${closeTag}`)) {
        this.advance() // skip -
      }

      // Check for close
      if (this.check(closeTag)) {
        this.match(closeTag)
        this.addToken(
          closeTag === '}}' ? LiquidTokenType.VAR_END : LiquidTokenType.TAG_END,
          closeTag
        )
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
        this.addToken(LiquidTokenType.RANGE, '..')
      } else {
        this.advance()
        this.addToken(LiquidTokenType.DOT, '.')
      }
      return
    }

    if (c === '|') {
      this.advance()
      this.addToken(LiquidTokenType.PIPE, '|')
      return
    }

    if (c === ':') {
      this.advance()
      this.addToken(LiquidTokenType.COLON, ':')
      return
    }

    if (c === ',') {
      this.advance()
      this.addToken(LiquidTokenType.COMMA, ',')
      return
    }

    if (c === '[') {
      this.advance()
      this.addToken(LiquidTokenType.LBRACKET, '[')
      return
    }

    if (c === ']') {
      this.advance()
      this.addToken(LiquidTokenType.RBRACKET, ']')
      return
    }

    if (c === '=') {
      if (this.peekNext() === '=') {
        this.advance()
        this.advance()
        this.addToken(LiquidTokenType.EQ, '==')
      } else {
        this.advance()
        this.addToken(LiquidTokenType.EQUALS, '=')
      }
      return
    }

    if (c === '!' && this.peekNext() === '=') {
      this.advance()
      this.advance()
      this.addToken(LiquidTokenType.NE, '!=')
      return
    }

    if (c === '<') {
      if (this.peekNext() === '=') {
        this.advance()
        this.advance()
        this.addToken(LiquidTokenType.LE, '<=')
      } else if (this.peekNext() === '>') {
        this.advance()
        this.advance()
        this.addToken(LiquidTokenType.NE, '<>')
      } else {
        this.advance()
        this.addToken(LiquidTokenType.LT, '<')
      }
      return
    }

    if (c === '>') {
      if (this.peekNext() === '=') {
        this.advance()
        this.advance()
        this.addToken(LiquidTokenType.GE, '>=')
      } else {
        this.advance()
        this.addToken(LiquidTokenType.GT, '>')
      }
      return
    }

    // Keywords and identifiers
    if (this.isAlpha(c) || c === '_') {
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
      if (this.peek() === '\n') {
        this.line++
        this.column = 0
      }
      this.advance()
    }

    const value = this.source.slice(start, this.pos)
    this.advance() // closing quote
    this.addToken(LiquidTokenType.STRING, value)
  }

  private scanNumber(): void {
    const start = this.pos
    if (this.peek() === '-') this.advance()

    while (this.isDigit(this.peek())) this.advance()

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance()
      while (this.isDigit(this.peek())) this.advance()
    }

    this.addToken(LiquidTokenType.NUMBER, this.source.slice(start, this.pos))
  }

  private scanIdentifier(): void {
    const start = this.pos

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '-') {
      this.advance()
    }

    const value = this.source.slice(start, this.pos)

    // Keywords
    switch (value) {
      case 'and':
        this.addToken(LiquidTokenType.AND, value)
        break
      case 'or':
        this.addToken(LiquidTokenType.OR, value)
        break
      case 'contains':
        this.addToken(LiquidTokenType.CONTAINS, value)
        break
      default:
        this.addToken(LiquidTokenType.ID, value)
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

  private advanceTo(target: number): void {
    while (this.pos < target) {
      if (this.source[this.pos] === '\n') {
        this.line++
        this.column = 0
      }
      this.advance()
    }
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
    while (
      this.peek() === ' ' ||
      this.peek() === '\t' ||
      this.peek() === '\n' ||
      this.peek() === '\r'
    ) {
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

  private addToken(type: LiquidTokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column - value.length,
    })
  }
}
