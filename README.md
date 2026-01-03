<h1 align="center">binja</h1>

<p align="center">
  <strong>High-performance Jinja2/Django template engine for Bun - 2-4x faster than Nunjucks</strong>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#framework-adapters">Hono/Elysia</a> •
  <a href="#multi-engine-support">Multi-Engine</a> •
  <a href="#filters-84-built-in">Filters</a>
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
| **Runtime Performance** | ✅ 2-4x faster | ❌ |
| **AOT Compilation** | ✅ 160x faster | ❌ |
| **Multi-Engine** | ✅ Jinja2, Handlebars, Liquid, Twig | ❌ |
| **Framework Adapters** | ✅ Hono, Elysia | ❌ |
| Django DTL Compatible | ✅ 100% | ❌ Partial |
| Jinja2 Compatible | ✅ Full | ⚠️ Limited |
| Template Inheritance | ✅ | ⚠️ |
| 84 Built-in Filters | ✅ | ❌ |
| 28 Built-in Tests | ✅ | ❌ |
| Debug Panel | ✅ | ❌ |
| CLI Tool | ✅ | ⚠️ |
| Autoescape by Default | ✅ | ❌ |
| TypeScript | ✅ Native | ⚠️ |
| Bun Optimized | ✅ | ❌ |

---

## Benchmarks

Tested on Mac Studio M1 Max, Bun 1.3.5.

### Two Rendering Modes

| Mode | Function | Best For | vs Nunjucks |
|------|----------|----------|-------------|
| **Runtime** | `render()` | Development | **2-4x faster** |
| **AOT** | `compile()` | Production | **160x faster** |

### Runtime Performance (vs Nunjucks)

| Benchmark | binja | Nunjucks | Speedup |
|-----------|-------|----------|---------|
| Simple Template | 371K ops/s | 96K ops/s | **3.9x** |
| Complex Template | 44K ops/s | 23K ops/s | **2.0x** |
| Multiple Filters | 246K ops/s | 63K ops/s | **3.9x** |
| Nested Loops | 76K ops/s | 26K ops/s | **3.0x** |
| Conditionals | 84K ops/s | 25K ops/s | **3.4x** |
| HTML Escaping | 985K ops/s | 242K ops/s | **4.1x** |
| Large Dataset | 9.6K ops/s | 6.6K ops/s | **1.5x** |

### AOT Compilation (Maximum Performance)

| Benchmark | binja AOT | binja Runtime | Speedup |
|-----------|-----------|---------------|---------|
| Simple Template | **14.3M ops/s** | 371K ops/s | 39x |
| Complex Template | **1.07M ops/s** | 44K ops/s | 24x |
| Nested Loops | **1.75M ops/s** | 76K ops/s | 23x |

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

## Filters (84 Built-in)

binja includes **84 built-in filters** covering both Jinja2 and Django Template Language.

### String Filters (26)

| Filter | Description | Example |
|--------|-------------|---------|
| `upper` | Uppercase | `{{ "hello"\|upper }}` → `HELLO` |
| `lower` | Lowercase | `{{ "HELLO"\|lower }}` → `hello` |
| `capitalize` | First letter uppercase | `{{ "hello"\|capitalize }}` → `Hello` |
| `capfirst` | First char uppercase | `{{ "hello"\|capfirst }}` → `Hello` |
| `title` | Title case | `{{ "hello world"\|title }}` → `Hello World` |
| `trim` | Strip whitespace | `{{ "  hi  "\|trim }}` → `hi` |
| `striptags` | Remove HTML tags | `{{ "<p>Hi</p>"\|striptags }}` → `Hi` |
| `slugify` | URL-friendly slug | `{{ "Hello World!"\|slugify }}` → `hello-world` |
| `truncatechars` | Truncate to N chars | `{{ "hello"\|truncatechars:3 }}` → `hel...` |
| `truncatewords` | Truncate to N words | `{{ "a b c d"\|truncatewords:2 }}` → `a b...` |
| `truncatechars_html` | Truncate preserving HTML | `{{ "<b>hi</b> world"\|truncatechars_html:5 }}` |
| `truncatewords_html` | Truncate words in HTML | `{{ "<p>a b c</p>"\|truncatewords_html:2 }}` |
| `wordcount` | Count words | `{{ "hello world"\|wordcount }}` → `2` |
| `wordwrap` | Wrap at N chars | `{{ text\|wordwrap:40 }}` |
| `center` | Center in N chars | `{{ "hi"\|center:10 }}` → `    hi    ` |
| `ljust` | Left justify | `{{ "hi"\|ljust:10 }}` → `hi        ` |
| `rjust` | Right justify | `{{ "hi"\|rjust:10 }}` → `        hi` |
| `cut` | Remove substring | `{{ "hello"\|cut:"l" }}` → `heo` |
| `replace` | Replace substring | `{{ "hello"\|replace:"l","x" }}` → `hexxo` |
| `indent` | Indent lines | `{{ text\|indent:4 }}` |
| `linebreaks` | Newlines to `<p>/<br>` | `{{ text\|linebreaks }}` |
| `linebreaksbr` | Newlines to `<br>` | `{{ text\|linebreaksbr }}` |
| `linenumbers` | Add line numbers | `{{ code\|linenumbers }}` |
| `addslashes` | Escape quotes | `{{ "it's"\|addslashes }}` → `it\'s` |
| `format` | sprintf-style format | `{{ "Hi %s"\|format:name }}` |
| `stringformat` | Python % format | `{{ 5\|stringformat:"03d" }}` → `005` |

### Number Filters (9)

| Filter | Description | Example |
|--------|-------------|---------|
| `abs` | Absolute value | `{{ -5\|abs }}` → `5` |
| `int` | Convert to integer | `{{ "42"\|int }}` → `42` |
| `float` | Convert to float | `{{ "3.14"\|float }}` → `3.14` |
| `round` | Round number | `{{ 3.7\|round }}` → `4` |
| `add` | Add number | `{{ 5\|add:3 }}` → `8` |
| `divisibleby` | Check divisibility | `{{ 10\|divisibleby:2 }}` → `true` |
| `floatformat` | Format decimal places | `{{ 3.14159\|floatformat:2 }}` → `3.14` |
| `filesizeformat` | Human file size | `{{ 1048576\|filesizeformat }}` → `1.0 MB` |
| `get_digit` | Get Nth digit | `{{ 12345\|get_digit:2 }}` → `4` |

### List/Array Filters (22)

| Filter | Description | Example |
|--------|-------------|---------|
| `length` | List length | `{{ items\|length }}` → `3` |
| `length_is` | Check length | `{{ items\|length_is:3 }}` → `true` |
| `first` | First item | `{{ items\|first }}` |
| `last` | Last item | `{{ items\|last }}` |
| `join` | Join with separator | `{{ items\|join:", " }}` → `a, b, c` |
| `slice` | Slice list | `{{ items\|slice:":2" }}` |
| `reverse` | Reverse list | `{{ items\|reverse }}` |
| `sort` | Sort list | `{{ items\|sort }}` |
| `unique` | Remove duplicates | `{{ items\|unique }}` |
| `batch` | Group into batches | `{{ items\|batch:2 }}` |
| `columns` | Split into columns | `{{ items\|columns:3 }}` |
| `dictsort` | Sort dict by key | `{{ dict\|dictsort }}` |
| `dictsortreversed` | Sort dict reversed | `{{ dict\|dictsortreversed }}` |
| `groupby` | Group by attribute | `{{ items\|groupby:"category" }}` |
| `random` | Random item | `{{ items\|random }}` |
| `list` | Convert to list | `{{ value\|list }}` |
| `make_list` | String to char list | `{{ "abc"\|make_list }}` → `['a','b','c']` |
| `map` | Map attribute | `{{ items\|map:"name" }}` |
| `select` | Filter by test | `{{ items\|select:"even" }}` |
| `reject` | Reject by test | `{{ items\|reject:"none" }}` |
| `selectattr` | Filter by attr test | `{{ items\|selectattr:"active" }}` |
| `rejectattr` | Reject by attr test | `{{ items\|rejectattr:"hidden" }}` |

### Math Filters (4)

| Filter | Description | Example |
|--------|-------------|---------|
| `max` | Maximum value | `{{ items\|max }}` |
| `min` | Minimum value | `{{ items\|min }}` |
| `sum` | Sum of values | `{{ items\|sum }}` |
| `attr` | Get attribute | `{{ item\|attr:"name" }}` |

### Date/Time Filters (4)

| Filter | Description | Example |
|--------|-------------|---------|
| `date` | Format date | `{{ now\|date:"Y-m-d" }}` → `2024-01-15` |
| `time` | Format time | `{{ now\|time:"H:i" }}` → `14:30` |
| `timesince` | Time since date | `{{ past\|timesince }}` → `2 days ago` |
| `timeuntil` | Time until date | `{{ future\|timeuntil }}` → `in 3 hours` |

#### Timezone Support

```typescript
const env = new Environment({
  timezone: 'Europe/Rome'  // All dates in Rome timezone
})
```

### Safety & Encoding Filters (13)

| Filter | Description | Example |
|--------|-------------|---------|
| `escape` / `e` | HTML escape | `{{ html\|escape }}` |
| `forceescape` | Force HTML escape | `{{ html\|forceescape }}` |
| `safe` | Mark as safe | `{{ html\|safe }}` |
| `safeseq` | Mark sequence safe | `{{ items\|safeseq }}` |
| `escapejs` | JS string escape | `{{ text\|escapejs }}` |
| `urlencode` | URL encode | `{{ url\|urlencode }}` |
| `iriencode` | IRI encode | `{{ url\|iriencode }}` |
| `urlize` | URLs to links | `{{ text\|urlize }}` |
| `urlizetrunc` | URLs to links (truncated) | `{{ text\|urlizetrunc:15 }}` |
| `json` / `tojson` | JSON stringify | `{{ data\|json }}` |
| `json_script` | Safe JSON in script | `{{ data\|json_script:"id" }}` |
| `pprint` | Pretty print | `{{ data\|pprint }}` |
| `xmlattr` | Dict to XML attrs | `{{ attrs\|xmlattr }}` |

### Default/Conditional Filters (4)

| Filter | Description | Example |
|--------|-------------|---------|
| `default` / `d` | Default value | `{{ missing\|default:"N/A" }}` |
| `default_if_none` | Default if null | `{{ val\|default_if_none:"None" }}` |
| `yesno` | Boolean to text | `{{ true\|yesno:"Yes,No" }}` → `Yes` |
| `pluralize` | Pluralize suffix | `{{ count\|pluralize }}` → `s` |

### Misc Filters (2)

| Filter | Description | Example |
|--------|-------------|---------|
| `items` | Dict to pairs | `{% for k,v in dict\|items %}` |
| `unordered_list` | Nested list to HTML | `{{ items\|unordered_list }}` |

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

// All 28 built-in tests
console.log(Object.keys(builtinTests))
// ['divisibleby', 'even', 'odd', 'number', 'integer', 'float',
//  'defined', 'undefined', 'none', 'boolean', 'string', 'mapping',
//  'iterable', 'sequence', 'callable', 'upper', 'lower', 'empty',
//  'in', 'eq', 'ne', 'sameas', 'equalto', 'truthy', 'falsy', ...]
```

---

## Multi-Engine Support

Binja supports multiple template engines through a unified API. All engines parse to a common AST and share the same runtime, filters, and optimizations.

### Supported Engines

| Engine | Syntax | Use Case |
|--------|--------|----------|
| **Jinja2/DTL** | `{{ var }}` `{% if %}` | Default, Python/Django compatibility |
| **Handlebars** | `{{var}}` `{{#if}}` | JavaScript ecosystem, Ember.js |
| **Liquid** | `{{ var }}` `{% if %}` | Shopify, Jekyll, static sites |
| **Twig** | `{{ var }}` `{% if %}` | PHP/Symfony, Drupal, Craft CMS |

### Usage

```typescript
// Direct engine imports
import * as handlebars from 'binja/engines/handlebars'
import * as liquid from 'binja/engines/liquid'
import * as twig from 'binja/engines/twig'

// Handlebars
await handlebars.render('Hello {{name}}!', { name: 'World' })
await handlebars.render('{{#each items}}{{this}}{{/each}}', { items: ['a', 'b'] })
await handlebars.render('{{{html}}}', { html: '<b>unescaped</b>' })

// Liquid (Shopify)
await liquid.render('Hello {{ name }}!', { name: 'World' })
await liquid.render('{% for item in items %}{{ item }}{% endfor %}', { items: ['a', 'b'] })
await liquid.render('{% assign x = "value" %}{{ x }}', {})

// Twig (Symfony)
await twig.render('Hello {{ name }}!', { name: 'World' })
await twig.render('{% for item in items %}{{ item }}{% endfor %}', { items: ['a', 'b'] })
await twig.render('{{ name|upper }}', { name: 'world' })
```

### MultiEngine API

```typescript
import { MultiEngine } from 'binja/engines'

const engine = new MultiEngine()

// Render with any engine
await engine.render('Hello {{name}}!', { name: 'World' }, 'handlebars')
await engine.render('Hello {{ name }}!', { name: 'World' }, 'liquid')
await engine.render('Hello {{ name }}!', { name: 'World' }, 'twig')
await engine.render('Hello {{ name }}!', { name: 'World' }, 'jinja2')

// Auto-detect from file extension
import { detectEngine } from 'binja/engines'
const eng = detectEngine('template.hbs')     // Returns Handlebars engine
const eng2 = detectEngine('page.liquid')     // Returns Liquid engine
const eng3 = detectEngine('page.twig')       // Returns Twig engine
```

### Engine Feature Matrix

| Feature | Jinja2 | Handlebars | Liquid | Twig |
|---------|--------|------------|--------|------|
| Variables | `{{ x }}` | `{{x}}` | `{{ x }}` | `{{ x }}` |
| Conditionals | `{% if %}` | `{{#if}}` | `{% if %}` | `{% if %}` |
| Loops | `{% for %}` | `{{#each}}` | `{% for %}` | `{% for %}` |
| Filters | `{{ x\|filter }}` | `{{ x }}` | `{{ x \| filter }}` | `{{ x\|filter }}` |
| Raw output | `{% raw %}` | - | `{% raw %}` | `{% raw %}` |
| Comments | `{# #}` | `{{! }}` | `{% comment %}` | `{# #}` |
| Assignment | `{% set %}` | - | `{% assign %}` | `{% set %}` |
| Unescaped | `{{ x\|safe }}` | `{{{x}}}` | - | `{{ x\|raw }}` |

---

## Framework Adapters

Binja provides first-class integration with Bun's most popular web frameworks.

### Hono

```typescript
import { Hono } from 'hono'
import { binja } from 'binja/hono'

const app = new Hono()

// Add binja middleware
app.use(binja({
  root: './views',           // Template directory
  extension: '.html',        // Default extension
  engine: 'jinja2',          // jinja2 | handlebars | liquid | twig
  cache: true,               // Cache compiled templates
  globals: { siteName: 'My App' },  // Global context
  layout: 'layouts/base',    // Optional layout template
}))

// Render templates with c.render()
app.get('/', (c) => c.render('index', { title: 'Home' }))
app.get('/users/:id', async (c) => {
  const user = await getUser(c.req.param('id'))
  return c.render('users/profile', { user })
})

export default app
```

### Elysia

```typescript
import { Elysia } from 'elysia'
import { binja } from 'binja/elysia'

const app = new Elysia()
  // Add binja plugin
  .use(binja({
    root: './views',
    extension: '.html',
    engine: 'jinja2',
    cache: true,
    globals: { siteName: 'My App' },
    layout: 'layouts/base',
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

### Adapter Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `string` | `./views` | Template directory |
| `extension` | `string` | `.html` | Default file extension |
| `engine` | `string` | `jinja2` | Template engine (`jinja2`, `handlebars`, `liquid`, `twig`) |
| `cache` | `boolean` | `true` (prod) | Cache compiled templates |
| `debug` | `boolean` | `false` | Show error details |
| `globals` | `object` | `{}` | Global context variables |
| `layout` | `string` | - | Layout template path |
| `contentVar` | `string` | `content` | Content variable name in layout |

### Cache Management

```typescript
import { clearCache, getCacheStats } from 'binja/hono'
// or
import { clearCache, getCacheStats } from 'binja/elysia'

// Clear all cached templates
clearCache()

// Get cache statistics
const stats = getCacheStats()
console.log(stats) // { size: 10, keys: ['jinja2:./views/index.html', ...] }
```

---

## Django Compatibility

binja is designed to be a drop-in replacement for Django templates:

```django
{# Django-style comments #}

{% load static %}  {# Supported (no-op) #}

{% url 'home' %}
{% static 'css/style.css' %}

{% csrf_token %}

{{ forloop.counter }}
{{ forloop.first }}
{{ forloop.parentloop.counter }}
```

### Django-Specific Tags

| Tag | Description | Example |
|-----|-------------|---------|
| `{% csrf_token %}` | CSRF token input | `<input type="hidden" ...>` |
| `{% cycle %}` | Cycle through values | `{% cycle 'odd' 'even' %}` |
| `{% firstof %}` | First truthy value | `{% firstof var1 var2 "default" %}` |
| `{% ifchanged %}` | Output on change | `{% ifchanged %}{{ item }}{% endifchanged %}` |
| `{% ifequal %}` | Equality check | `{% ifequal a b %}equal{% endifequal %}` |
| `{% lorem %}` | Lorem ipsum text | `{% lorem 3 p %}` |
| `{% regroup %}` | Group list by attr | `{% regroup list by attr as grouped %}` |
| `{% templatetag %}` | Literal tag chars | `{% templatetag openblock %}` → `{%` |
| `{% widthratio %}` | Calculate ratio | `{% widthratio value max 100 %}` |
| `{% debug %}` | Debug context | Outputs context as JSON |

---

## Configuration

```typescript
const env = new Environment({
  // Template directory
  templates: './templates',

  // Auto-escape HTML (default: true)
  autoescape: true,

  // Cache settings
  cache: true,          // Enable template caching (default: true)
  cacheMaxSize: 100,    // LRU cache limit (default: 100)

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

// Cache monitoring
env.cacheSize()    // Number of cached templates
env.cacheStats()   // { size, maxSize, hits, misses, hitRate }
env.clearCache()   // Clear cache and reset stats
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
4. **LRU Cache** - Templates cached with LRU eviction (default: 100, prevents memory leaks)
5. **Monitor Cache** - Use `env.cacheStats()` to optimize `cacheMaxSize`

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

// Rendering
env.render(name, context)      // Render template file
env.renderString(str, context) // Render template string

// Configuration
env.addFilter(name, fn)        // Add custom filter
env.addGlobal(name, value)     // Add global variable

// Cache Management (LRU with configurable max size)
env.loadTemplate(name)         // Pre-load template (cache warming)
env.cacheSize()                // Get number of cached templates
env.cacheStats()               // Get { size, maxSize, hits, misses, hitRate }
env.clearCache()               // Clear all cached templates and reset stats
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
