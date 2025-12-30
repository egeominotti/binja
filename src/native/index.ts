/**
 * Binja Native - Zig FFI bindings with fallback to pure JS
 *
 * Automatically uses native Zig lexer when available,
 * falls back to pure TypeScript implementation otherwise.
 */
import { dlopen, FFIType, ptr, CString, toArrayBuffer } from 'bun:ffi'
import { join, dirname, basename } from 'path'
import { existsSync } from 'fs'

// ============================================================================
// Types
// ============================================================================

export interface NativeToken {
  type: number
  start: number
  end: number
  value: string
}

export const TokenType = {
  TEXT: 0,
  VAR_START: 1,
  VAR_END: 2,
  BLOCK_START: 3,
  BLOCK_END: 4,
  COMMENT_START: 5,
  COMMENT_END: 6,
  IDENTIFIER: 7,
  STRING: 8,
  NUMBER: 9,
  OPERATOR: 10,
  DOT: 11,
  COMMA: 12,
  PIPE: 13,
  COLON: 14,
  LPAREN: 15,
  RPAREN: 16,
  LBRACKET: 17,
  RBRACKET: 18,
  LBRACE: 19,
  RBRACE: 20,
  ASSIGN: 21,
  EOF: 22,
} as const

// ============================================================================
// FFI Setup
// ============================================================================

const symbols = {
  binja_lexer_new: {
    args: [FFIType.ptr, FFIType.u64] as const,
    returns: FFIType.ptr,
  },
  binja_lexer_free: {
    args: [FFIType.ptr] as const,
    returns: FFIType.void,
  },
  binja_lexer_token_count: {
    args: [FFIType.ptr] as const,
    returns: FFIType.u64,
  },
  binja_lexer_token_type: {
    args: [FFIType.ptr, FFIType.u64] as const,
    returns: FFIType.u8,
  },
  binja_lexer_token_start: {
    args: [FFIType.ptr, FFIType.u64] as const,
    returns: FFIType.u32,
  },
  binja_lexer_token_end: {
    args: [FFIType.ptr, FFIType.u64] as const,
    returns: FFIType.u32,
  },
  binja_lexer_has_error: {
    args: [FFIType.ptr] as const,
    returns: FFIType.bool,
  },
  binja_lexer_error_code: {
    args: [FFIType.ptr] as const,
    returns: FFIType.u8,
  },
  binja_lexer_error_line: {
    args: [FFIType.ptr] as const,
    returns: FFIType.u32,
  },
  // Batch API - single FFI call for all tokens
  binja_lexer_get_tokens_buffer: {
    args: [FFIType.ptr] as const,
    returns: FFIType.ptr,
  },
  binja_lexer_tokens_buffer_size: {
    args: [FFIType.ptr] as const,
    returns: FFIType.u64,
  },
  binja_free_tokens_buffer: {
    args: [FFIType.ptr, FFIType.u64] as const,
    returns: FFIType.void,
  },
  binja_tokenize_count: {
    args: [FFIType.ptr, FFIType.u64] as const,
    returns: FFIType.u64,
  },
  binja_version: {
    args: [] as const,
    returns: FFIType.ptr,
  },
} as const

type LibType = ReturnType<typeof dlopen<typeof symbols>>

// ============================================================================
// Library Loading
// ============================================================================

let _lib: LibType | null = null
let _loadAttempted = false
let _nativeAvailable = false

function getLibraryPath(): string | null {
  const platform = process.platform
  const arch = process.arch

  const libExt = platform === 'darwin' ? 'dylib'
              : platform === 'win32' ? 'dll'
              : 'so'

  const libName = `libbinja.${libExt}`

  // Detect depth: when bundled into dist/index.js, we're 1 level deep
  // When in dist/native/index.js, we're 2 levels deep
  const dirName = basename(import.meta.dir)
  const projectRoot = dirName === 'native'
    ? join(import.meta.dir, '..', '..')  // dist/native/ → package root
    : join(import.meta.dir, '..')         // dist/ → package root

  // Search paths in order of priority
  const searchPaths = [
    // 1. Platform-specific prebuilt in project root
    join(projectRoot, 'native', `${platform}-${arch}`, libName),
    // 2. Generic prebuilt
    join(projectRoot, 'native', libName),
    // 3. Development path (zig-native/zig-out)
    join(projectRoot, 'zig-native', 'zig-out', 'lib', libName),
    // 4. Root zig-native
    join(projectRoot, 'zig-native', libName),
    // 5. Current dir (for standalone use)
    join(import.meta.dir, libName),
  ]

  for (const p of searchPaths) {
    if (existsSync(p)) {
      return p
    }
  }

  return null
}

function loadLibrary(): LibType | null {
  if (_loadAttempted) {
    return _lib
  }

  _loadAttempted = true

  const libPath = getLibraryPath()
  if (!libPath) {
    console.warn('[binja] Native library not found, using pure JS fallback')
    return null
  }

  try {
    _lib = dlopen(libPath, symbols)
    _nativeAvailable = true
    return _lib
  } catch (e) {
    console.warn(`[binja] Failed to load native library: ${e}`)
    return null
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if native Zig library is available
 */
export function isNativeAvailable(): boolean {
  loadLibrary()
  return _nativeAvailable
}

/**
 * Get native library version
 */
export function nativeVersion(): string | null {
  const lib = loadLibrary()
  if (!lib) return null

  const versionPtr = lib.symbols.binja_version()
  if (!versionPtr) return null
  return new CString(versionPtr).toString()
}

/**
 * Native Lexer - uses Zig FFI for maximum performance
 */
export class NativeLexer {
  private lexerPtr: any = 0  // Pointer from FFI
  private source: string
  private sourceBuffer: Uint8Array
  private lib: LibType
  private _tokenCount: number = 0
  private _isEmpty: boolean = false

  constructor(source: string) {
    const lib = loadLibrary()
    if (!lib) {
      throw new Error('Native library not available. Use isNativeAvailable() to check first.')
    }

    this.lib = lib
    this.source = source

    // Handle empty string edge case
    if (source.length === 0) {
      this._isEmpty = true
      this._tokenCount = 1 // Just EOF
      this.sourceBuffer = new Uint8Array(0)
      return
    }

    this.sourceBuffer = new TextEncoder().encode(source)

    const result = this.lib.symbols.binja_lexer_new(
      ptr(this.sourceBuffer),
      this.sourceBuffer.length
    )

    if (!result) {
      throw new Error('Failed to create native lexer')
    }

    this.lexerPtr = result
    this._tokenCount = Number(this.lib.symbols.binja_lexer_token_count(this.lexerPtr))
  }

  get tokenCount(): number {
    return this._tokenCount
  }

  getTokenType(index: number): number {
    if (this._isEmpty) return TokenType.EOF
    return Number(this.lib.symbols.binja_lexer_token_type(this.lexerPtr, index))
  }

  getTokenStart(index: number): number {
    if (this._isEmpty) return 0
    return Number(this.lib.symbols.binja_lexer_token_start(this.lexerPtr, index))
  }

  getTokenEnd(index: number): number {
    if (this._isEmpty) return 0
    return Number(this.lib.symbols.binja_lexer_token_end(this.lexerPtr, index))
  }

  hasError(): boolean {
    if (this._isEmpty) return false
    return Boolean(this.lib.symbols.binja_lexer_has_error(this.lexerPtr))
  }

  getErrorCode(): number {
    if (this._isEmpty) return 0
    return Number(this.lib.symbols.binja_lexer_error_code(this.lexerPtr))
  }

  getErrorLine(): number {
    if (this._isEmpty) return 1
    return Number(this.lib.symbols.binja_lexer_error_line(this.lexerPtr))
  }

  getTokenValue(index: number): string {
    if (this._isEmpty) return ''
    const start = this.getTokenStart(index)
    const end = this.getTokenEnd(index)
    // Use byte slicing on the UTF-8 buffer, then decode
    return new TextDecoder().decode(this.sourceBuffer.slice(start, end))
  }

  getToken(index: number): NativeToken {
    return {
      type: this.getTokenType(index),
      start: this.getTokenStart(index),
      end: this.getTokenEnd(index),
      value: this.getTokenValue(index),
    }
  }

  getAllTokens(): NativeToken[] {
    const tokens: NativeToken[] = []
    for (let i = 0; i < this._tokenCount; i++) {
      tokens.push(this.getToken(i))
    }
    return tokens
  }

  free(): void {
    if (this.lexerPtr) {
      this.lib.symbols.binja_lexer_free(this.lexerPtr)
      this.lexerPtr = null
    }
  }

  [Symbol.dispose](): void {
    this.free()
  }
}

/**
 * Quick tokenize - returns token count only (fastest)
 */
export function tokenizeCount(source: string): number {
  if (source.length === 0) {
    return 1 // Just EOF token
  }

  const lib = loadLibrary()
  if (!lib) {
    throw new Error('Native library not available')
  }

  const bytes = new TextEncoder().encode(source)
  return Number(lib.symbols.binja_tokenize_count(ptr(bytes), bytes.length))
}

/**
 * Tokenize with native lexer, auto-cleanup (OLD - per-token FFI calls)
 */
export function tokenize(source: string): NativeToken[] {
  const lexer = new NativeLexer(source)
  try {
    return lexer.getAllTokens()
  } finally {
    lexer.free()
  }
}

// Error code messages (must match LexerError enum in Zig)
const ERROR_MESSAGES: Record<number, string> = {
  1: 'Unterminated string',
  2: 'Unclosed template tag',
  3: 'Invalid operator',
  4: 'Unexpected character',
}

/**
 * Batch tokenize - single FFI call for all tokens (FAST)
 * Returns array of [type, start, end] tuples for maximum performance
 */
export function tokenizeBatch(source: string): Array<[number, number, number]> {
  if (source.length === 0) {
    return [[TokenType.EOF, 0, 0]]
  }

  const lib = loadLibrary()
  if (!lib) {
    throw new Error('Native library not available')
  }

  // Create lexer
  const sourceBuffer = new TextEncoder().encode(source)
  const lexerPtr = lib.symbols.binja_lexer_new(ptr(sourceBuffer), sourceBuffer.length)
  if (!lexerPtr) {
    throw new Error('Failed to create native lexer')
  }

  try {
    // Check for lexer errors
    if (lib.symbols.binja_lexer_has_error(lexerPtr)) {
      const errorCode = Number(lib.symbols.binja_lexer_error_code(lexerPtr))
      const errorLine = Number(lib.symbols.binja_lexer_error_line(lexerPtr))
      const message = ERROR_MESSAGES[errorCode] ?? 'Unknown error'
      throw new Error(`${message} at line ${errorLine}`)
    }

    // Get buffer with all tokens (single FFI call)
    const bufferSize = Number(lib.symbols.binja_lexer_tokens_buffer_size(lexerPtr))
    const bufferPtr = lib.symbols.binja_lexer_get_tokens_buffer(lexerPtr)
    if (!bufferPtr) {
      throw new Error('Failed to get tokens buffer')
    }

    try {
      // Read buffer as Uint8Array
      const buffer = new Uint8Array(toArrayBuffer(bufferPtr, 0, bufferSize))
      const view = new DataView(buffer.buffer)

      // Parse count (first 4 bytes, little-endian)
      const count = view.getUint32(0, true)
      const tokens: Array<[number, number, number]> = new Array(count)

      // Parse tokens (9 bytes each: u8 type + u32 start + u32 end)
      let offset = 4
      for (let i = 0; i < count; i++) {
        const type = buffer[offset]
        const start = view.getUint32(offset + 1, true)
        const end = view.getUint32(offset + 5, true)
        tokens[i] = [type, start, end]
        offset += 9
      }

      return tokens
    } finally {
      lib.symbols.binja_free_tokens_buffer(bufferPtr, bufferSize)
    }
  } finally {
    lib.symbols.binja_lexer_free(lexerPtr)
  }
}

/**
 * Batch tokenize with full token objects (includes value extraction)
 */
export function tokenizeBatchFull(source: string): NativeToken[] {
  const tuples = tokenizeBatch(source)
  return tuples.map(([type, start, end]) => ({
    type,
    start,
    end,
    value: source.slice(start, end),
  }))
}
