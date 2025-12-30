/**
 * Hybrid Lexer - Uses Zig FFI when available, falls back to TypeScript
 */
import { Token, TokenType } from './tokens'

// Native module state - DISABLED for now (pure TypeScript is faster for most cases)
// Re-enable when native parser/runtime are implemented
let _nativeChecked = false
let _nativeAvailable = false
let _tokenizeBatchFn: ((source: string) => Array<[number, number, number]>) | null = null

function checkNative(): boolean {
  // Native Zig lexer disabled - using pure TypeScript
  // The FFI overhead negates Zig's speed advantage for lexer-only
  // Will re-enable when full native pipeline (lexer+parser+runtime) is ready
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
 * Tokenize using native FFI with batch API (single FFI call)
 */
export function tokenizeNative(source: string): Token[] | null {
  if (!checkNative() || !_tokenizeBatchFn) return null
  if (source.length === 0) {
    return [{ type: TokenType.EOF, value: '', line: 1, column: 1 }]
  }

  // Get all tokens in single FFI call (batch API)
  const rawTokens = _tokenizeBatchFn(source)

  // Pre-compute line starts for fast line/column lookup
  const lineStarts: number[] = [0]
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') lineStarts.push(i + 1)
  }

  const tokens: Token[] = new Array(rawTokens.length)

  for (let i = 0; i < rawTokens.length; i++) {
    const [nativeType, start, end] = rawTokens[i]
    let value = source.slice(start, end)

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

    if (nativeType === 10 && OPERATOR_TO_TYPE[value]) {
      type = OPERATOR_TO_TYPE[value]
    } else if (type === TokenType.NAME && KEYWORD_TO_TYPE[value]) {
      type = KEYWORD_TO_TYPE[value]
    }

    // Strip quotes from string values (Zig includes them, TS doesn't)
    if (type === TokenType.STRING && value.length >= 2) {
      const first = value[0]
      const last = value[value.length - 1]
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        value = value.slice(1, -1)
      }
    }

    tokens[i] = { type, value, line, column }
  }

  return tokens
}
