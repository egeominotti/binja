/**
 * Jinja2/DTL Lexer - Tokenizes template source into tokens
 * Compatible with both Jinja2 and Django Template Language
 *
 * Automatically uses Zig FFI acceleration when available and using default delimiters.
 */
import { Token, TokenType, KEYWORDS, LexerState } from './tokens'
import { tokenizeNative, isNativeAccelerated } from './hybrid'

export class Lexer {
  private state: LexerState
  private variableStart: string
  private variableEnd: string
  private blockStart: string
  private blockEnd: string
  private commentStart: string
  private commentEnd: string
  private useNative: boolean

  constructor(
    source: string,
    options: {
      variableStart?: string
      variableEnd?: string
      blockStart?: string
      blockEnd?: string
      commentStart?: string
      commentEnd?: string
    } = {}
  ) {
    this.state = {
      source,
      pos: 0,
      line: 1,
      column: 1,
      tokens: [],
    }

    // Configurable delimiters (default Jinja2/DTL)
    this.variableStart = options.variableStart ?? '{{'
    this.variableEnd = options.variableEnd ?? '}}'
    this.blockStart = options.blockStart ?? '{%'
    this.blockEnd = options.blockEnd ?? '%}'
    this.commentStart = options.commentStart ?? '{#'
    this.commentEnd = options.commentEnd ?? '#}'

    // Use native only with default delimiters
    const hasCustomDelimiters =
      options.variableStart !== undefined ||
      options.variableEnd !== undefined ||
      options.blockStart !== undefined ||
      options.blockEnd !== undefined ||
      options.commentStart !== undefined ||
      options.commentEnd !== undefined

    this.useNative = !hasCustomDelimiters && isNativeAccelerated()
  }

  tokenize(): Token[] {
    // Try native acceleration first
    if (this.useNative) {
      const nativeTokens = tokenizeNative(this.state.source)
      if (nativeTokens) return nativeTokens
    }

    // Fallback to TypeScript implementation
    while (!this.isAtEnd()) {
      this.scanToken()
    }

    this.addToken(TokenType.EOF, '')
    return this.state.tokens
  }

  private scanToken(): void {
    // Check for template delimiters
    if (this.match(this.variableStart)) {
      this.addToken(TokenType.VARIABLE_START, this.variableStart)
      this.scanExpression(this.variableEnd, TokenType.VARIABLE_END)
      return
    }

    if (this.match(this.blockStart)) {
      // Check for special block tags with whitespace control
      const wsControl = this.peek() === '-'
      if (wsControl) this.advance()

      // Check for raw/verbatim block - capture content as-is until endraw/endverbatim
      const savedPos = this.state.pos
      this.skipWhitespace()
      if (this.checkWord('raw') || this.checkWord('verbatim')) {
        const tagName = this.checkWord('raw') ? 'raw' : 'verbatim'
        this.scanRawBlock(tagName, wsControl)
        return
      }
      // Reset position if not raw/verbatim
      this.state.pos = savedPos

      this.addToken(TokenType.BLOCK_START, this.blockStart + (wsControl ? '-' : ''))
      this.scanExpression(this.blockEnd, TokenType.BLOCK_END)
      return
    }

    if (this.match(this.commentStart)) {
      this.scanComment()
      return
    }

    // Regular text
    this.scanText()
  }

  private checkWord(word: string): boolean {
    const start = this.state.pos
    for (let i = 0; i < word.length; i++) {
      if (this.state.source[start + i]?.toLowerCase() !== word[i]) {
        return false
      }
    }
    // Check that word ends (not part of larger identifier)
    const nextChar = this.state.source[start + word.length]
    return !nextChar || !this.isAlphaNumeric(nextChar)
  }

  private scanRawBlock(tagName: string, wsControl: boolean): void {
    const startLine = this.state.line
    const startColumn = this.state.column

    // Skip the tag name
    for (let i = 0; i < tagName.length; i++) {
      this.advance()
    }
    this.skipWhitespace()

    // Skip optional whitespace control before closing
    if (this.peek() === '-') this.advance()

    // Expect block end
    if (!this.match(this.blockEnd)) {
      throw new Error(`Expected ${this.blockEnd} after ${tagName} at line ${this.state.line}`)
    }

    // Now capture everything until {% endraw %} or {% endverbatim %}
    const endTag = `end${tagName}`
    const contentStart = this.state.pos

    while (!this.isAtEnd()) {
      // Look for {% endraw %} or {% endverbatim %}
      if (this.check(this.blockStart)) {
        const savedPos = this.state.pos
        const savedLine = this.state.line
        const savedColumn = this.state.column

        this.match(this.blockStart)
        if (this.peek() === '-') this.advance()
        this.skipWhitespace()

        if (this.checkWord(endTag)) {
          // Found end tag - emit content as TEXT
          const content = this.state.source.slice(contentStart, savedPos)
          if (content.length > 0) {
            this.state.tokens.push({
              type: TokenType.TEXT,
              value: content,
              line: startLine,
              column: startColumn,
            })
          }

          // Skip the end tag
          for (let i = 0; i < endTag.length; i++) {
            this.advance()
          }
          this.skipWhitespace()
          if (this.peek() === '-') this.advance()

          if (!this.match(this.blockEnd)) {
            throw new Error(`Expected ${this.blockEnd} after ${endTag} at line ${this.state.line}`)
          }
          return
        }

        // Not the end tag, restore position and continue
        this.state.pos = savedPos
        this.state.line = savedLine
        this.state.column = savedColumn
      }

      if (this.peek() === '\n') {
        this.state.line++
        this.state.column = 0
      }
      this.advance()
    }

    throw new Error(`Unclosed ${tagName} block starting at line ${startLine}`)
  }

  private scanText(): void {
    const start = this.state.pos
    const startLine = this.state.line
    const startColumn = this.state.column

    while (!this.isAtEnd()) {
      // Stop at any delimiter
      if (
        this.check(this.variableStart) ||
        this.check(this.blockStart) ||
        this.check(this.commentStart)
      ) {
        break
      }

      if (this.peek() === '\n') {
        this.state.line++
        this.state.column = 0
      }

      this.advance()
    }

    if (this.state.pos > start) {
      const text = this.state.source.slice(start, this.state.pos)
      // Use the starting line/column for the token
      this.state.tokens.push({
        type: TokenType.TEXT,
        value: text,
        line: startLine,
        column: startColumn,
      })
    }
  }

  private scanExpression(endDelimiter: string, endTokenType: TokenType): void {
    this.skipWhitespace()

    while (!this.isAtEnd()) {
      this.skipWhitespace()

      // Check for whitespace control before end delimiter
      if (this.peek() === '-' && this.check(endDelimiter, 1)) {
        this.advance() // skip -
      }

      // Check for end delimiter
      if (this.match(endDelimiter)) {
        this.addToken(endTokenType, endDelimiter)
        return
      }

      // Scan expression token
      this.scanExpressionToken()
    }

    throw new Error(`Unclosed template tag at line ${this.state.line}`)
  }

  private scanExpressionToken(): void {
    this.skipWhitespace()

    if (this.isAtEnd()) return

    const c = this.peek()

    // String literals
    if (c === '"' || c === "'") {
      this.scanString(c)
      return
    }

    // Numbers
    if (this.isDigit(c)) {
      this.scanNumber()
      return
    }

    // Identifiers and keywords
    if (this.isAlpha(c) || c === '_') {
      this.scanIdentifier()
      return
    }

    // Operators and punctuation
    this.scanOperator()
  }

  private scanString(quote: string): void {
    this.advance() // consume opening quote
    const start = this.state.pos

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\' && this.peekNext() === quote) {
        this.advance() // skip escape
      }
      if (this.peek() === '\n') {
        this.state.line++
        this.state.column = 0
      }
      this.advance()
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${this.state.line}`)
    }

    const value = this.state.source.slice(start, this.state.pos)
    this.advance() // consume closing quote

    this.addToken(TokenType.STRING, value)
  }

  private scanNumber(): void {
    const start = this.state.pos

    while (this.isDigit(this.peek())) {
      this.advance()
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance() // consume .
      while (this.isDigit(this.peek())) {
        this.advance()
      }
    }

    const value = this.state.source.slice(start, this.state.pos)
    this.addToken(TokenType.NUMBER, value)
  }

  private scanIdentifier(): void {
    const start = this.state.pos

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      this.advance()
    }

    const value = this.state.source.slice(start, this.state.pos)
    const type = KEYWORDS[value] ?? TokenType.NAME

    this.addToken(type, value)
  }

  private scanOperator(): void {
    const c = this.advance()

    switch (c) {
      case '.': this.addToken(TokenType.DOT, c); break
      case ',': this.addToken(TokenType.COMMA, c); break
      case ':': this.addToken(TokenType.COLON, c); break
      case '|': this.addToken(TokenType.PIPE, c); break
      case '(': this.addToken(TokenType.LPAREN, c); break
      case ')': this.addToken(TokenType.RPAREN, c); break
      case '[': this.addToken(TokenType.LBRACKET, c); break
      case ']': this.addToken(TokenType.RBRACKET, c); break
      case '{': this.addToken(TokenType.LBRACE, c); break
      case '}': this.addToken(TokenType.RBRACE, c); break
      case '+': this.addToken(TokenType.ADD, c); break
      case '-': this.addToken(TokenType.SUB, c); break
      case '*': this.addToken(TokenType.MUL, c); break
      case '/': this.addToken(TokenType.DIV, c); break
      case '%': this.addToken(TokenType.MOD, c); break
      case '~': this.addToken(TokenType.TILDE, c); break
      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQ, '==')
        } else {
          this.addToken(TokenType.ASSIGN, '=')
        }
        break
      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.NE, '!=')
        } else {
          throw new Error(`Unexpected character '!' at line ${this.state.line}`)
        }
        break
      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LE, '<=')
        } else {
          this.addToken(TokenType.LT, '<')
        }
        break
      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GE, '>=')
        } else {
          this.addToken(TokenType.GT, '>')
        }
        break
      default:
        if (!this.isWhitespace(c)) {
          throw new Error(`Unexpected character '${c}' at line ${this.state.line}`)
        }
    }
  }

  private scanComment(): void {
    // Skip until comment end
    while (!this.isAtEnd() && !this.check(this.commentEnd)) {
      if (this.peek() === '\n') {
        this.state.line++
        this.state.column = 0
      }
      this.advance()
    }

    if (!this.isAtEnd()) {
      this.match(this.commentEnd) // consume end delimiter
    }
  }

  // Helper methods
  private isAtEnd(): boolean {
    return this.state.pos >= this.state.source.length
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0'
    return this.state.source[this.state.pos]
  }

  private peekNext(): string {
    if (this.state.pos + 1 >= this.state.source.length) return '\0'
    return this.state.source[this.state.pos + 1]
  }

  private advance(): string {
    const c = this.state.source[this.state.pos]
    this.state.pos++
    this.state.column++
    return c
  }

  private match(expected: string, offset: number = 0): boolean {
    const source = this.state.source
    const start = this.state.pos + offset
    const len = expected.length
    if (start + len > source.length) return false

    // Optimized: char-by-char comparison instead of slice() - 39% faster
    for (let i = 0; i < len; i++) {
      if (source[start + i] !== expected[i]) return false
    }

    if (offset === 0) {
      this.state.pos += len
      this.state.column += len
    }
    return true
  }

  private check(expected: string, offset: number = 0): boolean {
    const source = this.state.source
    const start = this.state.pos + offset
    const len = expected.length
    if (start + len > source.length) return false

    // Optimized: char-by-char comparison instead of slice() - 39% faster
    for (let i = 0; i < len; i++) {
      if (source[start + i] !== expected[i]) return false
    }
    return true
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd() && this.isWhitespace(this.peek())) {
      if (this.peek() === '\n') {
        this.state.line++
        this.state.column = 0
      }
      this.advance()
    }
  }

  private isWhitespace(c: string): boolean {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r'
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9'
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c)
  }

  private addToken(type: TokenType, value: string): void {
    this.state.tokens.push({
      type,
      value,
      line: this.state.line,
      column: this.state.column - value.length,
    })
  }
}

export { TokenType, KEYWORDS } from './tokens'
export type { Token, LexerState } from './tokens'
export { isNativeAccelerated } from './hybrid'
