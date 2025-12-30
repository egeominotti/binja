# Binja Native (Zig + FFI)

High-performance template engine written in Zig, callable from Bun via FFI.

## Build

```bash
cd zig-native
zig build -Doptimize=ReleaseFast
```

This creates `zig-out/bin/binja` (executable with exported symbols).

For a proper shared library (.dylib/.so), you may need to adjust the build or use:

```bash
zig build-lib -dynamic -OReleaseFast src/lib.zig -femit-bin=libbinja.dylib
```

## Usage

```typescript
import { NativeLexer, tokenizeCount, render } from './ffi'

// Tokenize
const lexer = new NativeLexer('Hello {{ name }}!')
console.log('Tokens:', lexer.tokenCount)
lexer.free()

// Quick count (for benchmarks)
const count = tokenizeCount('{{ x }}')

// Render (TODO: full implementation)
const html = render('<h1>{{ title }}</h1>', { title: 'Hello' })
```

## Structure

```
zig-native/
├── build.zig          # Build configuration
├── ffi.ts             # Bun FFI bindings
├── src/
│   ├── lib.zig        # Main library exports
│   ├── lexer.zig      # Tokenizer
│   ├── parser.zig     # AST parser
│   └── runtime.zig    # Template renderer
```

## Performance

Expected speedup vs JS:
- **Lexer**: 10-20x faster
- **Full pipeline**: 5-10x faster
- **FFI overhead**: minimal (direct function calls)
