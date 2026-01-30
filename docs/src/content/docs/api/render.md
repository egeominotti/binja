---
title: render()
description: API reference for the render function
---

The `render()` function provides runtime template rendering. Best for development and templates with dynamic content.

## Signature

```typescript
function render(
  template: string,
  context?: Record<string, any>,
  options?: RenderOptions
): Promise<string>
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `template` | `string` | Template string to render |
| `context` | `object` | Variables available in template |
| `options` | `RenderOptions` | Optional configuration |

## Options

```typescript
interface RenderOptions {
  autoescape?: boolean       // HTML escape by default (default: true)
  filters?: Record<string, FilterFunction>  // Custom filters
  globals?: Record<string, any>  // Global variables
}
```

## Basic Usage

```typescript
import { render } from 'binja'

const html = await render('Hello, {{ name }}!', { name: 'World' })
// Output: Hello, World!
```

## With Filters

```typescript
const html = await render('{{ title|upper|truncatechars:20 }}', {
  title: 'Welcome to our amazing website'
})
// Output: WELCOME TO OUR AMAZI...
```

## With Conditionals

```typescript
const html = await render(`
  {% if user.is_admin %}
    <span class="badge">Admin</span>
  {% else %}
    <span class="badge">User</span>
  {% endif %}
`, {
  user: { is_admin: true }
})
```

## With Loops

```typescript
const html = await render(`
  {% for item in items %}
    <li>{{ loop.index }}. {{ item }}</li>
  {% empty %}
    <li>No items</li>
  {% endfor %}
`, {
  items: ['Apple', 'Banana', 'Cherry']
})
```

## Custom Filters

```typescript
const html = await render('{{ price|currency }}',
  { price: 42.5 },
  {
    filters: {
      currency: (value) => `$${value.toFixed(2)}`
    }
  }
)
// Output: $42.50
```

## Disabling Autoescape

```typescript
// Not recommended for user input!
const html = await render('{{ html }}',
  { html: '<b>Bold</b>' },
  { autoescape: false }
)
// Output: <b>Bold</b>
```

## Error Handling

```typescript
try {
  const html = await render('{{ invalid syntax }', {})
} catch (error) {
  console.error('Template error:', error.message)
}
```

## Performance Note

For production, consider using [`compile()`](/binja/api/compile/) for static templates (160x faster) or [`Environment`](/binja/api/environment/) with caching for templates with inheritance.

## See Also

- [`compile()`](/binja/api/compile/) - AOT compilation for maximum performance
- [`Environment`](/binja/api/environment/) - Full-featured template environment
