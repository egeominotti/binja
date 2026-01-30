---
title: Environment
description: API reference for the Environment class
---

The `Environment` class provides a full-featured template environment with file loading, caching, inheritance support, and configuration.

## Constructor

```typescript
const env = new Environment(options?: EnvironmentOptions)
```

## Options

```typescript
interface EnvironmentOptions {
  // Template directory
  templates?: string

  // Auto-escape HTML (default: true)
  autoescape?: boolean

  // Enable template caching (default: true)
  cache?: boolean

  // LRU cache limit (default: 100)
  cacheMaxSize?: number

  // Timezone for date/time operations
  timezone?: string

  // Custom filters
  filters?: Record<string, FilterFunction>

  // Global variables available in all templates
  globals?: Record<string, any>

  // URL resolver for {% url %} tag
  urlResolver?: (name: string, ...args: any[]) => string

  // Static file resolver for {% static %} tag
  staticResolver?: (path: string) => string

  // Enable debug panel
  debug?: boolean

  // Debug panel options
  debugOptions?: DebugOptions
}
```

## Basic Usage

```typescript
import { Environment } from 'binja'

const env = new Environment({
  templates: './views',
  autoescape: true,
})

// Render a template file
const html = await env.render('pages/home.html', {
  title: 'Welcome',
  user: { name: 'John' }
})
```

## Methods

### render(name, context)

Render a template file.

```typescript
const html = await env.render('pages/home.html', {
  title: 'Home',
  items: ['Apple', 'Banana']
})
```

### renderString(template, context)

Render a template string.

```typescript
const html = await env.renderString('Hello, {{ name }}!', {
  name: 'World'
})
```

### addFilter(name, fn)

Add a custom filter.

```typescript
env.addFilter('currency', (value: number) => `$${value.toFixed(2)}`)
```

### addGlobal(name, value)

Add a global variable.

```typescript
env.addGlobal('siteName', 'My Website')
env.addGlobal('currentYear', new Date().getFullYear())
```

### loadTemplate(name)

Pre-load a template into cache.

```typescript
// Warm cache at startup
await env.loadTemplate('base.html')
await env.loadTemplate('pages/home.html')
```

### cacheSize()

Get number of cached templates.

```typescript
const size = env.cacheSize()
console.log(`${size} templates cached`)
```

### cacheStats()

Get detailed cache statistics.

```typescript
const stats = env.cacheStats()
console.log(stats)
// { size: 10, maxSize: 100, hits: 150, misses: 10, hitRate: 0.94 }
```

### clearCache()

Clear all cached templates.

```typescript
env.clearCache()
```

## Configuration Examples

### With Custom Filters

```typescript
const env = new Environment({
  templates: './views',
  filters: {
    currency: (value: number) => `$${value.toFixed(2)}`,
    highlight: (text: string, term: string) =>
      text.replace(new RegExp(term, 'gi'), '<mark>$&</mark>')
  }
})
```

### With Global Variables

```typescript
const env = new Environment({
  templates: './views',
  globals: {
    siteName: 'My Website',
    currentYear: new Date().getFullYear(),
    version: '1.0.0'
  }
})
```

### With URL Resolvers

```typescript
const env = new Environment({
  templates: './views',
  urlResolver: (name: string, ...args: any[]) => {
    const routes: Record<string, string> = {
      home: '/',
      about: '/about',
      user: '/users/:id',
    }
    let url = routes[name] || '#'
    args.forEach((arg, i) => {
      url = url.replace(`:${Object.keys(arg)[0]}`, Object.values(arg)[0] as string)
    })
    return url
  },
  staticResolver: (path: string) => `/static/${path}`
})
```

### With Timezone

```typescript
const env = new Environment({
  templates: './views',
  timezone: 'Europe/Rome'  // All dates in Rome timezone
})
```

### With Debug Panel

```typescript
const env = new Environment({
  templates: './views',
  debug: process.env.NODE_ENV !== 'production',
  debugOptions: {
    dark: true,
    position: 'bottom-right',
    collapsed: true
  }
})
```

## Cache Configuration

```typescript
const env = new Environment({
  templates: './views',
  cache: true,           // Enable caching
  cacheMaxSize: 200,     // LRU cache limit
})

// Monitor cache performance
setInterval(() => {
  const stats = env.cacheStats()
  if (stats.hitRate < 0.8) {
    console.warn('Low cache hit rate:', stats.hitRate)
  }
}, 60000)
```

## See Also

- [`render()`](/binja/api/render/) - Simple rendering
- [`compile()`](/binja/api/compile/) - AOT compilation
- [Debug Panel](/binja/guide/debug/) - Development tools
