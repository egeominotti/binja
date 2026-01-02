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
│   │   └── tokens.ts     # Token types and interfaces
│   ├── parser/
│   │   ├── index.ts      # Parser - generates AST from tokens
│   │   └── nodes.ts      # AST node type definitions
│   ├── runtime/
│   │   ├── index.ts      # Runtime - executes AST (with inline filter optimization)
│   │   └── context.ts    # Context class with forloop/loop support
│   ├── compiler/
│   │   ├── index.ts      # AOT compiler - generates JS functions
│   │   └── flattener.ts  # Template flattener for AOT inheritance
│   ├── filters/
│   │   └── index.ts      # 80+ built-in filters
│   ├── tests/
│   │   └── index.ts      # 28 built-in tests (is operator)
│   ├── engines/          # Multi-engine support
│   │   ├── index.ts      # Unified MultiEngine API
│   │   ├── handlebars/   # Handlebars engine
│   │   │   ├── index.ts  # Entry point
│   │   │   ├── lexer.ts  # Handlebars tokenizer
│   │   │   └── parser.ts # Handlebars → common AST
│   │   └── liquid/       # Liquid (Shopify) engine
│   │       ├── index.ts  # Entry point
│   │       ├── lexer.ts  # Liquid tokenizer
│   │       └── parser.ts # Liquid → common AST
│   └── debug/
│       ├── index.ts      # Debug panel exports
│       ├── collector.ts  # DebugCollector for timing/context
│       └── panel.ts      # HTML panel generator
├── test/
│   ├── lexer.test.ts     # Lexer tests
│   ├── parser.test.ts    # Parser tests
│   ├── filters.test.ts   # Filter tests
│   ├── filters-extended.test.ts # Extended filters tests
│   ├── runtime.test.ts   # Runtime/core tags tests
│   ├── inheritance.test.ts # Template inheritance tests
│   ├── aot-inheritance.test.ts # AOT with extends/include tests
│   ├── raw.test.ts       # Raw/verbatim tag tests
│   ├── engines.test.ts   # Multi-engine tests (Handlebars, Liquid)
│   ├── debug.test.ts     # Debug panel tests
│   └── ...
├── examples/             # Usage examples
│   ├── 01-basic-usage.ts
│   ├── ...
│   ├── 07-complete-reference.ts  # All features reference
│   └── 09-multi-engine.ts # Multi-engine usage
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
Template String → Lexer → Tokens → Parser → AST → Runtime → Output String
```

1. **Lexer** (`src/lexer/`): Tokenizes template into tokens (TEXT, VAR_START, BLOCK_START, etc.)
   - Pure TypeScript implementation optimized for Bun
   - 2-4x faster than Nunjucks
2. **Parser** (`src/parser/`): Converts tokens into Abstract Syntax Tree (AST)
3. **Runtime** (`src/runtime/`): Executes AST with context to produce output
   - Inline filter optimization for ~70 common filters (10-15% faster)

### Performance

Binja is **2-4x faster** than Nunjucks in runtime mode:

| Benchmark | binja | Nunjucks | Speedup |
|-----------|-------|----------|---------|
| Simple Template | 371K ops/s | 96K ops/s | **3.9x** |
| Complex Template | 44K ops/s | 23K ops/s | **2.0x** |
| Nested Loops | 76K ops/s | 26K ops/s | **3.0x** |
| Conditionals | 84K ops/s | 25K ops/s | **3.4x** |
| HTML Escaping | 985K ops/s | 242K ops/s | **4.1x** |

### Key Classes

| Class | File | Purpose |
|-------|------|---------|
| `Environment` | `src/index.ts` | Main API, template loading, configuration, debug |
| `Lexer` | `src/lexer/index.ts` | Pure TypeScript lexer |
| `Parser` | `src/parser/index.ts` | Generates AST from tokens |
| `Runtime` | `src/runtime/index.ts` | Executes AST with inline filter optimization |
| `Context` | `src/runtime/context.ts` | Variable scope management |
| `Compiler` | `src/compiler/index.ts` | AOT compilation to JS functions |
| `TemplateFlattener` | `src/compiler/flattener.ts` | Resolves extends/include at compile-time |
| `DebugCollector` | `src/debug/collector.ts` | Collects timing and context data |
| `MultiEngine` | `src/engines/index.ts` | Unified API for multiple template engines |
| `HandlebarsLexer` | `src/engines/handlebars/lexer.ts` | Handlebars tokenizer |
| `HandlebarsParser` | `src/engines/handlebars/parser.ts` | Handlebars → common AST |
| `LiquidLexer` | `src/engines/liquid/lexer.ts` | Liquid tokenizer |
| `LiquidParser` | `src/engines/liquid/parser.ts` | Liquid → common AST |

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

### Multi-Engine Support

Binja supports multiple template engines through a unified API:

**Engines:**
- **Jinja2/DTL** - Default engine (full compatibility)
- **Handlebars** - `{{#if}}`, `{{#each}}`, `{{>partial}}`, `{{{unescaped}}}`
- **Liquid** - Shopify syntax: `{% if %}`, `{% for %}`, `{% assign %}`, `{% raw %}`

**Usage:**
```typescript
import { MultiEngine } from 'binja/engines'
import * as handlebars from 'binja/engines/handlebars'
import * as liquid from 'binja/engines/liquid'

// Direct engine use
await handlebars.render('Hello {{name}}!', { name: 'World' })
await liquid.render('Hello {{ name }}!', { name: 'World' })

// Unified API
const engine = new MultiEngine()
await engine.render(template, context, 'handlebars')
await engine.render(template, context, 'liquid')
await engine.render(template, context, 'jinja2') // default
```

**Architecture:** All engines parse to a common AST format, which is then executed by the shared binja runtime. This means all engines benefit from binja's optimizations and 84+ built-in filters.

### Built-in Tests (28)

Tests for the `is` operator: `defined`, `undefined`, `none`, `true`, `false`, `boolean`, `string`, `number`, `integer`, `float`, `iterable`, `sequence`, `mapping`, `callable`, `even`, `odd`, `divisibleby`, `sameas`, `eq`, `ne`, `lt`, `le`, `gt`, `ge`, `in`, `lower`, `upper`, `empty`

### Built-in Filters (80+)

**String**: `upper`, `lower`, `capitalize`, `title`, `trim`, `striptags`, `escape`, `safe`, `slugify`, `truncatechars`, `truncatewords`, `wordcount`, `center`, `ljust`, `rjust`, `cut`, `linebreaks`, `linebreaksbr`, `wordwrap`, `indent`, `replace`, `format`, `string`, `addslashes`, `stringformat`

**Number**: `abs`, `round`, `int`, `float`, `floatformat`, `add`, `divisibleby`, `filesizeformat`, `phone2numeric`, `get_digit`

**List/Array**: `length`, `first`, `last`, `join`, `slice`, `reverse`, `sort`, `unique`, `batch`, `dictsort`, `random`, `list`, `map`, `select`, `reject`, `selectattr`, `rejectattr`, `attr`, `max`, `min`, `sum`, `safeseq`

**Date/Time**: `date`, `time`, `timesince`, `timeuntil`

**Default**: `default`, `default_if_none`, `yesno`, `pluralize`

**URL**: `urlencode`, `urlize`, `iriencode`, `urlizetrunc`

**JSON/Debug**: `json`, `pprint`, `linenumbers`, `unordered_list`, `json_script`

**Safety**: `escape`, `forceescape`, `safe`

**HTML-aware**: `truncatechars_html`, `truncatewords_html`

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

For performance, also add inline version in `src/runtime/index.ts` in `evalFilter()`.

### Adding a New Tag

1. Add token type in `src/lexer/tokens.ts` if needed
2. Add AST node type in `src/parser/nodes.ts`
3. Add parsing logic in `src/parser/index.ts`
4. Add execution logic in `src/runtime/index.ts`

### Adding a New Template Engine

1. Create directory `src/engines/{engine}/`
2. Create lexer `lexer.ts` that tokenizes the engine's syntax
3. Create parser `parser.ts` that converts tokens to binja's common AST format
4. Create entry point `index.ts` with `parse()`, `compile()`, `render()` functions
5. Register engine in `src/engines/index.ts`
6. Add tests in `test/engines.test.ts`

Key AST node types to map:
- `Template`, `Text`, `Output` - basic structure
- `If` (with `test`, `body`, `elifs`, `else_`) - conditionals
- `For` (with `target`, `iter`, `body`, `else_`) - loops
- `Set` (with `target`, `value`) - variable assignment
- `GetAttr` (with `object`, `attribute`) - property access
- `GetItem` (with `object`, `index`) - array/dict access
- `FilterExpr` (with `node`, `filter`, `args`) - filters
- `Compare` (with `left`, `ops: [{ operator, right }]`) - comparisons

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

### Inline Filter Optimization

The runtime has inline implementations for ~70 common filters to avoid dictionary lookup and function call overhead. This provides 10-15% speedup on filter-heavy templates.

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

## Publishing to npm

### Release Process

1. **Bump version** in `package.json`:
   ```bash
   bun run version:patch   # 0.4.1 -> 0.4.2
   bun run version:minor   # 0.4.1 -> 0.5.0
   bun run version:major   # 0.4.1 -> 1.0.0
   ```

2. **Build**:
   ```bash
   bun run build
   ```

3. **Run tests**:
   ```bash
   bun test
   ```

4. **Commit and push**:
   ```bash
   git add -A
   git commit -m "release: v0.x.x"
   git push origin main
   ```

5. **Publish to npm**:
   ```bash
   npm publish
   ```

### Build Scripts

| Script | Description |
|--------|-------------|
| `build` | Build JS (index, cli, debug modules) + types |
| `build:types` | Generate TypeScript declarations |

### Package Structure

The published package includes:
- `dist/` - Compiled JavaScript and TypeScript declarations
- `dist/debug/index.js` - Debug panel (subpath export)

### Subpath Exports

```typescript
import { render } from 'binja'           // Main API
import { DebugCollector } from 'binja/debug'      // Debug tools
```

## GitHub

- **Repository**: binja
- **Description**: High-performance Jinja2/Django Template Language engine for Bun. 2-4x faster than Nunjucks. 100% DTL compatible.
- **Topics**: `jinja2`, `django`, `template-engine`, `bun`, `typescript`, `dtl`, `django-templates`
