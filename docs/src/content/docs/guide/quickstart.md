---
title: Quick Start
description: Get up and running with binja in 5 minutes
---

## Basic Usage

### Simple Rendering

```typescript
import { render } from 'binja'

// Render a template string
const greeting = await render('Hello, {{ name }}!', { name: 'World' })
// Output: Hello, World!

// With filters
const heading = await render('{{ title|upper|truncatechars:20 }}', {
  title: 'Welcome to our amazing website'
})
// Output: WELCOME TO OUR AMAZI...
```

### Using Environment

For production applications, use `Environment` for template file loading and configuration:

```typescript
import { Environment } from 'binja'

const env = new Environment({
  templates: './views',      // Template directory
  autoescape: true,          // XSS protection (default)
})

// Render template file
const html = await env.render('pages/home.html', {
  user: { name: 'John', email: 'john@example.com' },
  items: ['Apple', 'Banana', 'Cherry']
})
```

### AOT compilation

Use `compile()` when a supported static template needs a reusable synchronous render function:

```typescript
import { compile } from 'binja'

// Compile once at startup
const renderUser = compile('<h1>{{ name|upper }}</h1>')

// Use many times (synchronous)
const html = renderUser({ name: 'john' })
// Output: <h1>JOHN</h1>
```

## Template Syntax

### Variables

```jinja
{{ user.name }}
{{ user.email|lower }}
{{ items.0 }}
{{ data['key'] }}
```

### Conditionals

```jinja
{% if user.is_admin %}
  <span class="badge">Admin</span>
{% elif user.is_staff %}
  <span class="badge">Staff</span>
{% else %}
  <span class="badge">User</span>
{% endif %}
```

### Loops

```jinja
{% for item in items %}
  <div class="{{ loop.first ? 'first' : '' }}">
    {{ loop.index }}. {{ item.name }}
  </div>
{% empty %}
  <p>No items found.</p>
{% endfor %}
```

### Template Inheritance

**base.html**
```jinja
<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}Default{% endblock %}</title>
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>
```

**page.html**
```jinja
{% extends "base.html" %}

{% block title %}My Page{% endblock %}

{% block content %}
  <h1>Welcome!</h1>
{% endblock %}
```

## Framework Integration

### Hono

```typescript
import { Hono } from 'hono'
import { binja } from 'binja/hono'

const app = new Hono()

app.use(binja({
  root: './views',
  cache: true,
}))

app.get('/', (c) => c.render('index', { title: 'Home' }))

export default app
```

### Elysia

```typescript
import { Elysia } from 'elysia'
import { binja } from 'binja/elysia'

const app = new Elysia()
  .use(binja({
    root: './views',
    cache: true,
  }))
  .get('/', ({ render }) => render('index', { title: 'Home' }))
  .listen(3000)
```

## Next Steps

- [Variables & Expressions](/binja/guide/variables/) - Learn template syntax
- [Filters](/binja/guide/filters/) - 91 registry entries, including aliases
- [AOT Compilation](/binja/guide/aot/) - Synchronous rendering for supported static templates
