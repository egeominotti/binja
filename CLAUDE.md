# CLAUDE.md - binja

This file provides guidance to Claude Code when working with the binja template engine.

## Project Overview

**binja** is a high-performance Jinja2/Django Template Language (DTL) engine for Bun/JavaScript. It provides 100% compatibility with Django templates while running on the Bun runtime for maximum performance.

## Quick Commands

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run specific test file
bun test test/filters.test.ts

# Build
bun run build

# Type check
bun run typecheck
```

## Project Structure

```
binja/
├── src/
│   ├── index.ts          # Main entry point, Environment class
│   ├── cli.ts            # CLI tool (binja compile/check/watch)
│   ├── lexer/
│   │   ├── index.ts      # Lexer - tokenizes template strings
│   │   ├── hybrid.ts     # Hybrid lexer (native Zig + JS fallback)
│   │   └── tokens.ts     # Token types and interfaces
│   ├── parser/
│   │   ├── index.ts      # Parser - generates AST from tokens
│   │   └── nodes.ts      # AST node type definitions
│   ├── runtime/
│   │   ├── index.ts      # Runtime - executes AST
│   │   └── context.ts    # Context class with forloop/loop support
│   ├── compiler/
│   │   ├── index.ts      # AOT compiler - generates JS functions
│   │   └── flattener.ts  # Template flattener for AOT inheritance
│   ├── filters/
│   │   └── index.ts      # 70+ built-in filters
│   ├── tests/
│   │   └── index.ts      # 28 built-in tests (is operator)
│   ├── native/
│   │   └── index.ts      # Zig FFI bindings with fallback
│   └── debug/
│       ├── index.ts      # Debug panel exports
│       ├── collector.ts  # DebugCollector for timing/context
│       └── panel.ts      # HTML panel generator
├── zig-native/           # Native Zig lexer source
│   ├── src/
│   │   ├── lexer.zig     # High-performance Zig lexer
│   │   └── lib.zig       # FFI exports
│   └── build.zig         # Zig build configuration
├── native/               # Prebuilt binaries (per-platform)
│   ├── darwin-arm64/     # macOS Apple Silicon
│   ├── darwin-x64/       # macOS Intel
│   ├── linux-x64/        # Linux x64
│   └── linux-arm64/      # Linux ARM64
├── test/
│   ├── lexer.test.ts     # Lexer tests
│   ├── parser.test.ts    # Parser tests
│   ├── filters.test.ts   # Filter tests
│   ├── filters-extended.test.ts # Extended filters tests
│   ├── runtime.test.ts   # Runtime/core tags tests
│   ├── inheritance.test.ts # Template inheritance tests
│   ├── aot-inheritance.test.ts # AOT with extends/include tests
│   ├── raw.test.ts       # Raw/verbatim tag tests
│   ├── native.test.ts    # Native Zig lexer tests
│   ├── debug.test.ts     # Debug panel tests
│   └── ...
├── examples/             # Usage examples
│   ├── 01-basic-usage.ts
│   ├── ...
│   └── 07-complete-reference.ts  # All features reference
├── website/              # Demo website with debug panel
│   ├── server.ts         # Hono server
│   └── templates/        # Demo templates
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

## Architecture

### Template Processing Pipeline

```
Template String → Lexer (Zig/JS) → Tokens → Parser → AST → Runtime → Output String
```

1. **Lexer** (`src/lexer/`): Tokenizes template into tokens (TEXT, VAR_START, BLOCK_START, etc.)
   - Uses native Zig lexer when available (3-5x faster)
   - Automatically falls back to pure TypeScript implementation
2. **Parser** (`src/parser/`): Converts tokens into Abstract Syntax Tree (AST)
3. **Runtime** (`src/runtime/`): Executes AST with context to produce output

### Native Zig Acceleration

The lexer has a native Zig implementation for maximum performance:

```typescript
import { isNativeAvailable, nativeVersion } from 'binja/native'

// Check if native acceleration is active
if (isNativeAvailable()) {
  console.log(`Using native Zig lexer: ${nativeVersion()}`)
}
```

**Platform Support:**
| Platform | Architecture | Status |
|----------|-------------|--------|
| macOS | Apple Silicon (arm64) | ✅ |
| macOS | Intel (x64) | ✅ |
| Linux | x64 | ✅ |
| Linux | arm64 | ✅ |
| Windows | x64 | 🔜 |

**Performance Comparison:**
| Operation | TypeScript | Native Zig | Speedup |
|-----------|-----------|------------|---------|
| Simple template | 0.15ms | 0.04ms | 3.7x |
| Complex template | 2.1ms | 0.42ms | 5x |
| Large template | 8.5ms | 1.7ms | 5x |

### Key Classes

| Class | File | Purpose |
|-------|------|---------|
| `Environment` | `src/index.ts` | Main API, template loading, configuration, debug |
| `HybridLexer` | `src/lexer/hybrid.ts` | Auto-selects native or JS lexer |
| `NativeLexer` | `src/native/index.ts` | Zig FFI bindings |
| `Lexer` | `src/lexer/index.ts` | Pure TypeScript lexer (fallback) |
| `Parser` | `src/parser/index.ts` | Generates AST from tokens |
| `Runtime` | `src/runtime/index.ts` | Executes AST |
| `Context` | `src/runtime/context.ts` | Variable scope management |
| `Compiler` | `src/compiler/index.ts` | AOT compilation to JS functions |
| `TemplateFlattener` | `src/compiler/flattener.ts` | Resolves extends/include at compile-time |
| `DebugCollector` | `src/debug/collector.ts` | Collects timing and context data |

## Supported Features

### Django Template Language (DTL) Compatibility

- `{% if %}`, `{% elif %}`, `{% else %}`, `{% endif %}`
- `{% for %}`, `{% empty %}`, `{% endfor %}`
- `{% block %}`, `{% endblock %}`
- `{% extends %}`, `{% include %}`
- `{% with %}`, `{% endwith %}`
- `{% load %}` (no-op for compatibility)
- `{% url %}`, `{% static %}`
- `{% verbatim %}` (raw output)
- `{{ variable|filter:arg }}`
- `forloop.counter`, `forloop.counter0`, `forloop.first`, `forloop.last`, `forloop.parentloop`

### Jinja2 Compatibility

- `{% set x = value %}`
- `{% raw %}` (raw output)
- `{{ value if condition else default }}`
- `{{ "a" ~ "b" }}` (string concatenation)
- `loop.index`, `loop.index0`, `loop.first`, `loop.last`
- Filter with parentheses: `{{ name|truncate(30) }}`

### AOT Compilation

- `compile()` - 160x faster than Nunjucks
- `compileWithInheritance()` - AOT with extends/include support
- `compileToCode()` - Generate JS code strings for build tools

### Debug Panel

- `debug: true` in Environment options enables automatic panel injection
- Shows timing (lexer, parser, render), context variables, filters used
- Expandable tree view for context objects
- Dark/light mode, draggable, collapsible sections

### Built-in Tests (28)

Tests for the `is` operator: `defined`, `undefined`, `none`, `true`, `false`, `boolean`, `string`, `number`, `integer`, `float`, `iterable`, `sequence`, `mapping`, `callable`, `even`, `odd`, `divisibleby`, `sameas`, `eq`, `ne`, `lt`, `le`, `gt`, `ge`, `in`, `lower`, `upper`, `empty`

### Built-in Filters (70+)

**String**: `upper`, `lower`, `capitalize`, `title`, `trim`, `striptags`, `escape`, `safe`, `slugify`, `truncatechars`, `truncatewords`, `wordcount`, `center`, `ljust`, `rjust`, `cut`, `linebreaks`, `linebreaksbr`, `wordwrap`, `indent`, `replace`, `format`, `string`

**Number**: `abs`, `round`, `int`, `float`, `floatformat`, `add`, `divisibleby`, `filesizeformat`, `phone2numeric`

**List/Array**: `length`, `first`, `last`, `join`, `slice`, `reverse`, `sort`, `unique`, `batch`, `dictsort`, `random`, `list`, `map`, `select`, `reject`, `selectattr`, `rejectattr`, `attr`, `max`, `min`, `sum`

**Date/Time**: `date`, `time`, `timesince`, `timeuntil`

**Default**: `default`, `default_if_none`, `yesno`, `pluralize`

**URL**: `urlencode`, `urlize`

**JSON/Debug**: `json`, `pprint`, `linenumbers`, `unordered_list`

**Safety**: `escape`, `forceescape`, `safe`

## Code Patterns

### Adding a New Filter

In `src/filters/index.ts`:

```typescript
export const builtinFilters: Record<string, FilterFunction> = {
  // ... existing filters

  myfilter: (value: any, arg?: any): any => {
    // Filter logic
    return result
  },
}
```

### Adding a New Tag

1. Add token type in `src/lexer/tokens.ts` if needed
2. Add AST node type in `src/parser/nodes.ts`
3. Add parsing logic in `src/parser/index.ts`
4. Add execution logic in `src/runtime/index.ts`

### Test Pattern

```typescript
import { describe, test, expect } from 'bun:test'
import { render, Environment } from '../src'

describe('Feature Name', () => {
  test('description', async () => {
    const result = await render('{{ value|filter }}', { value: 'test' })
    expect(result).toBe('expected')
  })
})
```

## Important Implementation Details

### Autoescape

- Enabled by default (like Django)
- Use `|safe` to bypass escaping
- HTML entities escaped: `<`, `>`, `&`, `"`, `'`

### forloop vs loop

Both are supported for DTL/Jinja2 compatibility:
- `forloop.counter` (DTL) = `loop.index` (Jinja2) - 1-indexed
- `forloop.counter0` (DTL) = `loop.index0` (Jinja2) - 0-indexed

### Array Index Access

Supports both styles:
- DTL style: `{{ items.0 }}` (dot notation with number)
- Jinja2 style: `{{ items[0] }}` (bracket notation)

## Testing Guidelines

1. All tests use Bun's test runner: `import { describe, test, expect } from 'bun:test'`
2. Tests should be async since `render()` returns Promise
3. Test file naming: `{feature}.test.ts`
4. Replicate Jinja2's Python test structure where applicable

## Common Issues

### Token Export Error
Use `export type { Token }` instead of `export { Token }` for type-only exports.

### Double Escaping
Filters returning HTML must return a `Markup` object or use `|safe`.

### Array Index in Parser
The parser accepts NUMBER after DOT for DTL-style array access (`items.0`).

## Building Native Library

To build the Zig native library from source:

```bash
cd zig-native
zig build -Doptimize=ReleaseFast
```

The library will be output to `zig-native/zig-out/lib/libbinja.{dylib,so,dll}`.

For cross-compilation:
```bash
# macOS ARM64
zig build -Doptimize=ReleaseFast -Dtarget=aarch64-macos

# macOS x64
zig build -Doptimize=ReleaseFast -Dtarget=x86_64-macos

# Linux x64
zig build -Doptimize=ReleaseFast -Dtarget=x86_64-linux

# Linux ARM64
zig build -Doptimize=ReleaseFast -Dtarget=aarch64-linux
```

## GitHub

- **Repository**: jinja-bun
- **Description**: High-performance Jinja2/Django Template Language engine for Bun. 100% DTL compatible. Native Zig acceleration.
- **Topics**: `jinja2`, `django`, `template-engine`, `bun`, `typescript`, `dtl`, `django-templates`, `zig`
