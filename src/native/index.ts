/**
 * Binja Native - Zig FFI bindings with fallback to pure JS
 *
 * Automatically uses native Zig lexer when available,
 * falls back to pure TypeScript implementation otherwise.
 */
import { dlopen, FFIType, ptr, CString } from 'bun:ffi'
import { join, dirname } from 'path'
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

  // Project root (2 levels up from src/native)
  const projectRoot = join(import.meta.dir, '..', '..')

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
  private lexerPtr: number = 0
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

    this.lexerPtr = Number(result)
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
    if (this.lexerPtr !== 0) {
      this.lib.symbols.binja_lexer_free(this.lexerPtr)
      this.lexerPtr = 0
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
 * Tokenize with native lexer, auto-cleanup
 */
export function tokenize(source: string): NativeToken[] {
  const lexer = new NativeLexer(source)
  try {
    return lexer.getAllTokens()
  } finally {
    lexer.free()
  }
}
