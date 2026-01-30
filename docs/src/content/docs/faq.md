---
title: FAQ
description: Frequently asked questions about binja
---

## General

### What is binja?

binja is a high-performance Jinja2/Django Template Language engine built for the Bun runtime. It provides 100% compatibility with Django templates while being significantly faster than alternatives like Nunjucks.

### Why "binja"?

**B**un + J**inja** = **binja**. It's a Jinja2 implementation optimized for Bun.

### Does binja work with Node.js?

No, binja requires the [Bun](https://bun.sh) runtime. It uses Bun-specific APIs for maximum performance.

### Is binja production-ready?

Yes. binja is thoroughly tested with comprehensive test coverage for all features, filters, and edge cases.

## Performance

### How much faster is binja?

- **Runtime mode:** 2-4x faster than Nunjucks
- **AOT mode:** 160x faster than Nunjucks

See [Benchmarks](/binja/guide/benchmarks/) for detailed numbers.

### When should I use AOT compilation?

Use AOT (`compile()`) for:
- Static templates without inheritance
- Maximum performance requirements
- Production deployments

Use Runtime (`render()`) for:
- Templates with `{% extends %}` or `{% include %}`
- Development with frequent template changes
- Dynamic template loading

### Does caching help performance?

Yes, significantly. Enable caching with:

```typescript
const env = new Environment({
  cache: true,
  cacheMaxSize: 100, // Adjust based on your template count
})
```

## Compatibility

### Is binja compatible with Django templates?

Yes, binja aims for 100% Django Template Language (DTL) compatibility:
- All tags: `{% if %}`, `{% for %}`, `{% block %}`, `{% extends %}`, etc.
- All filters: `upper`, `lower`, `date`, `truncatechars`, etc.
- Loop variables: `forloop.counter`, `forloop.first`, `forloop.last`
- Template inheritance

### Is binja compatible with Jinja2?

Yes, binja supports Jinja2 syntax:
- `{% set %}` statements
- `{% raw %}` blocks
- `loop.index`, `loop.first`, `loop.last`
- Ternary expressions: `{{ value if condition else default }}`
- String concatenation: `{{ "a" ~ "b" }}`

### Can I use existing Django/Jinja2 templates?

In most cases, yes. Simply copy your templates and they should work. Some advanced features may need minor adjustments.

## Features

### What filters are included?

binja includes 84 built-in filters covering:
- String manipulation (26 filters)
- Number formatting (9 filters)
- List/Array operations (22 filters)
- Date/Time formatting (4 filters)
- Safety/Encoding (13 filters)
- Default values (4 filters)

See [Built-in Filters](/binja/guide/filters/) for the complete list.

### Can I add custom filters?

Yes:

```typescript
const env = new Environment({
  filters: {
    currency: (value) => `$${value.toFixed(2)}`,
    highlight: (text, term) => text.replace(term, `<mark>${term}</mark>`)
  }
})
```

### Does binja support template inheritance?

Yes, full support for Django-style template inheritance:

```django
{% extends "base.html" %}
{% block content %}...{% endblock %}
```

### What about includes?

Yes:

```django
{% include "header.html" %}
{% include "card.html" with title="Hello" %}
```

## Multi-Engine

### What template engines does binja support?

- **Jinja2/DTL** (default)
- **Handlebars**
- **Liquid** (Shopify)
- **Twig** (PHP/Symfony)

### Do all engines share the same filters?

Yes, all 84+ built-in filters work across all engines.

### Can I use different engines in the same project?

Yes:

```typescript
import * as handlebars from 'binja/engines/handlebars'
import * as liquid from 'binja/engines/liquid'
import { render } from 'binja' // Jinja2

await handlebars.render('{{name}}', { name: 'World' })
await liquid.render('{{ name }}', { name: 'World' })
await render('{{ name }}', { name: 'World' })
```

## Security

### Is autoescape enabled by default?

Yes, autoescape is enabled by default, protecting against XSS attacks:

```typescript
await render('{{ script }}', {
  script: '<script>alert("xss")</script>'
})
// Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

### How do I output raw HTML?

Use the `|safe` filter:

```django
{{ trusted_html|safe }}
```

Only use this with trusted content!

## Troubleshooting

### Template not found error

Ensure your `templates` path is correct:

```typescript
const env = new Environment({
  templates: './views', // Relative to working directory
})
```

### Filter not working

Check filter syntax. Django-style uses colons:

```django
{{ text|truncatechars:20 }}
```

Jinja2-style uses parentheses:

```django
{{ text|truncate(20) }}
```

Both work in binja.

### Double escaping

If you see `&amp;lt;` instead of `&lt;`, you're escaping twice. Use `|safe` on pre-escaped content:

```django
{{ already_escaped_html|safe }}
```
