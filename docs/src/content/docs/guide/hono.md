---
title: Hono Adapter
description: First-class integration with Hono web framework
---

binja provides a first-class adapter for [Hono](https://hono.dev), the ultra-fast web framework for Bun.

## Installation

```bash
bun add binja hono
```

## Basic Usage

```typescript
import { Hono } from 'hono'
import { binja } from 'binja/hono'

const app = new Hono()

// Add binja middleware
app.use(binja({
  root: './views',
}))

// Render templates with c.render()
app.get('/', (c) => c.render('index', { title: 'Home' }))

app.get('/users/:id', async (c) => {
  const user = await getUser(c.req.param('id'))
  return c.render('users/profile', { user })
})

export default app
```

## Configuration Options

```typescript
app.use(binja({
  root: './views',           // Template directory
  extension: '.html',        // Default extension
  engine: 'jinja2',          // jinja2 | handlebars | liquid | twig
  cache: true,               // Cache compiled templates
  globals: {                 // Global context
    siteName: 'My App',
    year: new Date().getFullYear(),
  },
  layout: 'layouts/base',    // Optional layout template
  contentVar: 'content',     // Content variable name in layout
}))
```

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `string` | `./views` | Template directory |
| `extension` | `string` | `.html` | Default file extension |
| `engine` | `string` | `jinja2` | Template engine |
| `cache` | `boolean` | `true` (prod) | Cache compiled templates |
| `debug` | `boolean` | `false` | Show error details |
| `globals` | `object` | `{}` | Global context variables |
| `layout` | `string` | - | Layout template path |
| `contentVar` | `string` | `content` | Content variable name |

## Using Layouts

```typescript
app.use(binja({
  root: './views',
  layout: 'layouts/base',  // Will render layouts/base.html
}))

app.get('/', (c) => c.render('pages/home', { title: 'Home' }))
```

**layouts/base.html**
```django
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }} | {{ siteName }}</title>
</head>
<body>
  {{ content|safe }}
</body>
</html>
```

**pages/home.html**
```django
<h1>Welcome to {{ siteName }}!</h1>
<p>This is the home page.</p>
```

## Multi-Engine Support

```typescript
// Use Handlebars for specific routes
app.use('/admin/*', binja({
  root: './admin-views',
  engine: 'handlebars',
}))

// Use Liquid for main site
app.use(binja({
  root: './views',
  engine: 'liquid',
}))
```

## Cache Management

```typescript
import { clearCache, getCacheStats } from 'binja/hono'

// Clear all cached templates
app.get('/admin/clear-cache', (c) => {
  clearCache()
  return c.text('Cache cleared')
})

// Get cache statistics
app.get('/admin/cache-stats', (c) => {
  const stats = getCacheStats()
  return c.json(stats)
  // { size: 10, keys: ['jinja2:./views/index.html', ...] }
})
```

## With HTMX

```typescript
import { Hono } from 'hono'
import { binja } from 'binja/hono'

const app = new Hono()

app.use(binja({ root: './views' }))

// Full page
app.get('/', (c) => c.render('index', { items: [] }))

// HTMX partial
app.post('/items', async (c) => {
  const body = await c.req.json()
  const item = await createItem(body)
  // Render just the item component
  return c.render('components/item', { item })
})
```

## Error Handling

```typescript
app.use(binja({
  root: './views',
  debug: process.env.NODE_ENV !== 'production',
}))

// Custom error page
app.onError((err, c) => {
  return c.render('errors/500', {
    error: c.env.debug ? err.message : 'Something went wrong'
  })
})

app.notFound((c) => {
  return c.render('errors/404')
})
```
