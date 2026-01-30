---
title: Caching
description: Template caching for optimal performance
---

binja includes an LRU (Least Recently Used) cache for compiled templates, improving performance by avoiding repeated parsing.

## Enable Caching

```typescript
const env = new Environment({
  templates: './views',
  cache: true,  // Enable caching (default: true)
})
```

## Cache Configuration

```typescript
const env = new Environment({
  templates: './views',
  cache: true,
  cacheMaxSize: 100,  // Maximum cached templates (default: 100)
})
```

## How It Works

1. **First render:** Template is lexed, parsed, and executed
2. **Subsequent renders:** Cached AST is reused, skipping lex/parse

```
First render:  Template → Lexer → Parser → AST → Runtime → Output
Cached render: Template → [Cache Hit] → AST → Runtime → Output
```

## Cache Monitoring

### Cache Size

```typescript
const size = env.cacheSize()
console.log(`${size} templates cached`)
```

### Cache Statistics

```typescript
const stats = env.cacheStats()
console.log(stats)
// {
//   size: 10,      // Current cached templates
//   maxSize: 100,  // Maximum cache size
//   hits: 150,     // Cache hits
//   misses: 10,    // Cache misses
//   hitRate: 0.94  // Hit rate (93.75%)
// }
```

### Monitor Performance

```typescript
// Log cache stats periodically
setInterval(() => {
  const stats = env.cacheStats()
  console.log(`Cache: ${stats.size}/${stats.maxSize}, Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`)

  if (stats.hitRate < 0.8) {
    console.warn('Low cache hit rate - consider increasing cacheMaxSize')
  }
}, 60000)
```

## Cache Management

### Clear Cache

```typescript
env.clearCache()
// Clears all cached templates and resets stats
```

### Pre-warm Cache

Load frequently-used templates at startup:

```typescript
const env = new Environment({
  templates: './views',
  cache: true,
})

// Pre-warm cache at startup
await env.loadTemplate('base.html')
await env.loadTemplate('layouts/default.html')
await env.loadTemplate('components/header.html')
await env.loadTemplate('components/footer.html')
```

## Cache Key

Templates are cached by their path:

```typescript
// These use the same cache entry
await env.render('home.html', { a: 1 })
await env.render('home.html', { a: 2 })

// Different cache entries
await env.render('home.html', ctx)
await env.render('about.html', ctx)
```

## LRU Eviction

When cache reaches `cacheMaxSize`, least recently used templates are evicted:

```typescript
const env = new Environment({
  cacheMaxSize: 50,  // Only 50 templates cached
})

// After 51 unique templates, oldest is evicted
```

## Development vs Production

### Development

Consider disabling cache for hot reloading:

```typescript
const env = new Environment({
  templates: './views',
  cache: process.env.NODE_ENV === 'production',
})
```

Or use smaller cache:

```typescript
const env = new Environment({
  templates: './views',
  cache: true,
  cacheMaxSize: 10,  // Smaller cache for dev
})
```

### Production

Enable caching with appropriate size:

```typescript
const env = new Environment({
  templates: './views',
  cache: true,
  cacheMaxSize: 200,  // Adjust based on template count
})
```

## Memory Considerations

Each cached template consumes memory for its AST. Monitor memory usage:

```typescript
// Rough guideline: Start with templates × 1.5 for cacheMaxSize
// Adjust based on memory constraints and hit rate

const templateCount = 50  // Your approximate template count
const env = new Environment({
  cacheMaxSize: Math.ceil(templateCount * 1.5),
})
```

## Cache vs AOT

| Approach | Use Case | Performance |
|----------|----------|-------------|
| **Cache** | Templates with inheritance | Fast (skips lex/parse) |
| **AOT** | Static templates | Fastest (compiled to JS) |

For maximum performance, combine both:

```typescript
import { compile, Environment } from 'binja'

// AOT for static templates
const staticTemplates = {
  header: compile(await Bun.file('./partials/header.html').text()),
  footer: compile(await Bun.file('./partials/footer.html').text()),
}

// Cached Environment for templates with inheritance
const env = new Environment({
  templates: './views',
  cache: true,
})
```

## Framework Adapter Caching

Framework adapters (Hono, Elysia) have their own cache:

```typescript
import { binja, clearCache, getCacheStats } from 'binja/hono'

app.use(binja({
  root: './views',
  cache: true,  // Enable adapter cache
}))

// Access adapter cache
app.get('/admin/cache', (c) => c.json(getCacheStats()))
app.post('/admin/cache/clear', (c) => {
  clearCache()
  return c.json({ success: true })
})
```
