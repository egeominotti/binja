---
title: AOT Compilation
description: Pre-compile templates for maximum production performance
---

AOT (Ahead-of-Time) compilation converts templates into optimized JavaScript functions at build/startup time, providing **160x faster** rendering than runtime mode.

## Basic Usage

```typescript
import { compile } from 'binja'

// Compile once at startup
const renderUser = compile('<h1>{{ name|upper }}</h1>')

// Use many times (sync, extremely fast!)
const html = renderUser({ name: 'john' })
// Output: <h1>JOHN</h1>
```

## Performance Comparison

| Mode | Speed | Use Case |
|------|-------|----------|
| Runtime (`render()`) | 371K ops/s | Development |
| AOT (`compile()`) | **14.3M ops/s** | Production |

**39x faster** than runtime mode, **160x faster** than Nunjucks.

## Production Pattern

```typescript
import { compile } from 'binja'

// Pre-compile all templates at server startup
const templates = {
  home: compile(await Bun.file('./views/home.html').text()),
  user: compile(await Bun.file('./views/user.html').text()),
  product: compile(await Bun.file('./views/product.html').text()),
}

// Rendering is now synchronous and extremely fast
app.get('/', () => templates.home({ title: 'Welcome' }))
app.get('/user/:id', ({ params }) => templates.user({ id: params.id }))
app.get('/product/:id', ({ params }) => templates.product({ id: params.id }))
```

## Supported Features

AOT compilation supports:

- Variables and expressions
- Filters (all 84 built-in filters)
- Conditionals (`{% if %}`, `{% elif %}`, `{% else %}`)
- Loops (`{% for %}`, `{% empty %}`)
- Set/With statements
- Comments
- Raw/Verbatim blocks

## Not Supported in AOT

The following features require runtime mode:

- `{% extends %}` - Use `compileWithInheritance()` or Environment
- `{% include %}` - Use `compileWithInheritance()` or Environment
- Dynamic template loading

### For Template Inheritance

Use `Environment` with caching for templates that use inheritance:

```typescript
import { Environment } from 'binja'

const env = new Environment({
  templates: './views',
  cache: true, // Enable caching
})

// Pre-warm cache at startup
await env.loadTemplate('base.html')
await env.loadTemplate('home.html')

// Rendering uses cached AST
const html = await env.render('home.html', { title: 'Welcome' })
```

## Generate JavaScript Code

For build tools, generate standalone JavaScript code:

```typescript
import { compileToCode } from 'binja'

const code = compileToCode('<h1>{{ title }}</h1>', {
  functionName: 'renderHeader'
})

// Save to file
await Bun.write('./compiled/header.js', code)
```

**Generated code:**
```javascript
export function renderHeader(ctx) {
  let __out = '';
  __out += '<h1>';
  __out += escape(ctx.title);
  __out += '</h1>';
  return __out;
}
```

## CLI Compilation

Compile templates from command line:

```bash
# Compile all templates to JavaScript
binja compile ./templates -o ./dist

# Watch mode for development
binja watch ./templates -o ./dist
```

## Options

```typescript
const template = compile(source, {
  // Disable autoescaping (not recommended)
  autoescape: false,

  // Custom filters
  filters: {
    currency: (v) => `$${v.toFixed(2)}`
  },
})
```

## When to Use AOT

**Use AOT when:**
- Templates are static (don't use `{% extends %}` or `{% include %}`)
- Maximum performance is critical
- Templates can be compiled at build/startup time

**Use Runtime when:**
- Templates use inheritance (`{% extends %}`)
- Templates use includes (`{% include %}`)
- Templates are loaded dynamically
- During development

## Hybrid Approach

Combine both for optimal performance:

```typescript
import { compile, Environment } from 'binja'

// AOT for static templates
const staticTemplates = {
  header: compile(await Bun.file('./partials/header.html').text()),
  footer: compile(await Bun.file('./partials/footer.html').text()),
}

// Environment for templates with inheritance
const env = new Environment({
  templates: './views',
  cache: true,
})

// Use both
app.get('/', async (c) => {
  const header = staticTemplates.header({ nav: [...] })
  const content = await env.render('pages/home.html', { ... })
  const footer = staticTemplates.footer({ year: 2024 })
  return c.html(header + content + footer)
})
```
