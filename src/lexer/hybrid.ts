/**
 * Hybrid Lexer - Uses Zig FFI when available, falls back to TypeScript
 */
import { Token, TokenType } from './tokens'

// Native module state
let _nativeChecked = false
let _nativeAvailable = false
let NativeLexerClass: any = null

function checkNative(): boolean {
  if (_nativeChecked) return _nativeAvailable

  _nativeChecked = true
  try {
    const native = require('../native')
    if (typeof native.isNativeAvailable === 'function' && native.isNativeAvailable()) {
      _nativeAvailable = true
      NativeLexerClass = native.NativeLexer
      return true
    }
  } catch {
    // Native not available
  }
  return false
}

// Map native token type numbers to TypeScript TokenType enum
const NATIVE_TO_TS: Record<number, TokenType> = {
  0: TokenType.TEXT,
  1: TokenType.VARIABLE_START,
  2: TokenType.VARIABLE_END,
  3: TokenType.BLOCK_START,
  4: TokenType.BLOCK_END,
  5: TokenType.COMMENT_START,
  6: TokenType.COMMENT_END,
  7: TokenType.NAME,
  8: TokenType.STRING,
  9: TokenType.NUMBER,
  10: TokenType.NAME, // OPERATOR
  11: TokenType.DOT,
  12: TokenType.COMMA,
  13: TokenType.PIPE,
  14: TokenType.COLON,
  15: TokenType.LPAREN,
  16: TokenType.RPAREN,
  17: TokenType.LBRACKET,
  18: TokenType.RBRACKET,
  19: TokenType.LBRACE,
  20: TokenType.RBRACE,
  21: TokenType.ASSIGN,
  22: TokenType.EOF,
}

const OPERATOR_TO_TYPE: Record<string, TokenType> = {
  '==': TokenType.EQ, '!=': TokenType.NE,
  '<': TokenType.LT, '>': TokenType.GT,
  '<=': TokenType.LE, '>=': TokenType.GE,
  '+': TokenType.ADD, '-': TokenType.SUB,
  '*': TokenType.MUL, '/': TokenType.DIV,
  '%': TokenType.MOD, '~': TokenType.TILDE,
}

const KEYWORD_TO_TYPE: Record<string, TokenType> = {
  'and': TokenType.AND,
  'or': TokenType.OR,
  'not': TokenType.NOT,
}

// Error code messages (must match LexerError enum in Zig)
const ERROR_MESSAGES: Record<number, string> = {
  1: 'Unterminated string',
  2: 'Unclosed template tag',
  3: 'Invalid operator',
  4: 'Unexpected character',
}

/**
 * Check if native acceleration is available
 */
export function isNativeAccelerated(): boolean {
  return checkNative()
}

/**
 * Tokenize using native FFI (returns null if not available)
 */
export function tokenizeNative(source: string): Token[] | null {
  if (!checkNative() || !NativeLexerClass) return null
  if (source.length === 0) {
    return [{ type: TokenType.EOF, value: '', line: 1, column: 1 }]
  }

  const lexer = new NativeLexerClass(source)
  try {
    // Check for lexer errors
    if (lexer.hasError()) {
      const errorCode = lexer.getErrorCode()
      const errorLine = lexer.getErrorLine()
      const message = ERROR_MESSAGES[errorCode] ?? 'Unknown error'
      throw new Error(`${message} at line ${errorLine}`)
    }

    const tokens: Token[] = []
    const count = lexer.tokenCount

    // Pre-compute line starts for fast line/column lookup
    const lineStarts: number[] = [0]
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '\n') lineStarts.push(i + 1)
    }

    for (let i = 0; i < count; i++) {
      const nativeType = lexer.getTokenType(i)
      const value = lexer.getTokenValue(i)
      const start = lexer.getTokenStart(i)

      // Binary search for line number
      let lo = 0, hi = lineStarts.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (lineStarts[mid] <= start) lo = mid
        else hi = mid - 1
      }
      const line = lo + 1
      const column = start - lineStarts[lo] + 1

      // Determine token type
      let type = NATIVE_TO_TS[nativeType] ?? TokenType.NAME
      let finalValue = value

      if (nativeType === 10 && OPERATOR_TO_TYPE[value]) {
        type = OPERATOR_TO_TYPE[value]
      } else if (type === TokenType.NAME && KEYWORD_TO_TYPE[value]) {
        type = KEYWORD_TO_TYPE[value]
      }

      // Strip quotes from string values (Zig includes them, TS doesn't)
      if (type === TokenType.STRING && finalValue.length >= 2) {
        const first = finalValue[0]
        const last = finalValue[finalValue.length - 1]
        if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
          finalValue = finalValue.slice(1, -1)
        }
      }

      tokens.push({ type, value: finalValue, line, column })
    }

    return tokens
  } finally {
    lexer.free()
  }
}
