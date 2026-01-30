---
title: compile()
description: API reference for AOT compilation functions
---

The `compile()` function provides AOT (Ahead-of-Time) template compilation for maximum performance.

## compile()

Compile a template string into an optimized function.

### Signature

```typescript
function compile(
  template: string,
  options?: CompileOptions
): (context: Record<string, any>) => string
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `template` | `string` | Template string to compile |
| `options` | `CompileOptions` | Optional configuration |

### Options

```typescript
interface CompileOptions {
  autoescape?: boolean  // HTML escape by default (default: true)
  filters?: Record<string, FilterFunction>  // Custom filters
}
```

### Basic Usage

```typescript
import { compile } from 'binja'

// Compile once at startup
const renderUser = compile('<h1>{{ name|upper }}</h1>')

// Use many times (sync, extremely fast!)
const html = renderUser({ name: 'john' })
// Output: <h1>JOHN</h1>
```

### Production Pattern

```typescript
import { compile } from 'binja'

// Pre-compile all templates at server startup
const templates = {
  home: compile(await Bun.file('./views/home.html').text()),
  user: compile(await Bun.file('./views/user.html').text()),
  product: compile(await Bun.file('./views/product.html').text()),
}

// Rendering is synchronous and extremely fast
app.get('/', () => templates.home({ title: 'Welcome' }))
app.get('/user/:id', ({ params }) => templates.user({ id: params.id }))
```

### With Custom Filters

```typescript
const template = compile('{{ price|currency }}', {
  filters: {
    currency: (value) => `$${value.toFixed(2)}`
  }
})

const html = template({ price: 42.5 })
// Output: $42.50
```

## compileToCode()

Generate JavaScript code string for build tools.

### Signature

```typescript
function compileToCode(
  template: string,
  options?: CompileToCodeOptions
): string
```

### Options

```typescript
interface CompileToCodeOptions {
  functionName?: string  // Name of generated function (default: 'render')
  autoescape?: boolean   // HTML escape by default (default: true)
}
```

### Basic Usage

```typescript
import { compileToCode } from 'binja'

const code = compileToCode('<h1>{{ title }}</h1>', {
  functionName: 'renderHeader'
})

// Save to file for bundling
await Bun.write('./compiled/header.js', code)
```

### Generated Code Example

```javascript
// Input: <h1>{{ title|upper }}</h1>
// Output:
export function renderHeader(ctx) {
  let __out = '';
  __out += '<h1>';
  __out += escape(ctx.title.toUpperCase());
  __out += '</h1>';
  return __out;
}
```

## Supported Features

| Feature | Supported |
|---------|-----------|
| Variables | Yes |
| Filters (all 84) | Yes |
| Conditionals | Yes |
| Loops | Yes |
| Set/With | Yes |
| Comments | Yes |
| Raw/Verbatim | Yes |
| `{% extends %}` | No* |
| `{% include %}` | No* |

*Use `Environment` with caching for template inheritance.

## Performance

| Mode | Speed | vs Nunjucks |
|------|-------|-------------|
| `compile()` | 14.3M ops/s | **160x faster** |
| `render()` | 371K ops/s | 3.9x faster |

## Error Handling

Compilation errors are thrown at compile time:

```typescript
try {
  const template = compile('{{ invalid syntax }')
} catch (error) {
  console.error('Compilation error:', error.message)
}
```

Runtime errors are thrown during rendering:

```typescript
const template = compile('{{ user.name }}')

try {
  const html = template({ user: null })
} catch (error) {
  console.error('Render error:', error.message)
}
```

## See Also

- [`render()`](/binja/api/render/) - Runtime rendering
- [`Environment`](/binja/api/environment/) - Template inheritance support
- [AOT Compilation Guide](/binja/guide/aot/) - Best practices
