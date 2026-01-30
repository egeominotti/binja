---
title: Elysia Adapter
description: First-class integration with Elysia web framework
---

binja provides a first-class adapter for [Elysia](https://elysiajs.com), the ergonomic web framework for Bun.

## Installation

```bash
bun add binja elysia
```

## Basic Usage

```typescript
import { Elysia } from 'elysia'
import { binja } from 'binja/elysia'

const app = new Elysia()
  // Add binja plugin
  .use(binja({
    root: './views',
  }))
  // Render templates with render()
  .get('/', ({ render }) => render('index', { title: 'Home' }))
  .get('/users/:id', async ({ render, params }) => {
    const user = await getUser(params.id)
    return render('users/profile', { user })
  })
  .listen(3000)

console.log('Server running at http://localhost:3000')
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
const app = new Elysia()
  .use(binja({
    root: './views',
    layout: 'layouts/base',
  }))
  .get('/', ({ render }) => render('pages/home', { title: 'Home' }))
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

## Multi-Engine Support

```typescript
const app = new Elysia()
  .use(binja({
    root: './views',
    engine: 'handlebars', // Use Handlebars syntax
  }))
  .get('/', ({ render }) => render('index', { name: 'World' }))
```

**views/index.html** (Handlebars syntax)
```handlebars
<h1>Hello {{name}}!</h1>
{{#if items}}
  {{#each items}}
    <li>{{this}}</li>
  {{/each}}
{{/if}}
```

## Cache Management

```typescript
import { clearCache, getCacheStats } from 'binja/elysia'

const app = new Elysia()
  .use(binja({ root: './views' }))
  .get('/admin/clear-cache', () => {
    clearCache()
    return { success: true }
  })
  .get('/admin/cache-stats', () => {
    return getCacheStats()
  })
```

## With HTMX

```typescript
const app = new Elysia()
  .use(binja({ root: './views' }))
  // Full page
  .get('/', ({ render }) => render('index', { items: [] }))
  // HTMX partial - just the component
  .post('/items', async ({ render, body }) => {
    const item = await createItem(body)
    return render('components/item', { item })
  })
  .delete('/items/:id', async ({ params }) => {
    await deleteItem(params.id)
    return '' // HTMX removes the element
  })
```

## Type Safety

Elysia's type system works seamlessly with binja:

```typescript
const app = new Elysia()
  .use(binja({ root: './views' }))
  .get('/', ({ render }) => {
    // TypeScript knows render() returns Response
    return render('index', {
      title: 'Home',
      count: 42, // Type checked
    })
  })
```

## Error Handling

```typescript
const app = new Elysia()
  .use(binja({
    root: './views',
    debug: process.env.NODE_ENV !== 'production',
  }))
  .onError(({ render, code, error }) => {
    if (code === 'NOT_FOUND') {
      return render('errors/404')
    }
    return render('errors/500', {
      error: process.env.NODE_ENV !== 'production' ? error.message : 'Error'
    })
  })
```

## Plugin Pattern

Create a reusable plugin with binja:

```typescript
import { Elysia } from 'elysia'
import { binja } from 'binja/elysia'

// Reusable template plugin
export const templatePlugin = new Elysia({ name: 'templates' })
  .use(binja({
    root: './views',
    cache: process.env.NODE_ENV === 'production',
    globals: {
      siteName: 'My App',
      year: new Date().getFullYear(),
    },
  }))

// Use in your app
const app = new Elysia()
  .use(templatePlugin)
  .get('/', ({ render }) => render('index'))
```
