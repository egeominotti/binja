---
title: compile()
description: API reference for synchronous AOT functions and static inheritance compilation.
---

## `compile(source, options?)`

```ts
function compile(
  source: string,
  options?: CompileOptions
): (context: Record<string, any>) => string
```

```ts
interface CompileOptions {
  functionName?: string
  minify?: boolean
  autoescape?: boolean
}
```

```ts
import { compile } from 'binja'

const renderCard = compile('<h2>{{ title|upper }}</h2>', {
  autoescape: true,
})

const html = renderCard({ title: 'Status' })
```

The render function is synchronous. Context name and property resolution uses the same protected lookup rules as runtime mode.

## `compileWithInheritance(name, options)`

```ts
function compileWithInheritance(
  templateName: string,
  options: CompileOptions & {
    templates: string
    extensions?: string[]
  }
): Promise<(context: Record<string, any>) => string>
```

Static `extends` and `include` targets are loaded and flattened at compile time. Dynamic targets, missing templates, cycles/depth violations, and paths outside the configured root are rejected.

## Code-source APIs

```ts
compileToCode(source, options?): string
compileWithInheritanceToCode(name, options): Promise<string>
```

These functions return the generated render-function source, not a complete standalone module. The surrounding integration must provide the helper contract used by generated expressions and output. Use `binja compile` when you want an importable ESM file.

## Supported and unsupported nodes

| Feature | Plain `compile()` |
|---|---|
| Variables and protected property/item reads | Yes |
| Built-in filters/tests | Yes |
| Conditions, loops, `set`, `with` | Yes |
| `autoescape`, `spaceless`, raw/comments | Yes |
| Custom `Environment` filter registry | No |
| `extends` / `include` | Use `compileWithInheritance()` for static names |
| Dynamic template names | No; use `Environment` |
| URL/static resolver tags | No; use `Environment` |

Unsupported syntax fails at compilation instead of being silently removed.

## Errors

Parser errors include source location and a snippet where available. Invalid generated function names throw `TypeError`. Unknown built-in filters/tests or unsupported nodes throw before or during function construction.

## See also

- [AOT guide](/binja/guide/aot/)
- [`Environment`](/binja/api/environment/)
- [CLI](/binja/guide/cli/)
