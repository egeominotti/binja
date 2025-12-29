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
packages/jinja-bun/
├── src/
│   ├── index.ts          # Main entry point, Environment class
│   ├── lexer/
│   │   ├── index.ts      # Lexer - tokenizes template strings
│   │   └── tokens.ts     # Token types and interfaces
│   ├── parser/
│   │   ├── index.ts      # Parser - generates AST from tokens
│   │   └── nodes.ts      # AST node type definitions
│   ├── runtime/
│   │   ├── index.ts      # Runtime - executes AST
│   │   └── context.ts    # Context class with forloop/loop support
│   └── filters/
│       └── index.ts      # 50+ built-in filters
├── test/
│   ├── lexer.test.ts     # Lexer tests
│   ├── parser.test.ts    # Parser tests
│   ├── filters.test.ts   # Filter tests
│   ├── runtime.test.ts   # Runtime/core tags tests
│   ├── inheritance.test.ts # Template inheritance tests
│   ├── api.test.ts       # API tests
│   ├── security.test.ts  # Security/XSS tests
│   ├── autoescape.test.ts # Autoescape tests
│   ├── whitespace.test.ts # Whitespace control tests
│   └── regression.test.ts # Edge cases
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
2. **Parser** (`src/parser/`): Converts tokens into Abstract Syntax Tree (AST)
3. **Runtime** (`src/runtime/`): Executes AST with context to produce output

### Key Classes

| Class | File | Purpose |
|-------|------|---------|
| `Environment` | `src/index.ts` | Main API, template loading, configuration |
| `Lexer` | `src/lexer/index.ts` | Tokenizes template strings |
| `Parser` | `src/parser/index.ts` | Generates AST from tokens |
| `Runtime` | `src/runtime/index.ts` | Executes AST |
| `Context` | `src/runtime/context.ts` | Variable scope management |

## Supported Features

### Django Template Language (DTL) Compatibility

- `{% if %}`, `{% elif %}`, `{% else %}`, `{% endif %}`
- `{% for %}`, `{% empty %}`, `{% endfor %}`
- `{% block %}`, `{% endblock %}`
- `{% extends %}`, `{% include %}`
- `{% with %}`, `{% endwith %}`
- `{% load %}` (no-op for compatibility)
- `{% url %}`, `{% static %}`
- `{{ variable|filter:arg }}`
- `forloop.counter`, `forloop.counter0`, `forloop.first`, `forloop.last`, `forloop.parentloop`

### Jinja2 Compatibility

- `{% set x = value %}`
- `{{ value if condition else default }}`
- `{{ "a" ~ "b" }}` (string concatenation)
- `loop.index`, `loop.index0`, `loop.first`, `loop.last`
- Filter with parentheses: `{{ name|truncate(30) }}`

### Built-in Filters (50+)

**String**: `upper`, `lower`, `capitalize`, `title`, `trim`, `striptags`, `escape`, `safe`, `slugify`, `truncatechars`, `truncatewords`, `wordcount`, `center`, `ljust`, `rjust`, `cut`, `linebreaks`, `linebreaksbr`

**Number**: `abs`, `round`, `int`, `float`, `floatformat`, `add`, `divisibleby`, `filesizeformat`

**List/Array**: `length`, `first`, `last`, `join`, `slice`, `reverse`, `sort`, `unique`, `batch`, `dictsort`, `random`

**Date/Time**: `date`, `time`, `timesince`, `timeuntil`

**Default**: `default`, `default_if_none`, `yesno`, `pluralize`

**URL**: `urlencode`, `urlize`

**JSON**: `json`

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

## GitHub

- **Repository**: jinja-bun
- **Description**: High-performance Jinja2/Django Template Language engine for Bun. 100% DTL compatible.
- **Topics**: `jinja2`, `django`, `template-engine`, `bun`, `typescript`, `dtl`, `django-templates`
