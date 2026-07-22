---
title: Environment
description: Loader-backed rendering, caching, registries, resolvers, timezone, and debug configuration.
---

`Environment` owns configuration, a protected file loader, a runtime instance, and an optional LRU AST cache.

## Constructor

```ts
import { Environment } from 'binja'

const env = new Environment(options)
```

```ts
interface EnvironmentOptions {
  templates?: string
  extensions?: string[]
  autoescape?: boolean
  filters?: Record<string, FilterFunction>
  globals?: Record<string, any>
  urlResolver?: (name: string, args: any[], kwargs: Record<string, any>) => string
  staticResolver?: (path: string) => string
  cache?: boolean
  cacheMaxSize?: number
  debug?: boolean
  debugOptions?: PanelOptions
  timezone?: string
}
```

Defaults are `templates: './templates'`, extensions `['.html', '.jinja', '.jinja2', '']`, autoescape/cache enabled, cache size 100, and debug disabled. `cacheMaxSize` must be a positive integer.

## Rendering

```ts
const html = await env.render('pages/home.html', context)
const fragment = await env.renderString('Hello {{ name }}', { name: 'Ada' })
```

`render()` searches the configured extensions and rejects paths outside `templates`, including symlink escapes. Includes and inheritance use the same loader.

## Registry and resolver methods

```ts
env.addFilter('currency', (value: number) => `€${value.toFixed(2)}`)
env.addGlobal('siteName', 'Example')

env.addUrl('home', '/')
env.addUrl('user-detail', '/users/:id')
env.addUrls({ settings: '/settings', logout: '/logout' })
```

Custom filters and globals added through these methods affect subsequent renders. The default URL resolver replaces registered positional/named placeholders and URL-encodes values. A missing route returns `#<name>` and emits a warning.

## Template compilation/cache

```ts
const ast = env.compile('{{ value }}')
await env.loadTemplate('base.html')

env.cacheSize()
env.cacheKeys()
env.cacheStats()
env.clearCache()
```

`compile()` here means source-to-AST, not AOT JavaScript generation. `loadTemplate()` reads and compiles a file, warming the cache when enabled.

```ts
interface CacheStats {
  size: number
  maxSize: number
  hits: number
  misses: number
  hitRate: number // percentage from 0 to 100
}
```

`clearCache()` also resets hit/miss counters.
`cacheKeys()` returns cached template names from least to most recently used.

## Full example

```ts
const env = new Environment({
  templates: './views',
  extensions: ['.html', ''],
  autoescape: true,
  cache: true,
  cacheMaxSize: 200,
  timezone: 'Europe/Rome',
  globals: { siteName: 'Example' },
  filters: { currency: (value: number) => `€${value.toFixed(2)}` },
  staticResolver: (path) => `/assets/${path}`,
  urlResolver: (name, args, kwargs) => route(name, args, kwargs),
  debug: Bun.env.NODE_ENV !== 'production',
})
```

Render-local block, loop, cycle, include, autoescape, and counter state is isolated across concurrent renders even when the same environment is reused.
