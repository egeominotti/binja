---
title: Introduction
description: What is binja and why should you use it?
---

**binja** is a high-performance Jinja2/Django Template Language engine built specifically for the [Bun](https://bun.sh) runtime. It provides 100% compatibility with Django templates while being 2-4x faster than Nunjucks in runtime mode and up to **160x faster** with AOT (Ahead-of-Time) compilation.

## Key Features

### Performance

- **2-4x faster** than Nunjucks in runtime mode
- **160x faster** with AOT compilation for production
- Pure TypeScript implementation optimized for Bun
- Inline filter optimization for ~70 common filters

### Compatibility

- **100% Django Template Language (DTL)** compatible
- **Full Jinja2** syntax support
- Drop-in replacement for Django templates in JavaScript

### Multi-Engine Support

binja uniquely supports multiple template syntaxes through a unified API:

| Engine | Syntax | Use Case |
|--------|--------|----------|
| **Jinja2/DTL** | `{{ var }}` `{% if %}` | Python/Django projects |
| **Handlebars** | `{{var}}` `{{#if}}` | JavaScript ecosystem |
| **Liquid** | `{{ var }}` `{% if %}` | Shopify, Jekyll |
| **Twig** | `{{ var }}` `{% if %}` | PHP/Symfony projects |

All engines share the same 84+ built-in filters and runtime optimizations.

### Developer Experience

- **84 built-in filters** covering string, number, date, list, URL operations
- **28 built-in tests** for the `is` operator
- **Debug panel** similar to Django Debug Toolbar
- **AI-powered linting** for security, performance, and accessibility
- **CLI tool** for compilation, checking, and watching templates
- **Framework adapters** for Hono and Elysia

## Two Rendering Modes

binja supports two rendering modes to optimize for different use cases:

### Runtime Mode

Best for development and templates with dynamic inheritance.

```typescript
import { render } from 'binja'

const html = await render('Hello, {{ name }}!', { name: 'World' })
```

### AOT Mode

Best for production - pre-compile templates to JavaScript functions.

```typescript
import { compile } from 'binja'

// Compile once at startup
const template = compile('<h1>{{ title|upper }}</h1>')

// Render synchronously (extremely fast)
const html = template({ title: 'welcome' })
// Output: <h1>WELCOME</h1>
```

## When to Use binja

binja is ideal for:

- **Bun web applications** using Hono, Elysia, or raw Bun.serve
- **Server-side rendering** where performance matters
- **Migrating Django projects** to JavaScript/TypeScript
- **Multi-engine projects** that need Handlebars, Liquid, or Twig support
- **Static site generators** that need fast template compilation

## Next Steps

- [Installation](/binja/guide/installation/) - Get binja installed
- [Quick Start](/binja/guide/quickstart/) - Build your first template
- [Benchmarks](/binja/guide/benchmarks/) - See detailed performance numbers
