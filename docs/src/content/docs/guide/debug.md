---
title: Debug Panel
description: Development tools similar to Django Debug Toolbar
---

binja includes a professional debug panel for development, similar to Django Debug Toolbar.

## Enable Debug Panel

```typescript
const env = new Environment({
  templates: './templates',
  debug: true,  // Enable debug panel
})

// Debug panel is automatically injected into HTML responses
const html = await env.render('page.html', context)
```

## Features

### Performance Metrics

- **Lexer timing** - How long tokenization took
- **Parser timing** - How long AST generation took
- **Render timing** - How long template execution took
- **Visual bars** - Proportional timing display

### Template Chain

See the full template hierarchy:

```
page.html
  └── extends: layouts/base.html
        └── include: components/header.html
        └── include: components/footer.html
```

### Context Inspector

Expandable tree view of all context variables:

```
context
├── user
│   ├── name: "John"
│   ├── email: "john@example.com"
│   └── is_admin: true
├── items: Array(3)
└── title: "Home"
```

### Filter Usage

Track which filters were used:

| Filter | Count |
|--------|-------|
| `upper` | 3 |
| `truncatechars` | 2 |
| `date` | 1 |

### Cache Stats

Monitor template cache performance:

- **Size** - Number of cached templates
- **Hit rate** - Cache efficiency percentage
- **Hits/Misses** - Raw counts

### Warnings

Optimization suggestions:

- Unused variables in context
- Heavy operations in loops
- Missing `{% empty %}` blocks

## Configuration

```typescript
const env = new Environment({
  templates: './templates',
  debug: true,
  debugOptions: {
    dark: true,              // Dark theme (default: false)
    collapsed: true,         // Start collapsed (default: false)
    position: 'bottom-right', // Panel position
    width: 420,              // Panel width in pixels
  }
})
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dark` | `boolean` | `false` | Dark/light theme |
| `collapsed` | `boolean` | `false` | Start collapsed |
| `position` | `string` | `'bottom-right'` | Panel position |
| `width` | `number` | `400` | Panel width (px) |

### Position Values

- `top-left`
- `top-right`
- `bottom-left`
- `bottom-right`

## Environment-Based Toggle

```typescript
const env = new Environment({
  templates: './templates',
  debug: process.env.NODE_ENV !== 'production',
})
```

Or with Bun:

```typescript
const env = new Environment({
  templates: './templates',
  debug: Bun.env.NODE_ENV !== 'production',
})
```

## Panel Interaction

The debug panel is:

- **Draggable** - Click and drag the header
- **Collapsible** - Click sections to expand/collapse
- **Resizable** - Drag panel edges
- **Dismissible** - Close button hides until next render

## Programmatic Access

Access debug data without the panel:

```typescript
import { DebugCollector } from 'binja/debug'

const collector = new DebugCollector()

// Render with collector
const html = await env.render('page.html', context, { collector })

// Access debug data
console.log(collector.timing)
// { lexer: 0.5, parser: 1.2, render: 2.3 }

console.log(collector.context)
// { user: { name: 'John' }, ... }

console.log(collector.filters)
// { upper: 3, date: 1 }
```

## Production Warning

The debug panel should **never** be enabled in production:

```typescript
// Good - environment-based
debug: process.env.NODE_ENV !== 'production'

// Bad - always on
debug: true
```

The debug panel:
- Exposes internal template structure
- Shows context variables (may contain sensitive data)
- Adds overhead to every render
- Injects HTML/CSS/JS into responses
