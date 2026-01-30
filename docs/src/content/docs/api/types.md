---
title: TypeScript Types
description: Type definitions for binja
---

binja is written in TypeScript and includes full type definitions.

## Core Types

### EnvironmentOptions

```typescript
interface EnvironmentOptions {
  /** Template directory path */
  templates?: string

  /** Enable HTML auto-escaping (default: true) */
  autoescape?: boolean

  /** Enable template caching (default: true) */
  cache?: boolean

  /** Maximum cached templates (default: 100) */
  cacheMaxSize?: number

  /** Timezone for date operations (e.g., 'Europe/Rome') */
  timezone?: string

  /** Custom filter functions */
  filters?: Record<string, FilterFunction>

  /** Global variables for all templates */
  globals?: Record<string, any>

  /** URL resolver for {% url %} tag */
  urlResolver?: UrlResolver

  /** Static file resolver for {% static %} tag */
  staticResolver?: StaticResolver

  /** Enable debug panel */
  debug?: boolean

  /** Debug panel configuration */
  debugOptions?: DebugOptions
}
```

### FilterFunction

```typescript
type FilterFunction = (value: any, ...args: any[]) => any
```

### UrlResolver

```typescript
type UrlResolver = (name: string, ...args: any[]) => string
```

### StaticResolver

```typescript
type StaticResolver = (path: string) => string
```

### DebugOptions

```typescript
interface DebugOptions {
  /** Use dark theme */
  dark?: boolean

  /** Start panel collapsed */
  collapsed?: boolean

  /** Panel position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

  /** Panel width in pixels */
  width?: number
}
```

## Compile Types

### CompileOptions

```typescript
interface CompileOptions {
  /** Enable HTML auto-escaping (default: true) */
  autoescape?: boolean

  /** Custom filter functions */
  filters?: Record<string, FilterFunction>
}
```

### CompileToCodeOptions

```typescript
interface CompileToCodeOptions {
  /** Generated function name (default: 'render') */
  functionName?: string

  /** Enable HTML auto-escaping (default: true) */
  autoescape?: boolean
}
```

### CompiledTemplate

```typescript
type CompiledTemplate = (context: Record<string, any>) => string
```

## Render Types

### RenderOptions

```typescript
interface RenderOptions {
  /** Enable HTML auto-escaping (default: true) */
  autoescape?: boolean

  /** Custom filter functions */
  filters?: Record<string, FilterFunction>

  /** Global variables */
  globals?: Record<string, any>
}
```

## Cache Types

### CacheStats

```typescript
interface CacheStats {
  /** Current number of cached templates */
  size: number

  /** Maximum cache size */
  maxSize: number

  /** Cache hits */
  hits: number

  /** Cache misses */
  misses: number

  /** Hit rate (0-1) */
  hitRate: number
}
```

## AI Linting Types

### LintOptions

```typescript
interface LintOptions {
  /** AI provider */
  provider?: 'anthropic' | 'openai' | 'groq' | 'ollama'

  /** API key (defaults to environment variable) */
  apiKey?: string

  /** Model to use */
  model?: string

  /** Categories to check */
  checks?: ('security' | 'performance' | 'accessibility' | 'best-practice')[]

  /** Rules to ignore */
  ignore?: string[]

  /** Minimum severity to report */
  minSeverity?: 'error' | 'warning' | 'info'
}
```

### LintResult

```typescript
interface LintResult {
  /** Template is valid (no syntax errors) */
  valid: boolean

  /** Syntax errors */
  errors: Issue[]

  /** Warnings (security, performance, etc.) */
  warnings: Issue[]

  /** Best practice suggestions */
  suggestions: Issue[]

  /** AI provider used */
  provider: string
}
```

### Issue

```typescript
interface Issue {
  /** Line number (1-indexed) */
  line: number

  /** Column number (optional) */
  column?: number

  /** Issue category */
  type: 'security' | 'performance' | 'accessibility' | 'best-practice' | 'syntax'

  /** Severity level */
  severity: 'error' | 'warning' | 'info'

  /** Human-readable message */
  message: string

  /** Suggested fix (optional) */
  fix?: string
}
```

## AST Types

### Node

Base type for all AST nodes:

```typescript
interface Node {
  type: string
  lineno?: number
  col_offset?: number
}
```

### Common Node Types

```typescript
interface Template extends Node {
  type: 'Template'
  body: Node[]
}

interface Output extends Node {
  type: 'Output'
  node: Node
}

interface If extends Node {
  type: 'If'
  test: Node
  body: Node[]
  elifs: { test: Node; body: Node[] }[]
  else_: Node[] | null
}

interface For extends Node {
  type: 'For'
  target: Node
  iter: Node
  body: Node[]
  else_: Node[] | null
}

interface Block extends Node {
  type: 'Block'
  name: string
  body: Node[]
}

interface Extends extends Node {
  type: 'Extends'
  template: string
}

interface Include extends Node {
  type: 'Include'
  template: string
  context: Record<string, Node> | null
}
```

## Importing Types

```typescript
import type {
  EnvironmentOptions,
  FilterFunction,
  CompileOptions,
  RenderOptions,
  CacheStats,
  LintResult,
  Issue,
} from 'binja'
```
