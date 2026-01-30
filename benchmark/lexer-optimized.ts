/**
 * Optimized Lexer with indexOf-based scanText
 * For benchmarking comparison
 */

import { Token, TokenType, KEYWORDS, LexerState } from '../src/lexer/tokens'
import { TemplateSyntaxError } from '../src/errors'

export class LexerOptimized {
  private state: LexerState
  private variableStart: string
  private variableEnd: string
  private blockStart: string
  private blockEnd: string
  private commentStart: string
  private commentEnd: string

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

    this.variableStart = options.variableStart ?? '{{'
    this.variableEnd = options.variableEnd ?? '}}'
    this.blockStart = options.blockStart ?? '{%'
    this.blockEnd = options.blockEnd ?? '%}'
    this.commentStart = options.commentStart ?? '{#'
    this.commentEnd = options.commentEnd ?? '#}'
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken()
    }

    this.addToken(TokenType.EOF, '')
    return this.state.tokens
  }

  private scanToken(): void {
    if (this.match(this.variableStart)) {
      this.addToken(TokenType.VARIABLE_START, this.variableStart)
      this.scanExpression(this.variableEnd, TokenType.VARIABLE_END)
      return
    }

    if (this.match(this.blockStart)) {
      const wsControl = this.peek() === '-'
      if (wsControl) this.advance()

      const savedPos = this.state.pos
      this.skipWhitespace()
      if (this.checkWord('raw') || this.checkWord('verbatim')) {
        const tagName = this.checkWord('raw') ? 'raw' : 'verbatim'
        this.scanRawBlock(tagName, wsControl)
        return
      }
      this.state.pos = savedPos

      this.addToken(TokenType.BLOCK_START, this.blockStart + (wsControl ? '-' : ''))
      this.scanExpression(this.blockEnd, TokenType.BLOCK_END)
      return
    }

    if (this.match(this.commentStart)) {
      this.scanComment()
      return
    }

    this.scanTextOptimized()
  }

  /**
   * OPTIMIZED scanText using indexOf
   * Instead of checking 3 delimiters at each character position,
   * we use indexOf to jump directly to the next '{' character
   */
  private scanTextOptimized(): void {
    const start = this.state.pos
    const startLine = this.state.line
    const startColumn = this.state.column
    const source = this.state.source

    while (!this.isAtEnd()) {
      // Find next potential delimiter start (all delimiters start with '{')
      const nextBrace = source.indexOf('{', this.state.pos)

      if (nextBrace === -1) {
        // No more braces - consume rest as text
        this.advanceToEndTracking()
        break
      }

      // Fast-forward to the brace, tracking newlines
      if (nextBrace > this.state.pos) {
        this.advanceToPositionTracking(nextBrace)
      }

      // Check if it's actually a template delimiter
      if (
        this.check(this.variableStart) ||
        this.check(this.blockStart) ||
        this.check(this.commentStart)
      ) {
        break
      }

      // Just a lone '{', advance past it
      if (this.peek() === '\n') {
        this.state.line++
        this.state.column = 0
      }
      this.state.pos++
      this.state.column++
    }

    if (this.state.pos > start) {
      const text = source.slice(start, this.state.pos)
      this.state.tokens.push({
        type: TokenType.TEXT,
        value: text,
        line: startLine,
        column: startColumn,
      })
    }
  }

  /**
   * Advance to target position while tracking line/column
   */
  private advanceToPositionTracking(targetPos: number): void {
    const source = this.state.source
    while (this.state.pos < targetPos) {
      if (source[this.state.pos] === '\n') {
        this.state.line++
        this.state.column = 0
      }
      this.state.pos++
      this.state.column++
    }
  }

  /**
   * Advance to end while tracking line/column
   */
  private advanceToEndTracking(): void {
    const source = this.state.source
    const len = source.length
    while (this.state.pos < len) {
      if (source[this.state.pos] === '\n') {
        this.state.line++
        this.state.column = 0
      }
      this.state.pos++
      this.state.column++
    }
  }

  private checkWord(word: string): boolean {
    const start = this.state.pos
    for (let i = 0; i < word.length; i++) {
      if (this.state.source[start + i]?.toLowerCase() !== word[i]) {
        return false
      }
    }
    const nextChar = this.state.source[start + word.length]
    return !nextChar || !this.isAlphaNumeric(nextChar)
  }

  private scanRawBlock(tagName: string, wsControl: boolean): void {
    const startLine = this.state.line
    const startColumn = this.state.column

    for (let i = 0; i < tagName.length; i++) {
      this.advance()
    }
    this.skipWhitespace()

    if (this.peek() === '-') this.advance()

    if (!this.match(this.blockEnd)) {
      throw new TemplateSyntaxError(`Expected '${this.blockEnd}' after '${tagName}'`, {
        line: this.state.line,
        column: this.state.column,
        source: this.state.source,
      })
    }

    const endTag = `end${tagName}`
    const contentStart = this.state.pos

    while (!this.isAtEnd()) {
      if (this.check(this.blockStart)) {
        const savedPos = this.state.pos
        const savedLine = this.state.line
        const savedColumn = this.state.column

        this.match(this.blockStart)
        if (this.peek() === '-') this.advance()
        this.skipWhitespace()

        if (this.checkWord(endTag)) {
          const content = this.state.source.slice(contentStart, savedPos)
          if (content.length > 0) {
            this.state.tokens.push({
              type: TokenType.TEXT,
              value: content,
              line: startLine,
              column: startColumn,
            })
          }

          for (let i = 0; i < endTag.length; i++) {
            this.advance()
          }
          this.skipWhitespace()
          if (this.peek() === '-') this.advance()

          if (!this.match(this.blockEnd)) {
            throw new TemplateSyntaxError(`Expected '${this.blockEnd}' after '${endTag}'`, {
              line: this.state.line,
              column: this.state.column,
              source: this.state.source,
            })
          }
          return
        }

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

    throw new TemplateSyntaxError(`Unclosed '${tagName}' block`, {
      line: startLine,
      column: startColumn,
      source: this.state.source,
      suggestion: `Add {% end${tagName} %} to close the block`,
    })
  }

  private scanExpression(endDelimiter: string, endTokenType: TokenType): void {
    this.skipWhitespace()

    while (!this.isAtEnd()) {
      this.skipWhitespace()

      if (this.peek() === '-' && this.check(endDelimiter, 1)) {
        this.advance()
      }

      if (this.match(endDelimiter)) {
        this.addToken(endTokenType, endDelimiter)
        return
      }

      this.scanExpressionToken()
    }

    throw new TemplateSyntaxError(`Unclosed template tag`, {
      line: this.state.line,
      column: this.state.column,
      source: this.state.source,
      suggestion: `Add closing delimiter '${endDelimiter}'`,
    })
  }

  private scanExpressionToken(): void {
    this.skipWhitespace()

    if (this.isAtEnd()) return

    const c = this.peek()

    if (c === '"' || c === "'") {
      this.scanString(c)
      return
    }

    if (this.isDigit(c)) {
      this.scanNumber()
      return
    }

    if (this.isAlpha(c) || c === '_') {
      this.scanIdentifier()
      return
    }

    this.scanOperator()
  }

  private scanString(quote: string): void {
    this.advance()
    const start = this.state.pos

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\' && this.peekNext() === quote) {
        this.advance()
      }
      if (this.peek() === '\n') {
        this.state.line++
        this.state.column = 0
      }
      this.advance()
    }

    if (this.isAtEnd()) {
      throw new TemplateSyntaxError(`Unterminated string literal`, {
        line: this.state.line,
        column: this.state.column,
        source: this.state.source,
        suggestion: `Add closing quote '${quote}'`,
      })
    }

    const value = this.state.source.slice(start, this.state.pos)
    this.advance()

    this.addToken(TokenType.STRING, value)
  }

  private scanNumber(): void {
    const start = this.state.pos

    while (this.isDigit(this.peek())) {
      this.advance()
    }

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance()
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
          throw new TemplateSyntaxError(`Unexpected character '!'`, {
            line: this.state.line,
            column: this.state.column - 1,
            source: this.state.source,
            suggestion: `Use '!=' for not-equal comparison or 'not' for negation`,
          })
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
      case '?':
        if (this.match('?')) {
          this.addToken(TokenType.NULLCOALESCE, '??')
        } else {
          this.addToken(TokenType.QUESTION, '?')
        }
        break
      default:
        if (!this.isWhitespace(c)) {
          throw new TemplateSyntaxError(`Unexpected character '${c}'`, {
            line: this.state.line,
            column: this.state.column - 1,
            source: this.state.source,
          })
        }
    }
  }

  private scanComment(): void {
    while (!this.isAtEnd() && !this.check(this.commentEnd)) {
      if (this.peek() === '\n') {
        this.state.line++
        this.state.column = 0
      }
      this.advance()
    }

    if (!this.isAtEnd()) {
      this.match(this.commentEnd)
    }
  }

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
    const code = c.charCodeAt(0)
    return code >= 48 && code <= 57
  }

  private isAlpha(c: string): boolean {
    const code = c.charCodeAt(0)
    return (code >= 97 && code <= 122) || (code >= 65 && code <= 90)
  }

  private isAlphaNumeric(c: string): boolean {
    const code = c.charCodeAt(0)
    return (code >= 48 && code <= 57) ||
           (code >= 97 && code <= 122) ||
           (code >= 65 && code <= 90)
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
