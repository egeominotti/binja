<h1 align="center">binja</h1>

<p align="center">
  <strong>High-performance Jinja2/Django template engine for Bun</strong>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#filters">Filters</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django Compatible" />
  <img src="https://img.shields.io/badge/license-BSD--3--Clause-blue.svg?style=for-the-badge" alt="BSD-3-Clause License" />
</p>

---

## Why binja?

| Feature | Binja | Other JS engines |
|---------|-----------|------------------|
| **AOT Compilation** | ✅ 160x faster | ❌ |
| Django DTL Compatible | ✅ 100% | ❌ Partial |
| Jinja2 Compatible | ✅ Full | ⚠️ Limited |
| Template Inheritance | ✅ | ⚠️ |
| 50+ Built-in Filters | ✅ | ❌ |
| Debug Panel | ✅ | ❌ |
| CLI Tool | ✅ | ⚠️ |
| Autoescape by Default | ✅ | ❌ |
| TypeScript | ✅ Native | ⚠️ |
| Bun Optimized | ✅ | ❌ |

---

## Benchmarks

Tested on Mac Studio M1 Max, Bun 1.3.5, 10,000 iterations.

### Two Rendering Modes

| Mode | Function | Best For | vs Nunjucks |
|------|----------|----------|-------------|
| **Runtime** | `render()` | Development | **3.7x faster** |
| **AOT** | `compile()` | Production | **160x faster** |

### Performance Comparison

| Benchmark | Nunjucks | binja Runtime | binja AOT |
|-----------|----------|---------------|-----------|
| Simple Template | 95K ops/s | 290K ops/s | **14.3M ops/s** |
| Complex Template | 28K ops/s | 103K ops/s | **1.07M ops/s** |
| Nested Loops | 27K ops/s | 130K ops/s | **1.75M ops/s** |
| HTML Escaping | 65K ops/s | 241K ops/s | **2.23M ops/s** |
| Conditionals | 27K ops/s | 126K ops/s | **22.8M ops/s** |
| Large Dataset (100 items) | 21K ops/s | 36K ops/s | **202K ops/s** |

### Run Benchmarks

```bash
bun run full-benchmark.ts
```

---

## Installation

```bash
bun add binja
```

---

## Quick Start

```typescript
import { render } from 'binja'

// Simple rendering
const html = await render('Hello, {{ name }}!', { name: 'World' })
// Output: Hello, World!

// With filters
const html = await render('{{ title|upper|truncatechars:20 }}', {
  title: 'Welcome to our amazing website'
})
// Output: WELCOME TO OUR AMAZI...
```

### Using Environment

```typescript
import { Environment } from 'binja'

const env = new Environment({
  templates: './templates',  // Template directory
  autoescape: true,          // XSS protection (default: true)
})

// Load and render template file
const html = await env.render('pages/home.html', {
  user: { name: 'John', email: 'john@example.com' },
  items: ['Apple', 'Banana', 'Cherry']
})
```

### AOT Compilation (Maximum Performance)

For production, use `compile()` for **160x faster** rendering:

```typescript
import { compile } from 'binja'

// Compile once at startup
const renderUser = compile('<h1>{{ name|upper }}</h1>')

// Use many times (sync, extremely fast!)
const html = renderUser({ name: 'john' })
// Output: <h1>JOHN</h1>
```

Production example:

```typescript
import { compile } from 'binja'

// Pre-compile all templates at server startup
const templates = {
  home: compile(await Bun.file('./views/home.html').text()),
  user: compile(await Bun.file('./views/user.html').text()),
}

// Rendering is now synchronous and extremely fast
app.get('/', () => templates.home({ title: 'Welcome' }))
app.get('/user/:id', ({ params }) => templates.user({ id: params.id }))
```

---

## Features

### Variables

```django
{{ user.name }}
{{ user.email|lower }}
{{ items.0 }}
{{ data['key'] }}
```

### Conditionals

```django
{% if user.is_admin %}
  <span class="badge">Admin</span>
{% elif user.is_staff %}
  <span class="badge">Staff</span>
{% else %}
  <span class="badge">User</span>
{% endif %}
```

### Loops

```django
{% for item in items %}
  <div class="{{ loop.first ? 'first' : '' }}">
    {{ loop.index }}. {{ item.name }}
  </div>
{% empty %}
  <p>No items found.</p>
{% endfor %}
```

#### Loop Variables

| Variable | Description |
|----------|-------------|
| `loop.index` / `forloop.counter` | Current iteration (1-indexed) |
| `loop.index0` / `forloop.counter0` | Current iteration (0-indexed) |
| `loop.first` / `forloop.first` | True if first iteration |
| `loop.last` / `forloop.last` | True if last iteration |
| `loop.length` / `forloop.length` | Total number of items |
| `loop.parent` / `forloop.parentloop` | Parent loop context |

### Template Inheritance

**base.html**
```django
<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}Default Title{% endblock %}</title>
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>
```

**page.html**
```django
{% extends "base.html" %}

{% block title %}My Page{% endblock %}

{% block content %}
  <h1>Welcome!</h1>
  <p>This is my page content.</p>
{% endblock %}
```

### Include

```django
{% include "components/header.html" %}
{% include "components/card.html" with title="Hello" %}
```

### Set Variables

```django
{% set greeting = "Hello, " ~ user.name %}
{{ greeting }}

{% with total = price * quantity %}
  Total: ${{ total }}
{% endwith %}
```

---

## Filters

### String Filters

| Filter | Example | Output |
|--------|---------|--------|
| `upper` | `{{ "hello"\|upper }}` | `HELLO` |
| `lower` | `{{ "HELLO"\|lower }}` | `hello` |
| `capitalize` | `{{ "hello"\|capitalize }}` | `Hello` |
| `title` | `{{ "hello world"\|title }}` | `Hello World` |
| `trim` | `{{ "  hello  "\|trim }}` | `hello` |
| `truncatechars` | `{{ "hello world"\|truncatechars:5 }}` | `he...` |
| `truncatewords` | `{{ "hello world foo"\|truncatewords:2 }}` | `hello world...` |
| `slugify` | `{{ "Hello World!"\|slugify }}` | `hello-world` |
| `striptags` | `{{ "<p>Hello</p>"\|striptags }}` | `Hello` |
| `wordcount` | `{{ "hello world"\|wordcount }}` | `2` |
| `center` | `{{ "hi"\|center:10 }}` | `    hi    ` |
| `ljust` | `{{ "hi"\|ljust:10 }}` | `hi        ` |
| `rjust` | `{{ "hi"\|rjust:10 }}` | `        hi` |
| `cut` | `{{ "hello"\|cut:"l" }}` | `heo` |

### Number Filters

| Filter | Example | Output |
|--------|---------|--------|
| `abs` | `{{ -5\|abs }}` | `5` |
| `add` | `{{ 5\|add:3 }}` | `8` |
| `floatformat` | `{{ 3.14159\|floatformat:2 }}` | `3.14` |
| `filesizeformat` | `{{ 1048576\|filesizeformat }}` | `1.0 MB` |
| `divisibleby` | `{{ 10\|divisibleby:2 }}` | `true` |

### List Filters

| Filter | Example | Output |
|--------|---------|--------|
| `length` | `{{ items\|length }}` | `3` |
| `first` | `{{ items\|first }}` | First item |
| `last` | `{{ items\|last }}` | Last item |
| `join` | `{{ items\|join:", " }}` | `a, b, c` |
| `reverse` | `{{ items\|reverse }}` | Reversed list |
| `sort` | `{{ items\|sort }}` | Sorted list |
| `unique` | `{{ items\|unique }}` | Unique items |
| `slice` | `{{ items\|slice:":2" }}` | First 2 items |
| `batch` | `{{ items\|batch:2 }}` | Grouped by 2 |
| `random` | `{{ items\|random }}` | Random item |

### Date Filters

| Filter | Example | Output |
|--------|---------|--------|
| `date` | `{{ now\|date:"Y-m-d" }}` | `2024-01-15` |
| `time` | `{{ now\|time:"H:i" }}` | `14:30` |
| `timesince` | `{{ past\|timesince }}` | `2 days ago` |
| `timeuntil` | `{{ future\|timeuntil }}` | `in 3 hours` |

#### Timezone Support

All date/time operations respect the `timezone` option in Environment:

```typescript
const env = new Environment({
  timezone: 'Europe/Rome'  // All dates will be displayed in Rome timezone
})

// 2024-06-15 12:00 UTC = 2024-06-15 14:00 Rome (UTC+2)
await env.renderString('{{ date|date:"Y-m-d H:i" }}', {
  date: new Date('2024-06-15T12:00:00Z')
})
// Output: 2024-06-15 14:00

// {% now %} tag also uses the configured timezone
await env.renderString('{% now "Y-m-d H:i" %}')
// Output: current date/time in Rome timezone
```

Common timezone values: `UTC`, `Europe/London`, `Europe/Rome`, `Europe/Paris`, `America/New_York`, `America/Los_Angeles`, `Asia/Tokyo`, `Asia/Shanghai`, `Australia/Sydney`

### Safety & Encoding

| Filter | Example | Description |
|--------|---------|-------------|
| `escape` | `{{ html\|escape }}` | HTML escape |
| `safe` | `{{ html\|safe }}` | Mark as safe (no escape) |
| `urlencode` | `{{ url\|urlencode }}` | URL encode |
| `json` | `{{ data\|json }}` | JSON stringify |

### Default Values

| Filter | Example | Output |
|--------|---------|--------|
| `default` | `{{ missing\|default:"N/A" }}` | `N/A` |
| `default_if_none` | `{{ null\|default_if_none:"None" }}` | `None` |
| `yesno` | `{{ true\|yesno:"Yes,No" }}` | `Yes` |
| `pluralize` | `{{ count\|pluralize }}` | `s` or `` |

---

## Tests (is operator)

Tests check values using the `is` operator (Jinja2 syntax):

```django
{% if value is defined %}...{% endif %}
{% if num is even %}...{% endif %}
{% if num is divisibleby(3) %}...{% endif %}
{% if items is empty %}...{% endif %}
```

### Built-in Tests

| Test | Description |
|------|-------------|
| `divisibleby(n)` | Divisible by n |
| `even` / `odd` | Even/odd integer |
| `number` / `integer` / `float` | Type checks |
| `defined` / `undefined` | Variable exists |
| `none` | Is null |
| `empty` | Empty array/string/object |
| `truthy` / `falsy` | Truthiness checks |
| `string` / `mapping` / `iterable` | Type checks |
| `gt(n)` / `lt(n)` / `ge(n)` / `le(n)` | Comparisons |
| `eq(v)` / `ne(v)` / `sameas(v)` | Equality |
| `upper` / `lower` | String case checks |

```typescript
import { builtinTests } from 'binja'

// All 30+ built-in tests
console.log(Object.keys(builtinTests))
// ['divisibleby', 'even', 'odd', 'number', 'integer', ...]
```

---

## Django Compatibility

binja is designed to be a drop-in replacement for Django templates:

```django
{# Django-style comments #}

{% load static %}  {# Supported (no-op) #}

{% url 'home' %}
{% static 'css/style.css' %}

{% csrf_token %}  {# Returns empty for JS compatibility #}

{{ forloop.counter }}
{{ forloop.first }}
{{ forloop.parentloop.counter }}
```

---

## Configuration

```typescript
const env = new Environment({
  // Template directory
  templates: './templates',

  // Auto-escape HTML (default: true)
  autoescape: true,

  // Timezone for date/time operations
  // All date filters and {% now %} tag will use this timezone
  timezone: 'Europe/Rome',  // or 'UTC', 'America/New_York', etc.

  // Custom filters
  filters: {
    currency: (value: number) => `$${value.toFixed(2)}`,
    highlight: (text: string, term: string) =>
      text.replace(new RegExp(term, 'gi'), '<mark>$&</mark>')
  },

  // Global variables available in all templates
  globals: {
    site_name: 'My Website',
    current_year: new Date().getFullYear()
  },

  // URL resolver for {% url %} tag
  urlResolver: (name: string, ...args: any[]) => {
    const routes = { home: '/', about: '/about', user: '/users/:id' }
    return routes[name] || '#'
  },

  // Static file resolver for {% static %} tag
  staticResolver: (path: string) => `/static/${path}`
})
```

---

## Debug Panel

Binja includes a professional debug panel for development, similar to Django Debug Toolbar:

```typescript
const env = new Environment({
  templates: './templates',
  debug: true,  // Enable debug panel
  debugOptions: {
    dark: true,
    position: 'bottom-right',
  },
})

// Debug panel is automatically injected into HTML responses
const html = await env.render('page.html', context)
```

### Features

- **Performance Metrics** - Lexer, Parser, Render timing with visual bars
- **Template Chain** - See extends/include hierarchy
- **Context Inspector** - Expandable tree view of all context variables
- **Filter Usage** - Which filters were used and how many times
- **Cache Stats** - Hit/miss rates
- **Warnings** - Optimization suggestions

### Options

```typescript
debugOptions: {
  dark: true,                    // Dark/light theme
  collapsed: true,               // Start collapsed
  position: 'bottom-right',      // Panel position
  width: 420,                    // Panel width
}
```

---

## CLI Tool

Binja includes a CLI for template pre-compilation:

```bash
# Compile all templates to JavaScript
binja compile ./templates -o ./dist

# Check templates for errors
binja check ./templates

# Watch mode for development
binja watch ./templates -o ./dist
```

### Pre-compiled Templates

```typescript
// Generated: dist/home.js
import { render } from './dist/home.js'

const html = render({ title: 'Home', items: [...] })
```

---

## Raw/Verbatim Tag

Output template syntax without processing:

```django
{% raw %}
  {{ this will not be processed }}
  {% neither will this %}
{% endraw %}

{# Or Django-style #}
{% verbatim %}
  {{ raw output }}
{% endverbatim %}
```

---

## Custom Filters

```typescript
const env = new Environment({
  filters: {
    // Simple filter
    double: (value: number) => value * 2,

    // Filter with argument
    repeat: (value: string, times: number = 2) => value.repeat(times),

    // Async filter
    translate: async (value: string, lang: string) => {
      return await translateAPI(value, lang)
    }
  }
})
```

Usage:
```django
{{ 5|double }}           → 10
{{ "hi"|repeat:3 }}      → hihihi
{{ "Hello"|translate:"es" }} → Hola
```

---

## Security

### XSS Protection

Autoescape is enabled by default. All variables are HTML-escaped:

```typescript
await render('{{ script }}', {
  script: '<script>alert("xss")</script>'
})
// Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

### Marking Safe Content

```django
{{ trusted_html|safe }}
```

---

## Performance Tips

1. **Use AOT in Production** - `compile()` is 160x faster than Nunjucks
2. **Pre-compile at Startup** - Compile templates once, use many times
3. **Reuse Environment** - For templates with `{% extends %}`, create once
4. **Enable caching** - Templates are cached automatically

```typescript
import { compile } from 'binja'

// Best: AOT compilation for static templates
const templates = {
  home: compile(await Bun.file('./views/home.html').text()),
  user: compile(await Bun.file('./views/user.html').text()),
}

// Sync rendering, extremely fast
app.get('/', () => templates.home({ title: 'Home' }))
app.get('/user/:id', () => templates.user({ id: params.id }))
```

For templates with inheritance (`{% extends %}`):

```typescript
import { Environment } from 'binja'

// Environment with cache for inherited templates
const env = new Environment({ templates: './views', cache: true })

// Pre-warm cache at startup
await env.loadTemplate('base.html')
await env.loadTemplate('home.html')
```

---

## API Reference

### `render(template, context)` - Runtime Mode

Render a template string with context (async, easy development).

```typescript
import { render } from 'binja'

const html = await render('Hello {{ name }}', { name: 'World' })
```

### `compile(template, options?)` - AOT Mode

Compile a template to an optimized function (sync, **160x faster**).

```typescript
import { compile } from 'binja'

// Compile once
const renderGreeting = compile('<h1>{{ name|upper }}</h1>')

// Use many times (sync!)
const html = renderGreeting({ name: 'world' }) // <h1>WORLD</h1>
```

**Supported:** Variables, filters, conditions, loops, set/with, comments.
**Not supported:** `{% extends %}`, `{% include %}` (use Environment for these).

### `compileToCode(template, options?)`

Generate JavaScript code string for build tools.

```typescript
import { compileToCode } from 'binja'

const code = compileToCode('<h1>{{ title }}</h1>', {
  functionName: 'renderHeader'
})

// Save to file for bundling
await Bun.write('./compiled/header.js', code)
```

### `Environment`

Create a configured template environment.

```typescript
const env = new Environment(options)

// Methods
env.render(name, context)      // Render template file
env.renderString(str, context) // Render template string
env.addFilter(name, fn)        // Add custom filter
env.addGlobal(name, value)     // Add global variable
env.loadTemplate(name)         // Pre-load template (for cache warming)
```

---

## Examples

### Elysia Integration

```typescript
import { Elysia } from 'elysia'
import { Environment } from 'binja'

// Development with debug panel
const templates = new Environment({
  templates: './views',
  debug: Bun.env.NODE_ENV !== 'production',
  debugOptions: { dark: true },
  globals: {
    site_name: 'My App',
    current_year: new Date().getFullYear()
  }
})

const app = new Elysia()
  // HTML helper
  .decorate('html', (name: string, ctx: object) => templates.render(name, ctx))

  // Routes
  .get('/', async ({ html }) => {
    return new Response(await html('home.html', {
      title: 'Welcome',
      features: ['Fast', 'Secure', 'Easy']
    }), {
      headers: { 'Content-Type': 'text/html' }
    })
  })

  .get('/users/:id', async ({ html, params }) => {
    const user = await getUser(params.id)
    return new Response(await html('user/profile.html', { user }), {
      headers: { 'Content-Type': 'text/html' }
    })
  })

  .listen(3000)

console.log('Server running at http://localhost:3000')
```

### Elysia Plugin

```typescript
import { Elysia } from 'elysia'
import { Environment } from 'binja'

// Create reusable plugin
const jinjaPlugin = (options: { templates: string }) => {
  const env = new Environment(options)

  return new Elysia({ name: 'jinja' })
    .derive(async () => ({
      render: async (name: string, context: object = {}) => {
        const html = await env.render(name, context)
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }
    }))
}

// Use in app
const app = new Elysia()
  .use(jinjaPlugin({ templates: './views' }))
  .get('/', ({ render }) => render('index.html', { title: 'Home' }))
  .get('/about', ({ render }) => render('about.html'))
  .listen(3000)
```

### Elysia + HTMX

```typescript
import { Elysia } from 'elysia'
import { Environment } from 'binja'

const templates = new Environment({ templates: './views' })

const app = new Elysia()
  // Full page
  .get('/', async () => {
    const html = await templates.render('index.html', {
      items: await getItems()
    })
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    })
  })

  // HTMX partial - returns only the component
  .post('/items', async ({ body }) => {
    const item = await createItem(body)
    const html = await templates.renderString(`
      <li id="item-{{ item.id }}" class="item">
        {{ item.name }}
        <button hx-delete="/items/{{ item.id }}" hx-target="#item-{{ item.id }}" hx-swap="outerHTML">
          Delete
        </button>
      </li>
    `, { item })
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    })
  })

  .delete('/items/:id', async ({ params }) => {
    await deleteItem(params.id)
    return new Response('', { status: 200 })
  })

  .listen(3000)
```

### Hono Integration

```typescript
import { Hono } from 'hono'
import { Environment } from 'binja'

const app = new Hono()

// Development with debug panel
const templates = new Environment({
  templates: './views',
  debug: process.env.NODE_ENV !== 'production',
  debugOptions: { dark: true, position: 'bottom-right' }
})

app.get('/', async (c) => {
  const html = await templates.render('index.html', {
    title: 'Home',
    user: c.get('user')
  })
  return c.html(html)
})

app.get('/products', async (c) => {
  const products = await getProducts()
  return c.html(await templates.render('products/list.html', { products }))
})
```

### Email Templates

```typescript
const env = new Environment({ templates: './emails' })

const html = await env.render('welcome.html', {
  user: { name: 'John', email: 'john@example.com' },
  activation_link: 'https://example.com/activate/xyz'
})

await sendEmail({
  to: user.email,
  subject: 'Welcome!',
  html
})
```

### PDF Generation

```typescript
import { Environment } from 'binja'

const templates = new Environment({ templates: './templates' })

// Render invoice HTML
const html = await templates.render('invoice.html', {
  invoice: {
    number: 'INV-2024-001',
    date: new Date(),
    customer: { name: 'Acme Corp', address: '123 Main St' },
    items: [
      { name: 'Service A', qty: 2, price: 100 },
      { name: 'Service B', qty: 1, price: 250 }
    ],
    total: 450
  }
})

// Use with any PDF library (puppeteer, playwright, etc.)
const pdf = await generatePDF(html)
```

### Static Site Generator

```typescript
import { Environment } from 'binja'
import { readdir, writeFile, mkdir } from 'fs/promises'

const env = new Environment({ templates: './src/templates' })

// Build all pages
const pages = [
  { template: 'index.html', output: 'dist/index.html', data: { title: 'Home' } },
  { template: 'about.html', output: 'dist/about.html', data: { title: 'About' } },
  { template: 'contact.html', output: 'dist/contact.html', data: { title: 'Contact' } }
]

await mkdir('dist', { recursive: true })

for (const page of pages) {
  const html = await env.render(page.template, page.data)
  await writeFile(page.output, html)
  console.log(`Built: ${page.output}`)
}
```

---

## Acknowledgments

binja is inspired by and aims to be compatible with:

- **[Jinja2](https://jinja.palletsprojects.com/)** - The original Python template engine by Pallets Projects (BSD-3-Clause)
- **[Django Template Language](https://docs.djangoproject.com/en/stable/ref/templates/language/)** - Django's built-in template system (BSD-3-Clause)

---

## License

BSD-3-Clause

See [LICENSE](./LICENSE) for details.

---

<p align="center">
  Made with ❤️ for the Bun ecosystem
</p>
