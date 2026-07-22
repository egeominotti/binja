---
title: TypeScript Types
description: Public Binja configuration, compiler, cache, AST, and error types.
---

Binja ships declarations with every documented package subpath. The installed `dist/*.d.ts` files are authoritative for the exact release.

## Core configuration

```ts
type FilterFunction = (value: any, ...args: any[]) => any

interface EnvironmentOptions {
  templates?: string
  autoescape?: boolean
  filters?: Record<string, FilterFunction>
  globals?: Record<string, any>
  urlResolver?: (name: string, args: any[], kwargs: Record<string, any>) => string
  staticResolver?: (path: string) => string
  cache?: boolean
  cacheMaxSize?: number
  extensions?: string[]
  debug?: boolean
  debugOptions?: PanelOptions
  timezone?: string
}

interface CacheStats {
  size: number
  maxSize: number
  hits: number
  misses: number
  hitRate: number
}
```

`hitRate` is a percentage, not a 0–1 ratio.

## AOT

```ts
interface CompileOptions {
  functionName?: string
  minify?: boolean
  autoescape?: boolean
}

interface CompileWithInheritanceOptions extends CompileOptions {
  templates: string
  extensions?: string[]
}

type CompiledTemplate = (context: Record<string, any>) => string
```

The legacy `inlineHelpers` option remains type-compatible but is reserved; code-source APIs return a helper-dependent fragment. Use the CLI for complete ESM generation.

## Parser and errors

```ts
interface BaseNode {
  type: string
  line: number
  column: number
}

interface TemplateNode extends BaseNode {
  type: 'Template'
  body: ASTNode[]
}
```

AST node fields use `line` and `column` (not Python AST names such as `lineno`). Public error exports include:

```ts
TemplateError
TemplateSyntaxError
TemplateRuntimeError
TemplateNotFoundError
```

`TemplateNotFoundError` carries the requested template name and allows `ignore missing` to distinguish absence from errors in an existing template.

## Debug types

`binja/debug` exports `DebugData`, `ContextValue`, `QueryInfo`, `QueryStats`, and `PanelOptions`. Debug data includes timings, template chain, context snapshot, filter/test counts, cache counters, queries, and warnings.

## Secondary-engine types

`binja/engines` exports `TemplateEngine`, `MultiEngine`, engine lookup helpers, and named modules. Each engine's `compile()` returns:

```ts
(context: Record<string, any>) => Promise<string>
```

This is a parsed-runtime cache, not the synchronous core AOT type.

## Type imports

```ts
import type {
  ASTNode,
  CacheStats,
  CompileOptions,
  EnvironmentOptions,
  ExpressionNode,
  FilterFunction,
  TemplateNode,
  Token,
} from 'binja'

import type { TemplateEngine } from 'binja/engines'
import type { DebugData, PanelOptions } from 'binja/debug'
```
