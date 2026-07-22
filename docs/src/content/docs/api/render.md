---
title: render()
description: API reference for one-off asynchronous source-string rendering.
---

## Signature

```ts
function render(
  source: string,
  context?: Record<string, any>,
  options?: EnvironmentOptions
): Promise<string>
```

`render()` creates an `Environment` for the call and delegates to `renderString()`.

```ts
import { render } from 'binja'

const html = await render('Hello, {{ name|upper }}!', { name: 'Ada' })
```

## Options

The third argument accepts the same `EnvironmentOptions` as the class, including `autoescape`, `filters`, `globals`, resolvers, timezone, and debug settings.

```ts
const html = await render(
  '{{ price|currency }}',
  { price: 42.5 },
  {
    filters: { currency: (value: number) => `€${value.toFixed(2)}` },
  }
)
```

## Loader behavior

For repeated rendering, file loading, includes, inheritance, or caching, construct one `Environment` and reuse it. A one-off `render()` call does not retain a cache across calls.

## Escaping

Autoescape defaults to true:

```ts
await render('{{ html }}', { html: '<b>Bold</b>' })
// &lt;b&gt;Bold&lt;/b&gt;
```

Disabling it is appropriate only when every inserted value is already trusted:

```ts
await render('{{ trusted }}', { trusted: '<b>Bold</b>' }, { autoescape: false })
```

## Errors

Lexing/parsing errors include location metadata where available. Unknown filters/tests and render failures are rejected promises. Use `TemplateNotFoundError` when distinguishing loader failures in `Environment` workflows.

## Choosing another API

- Reuse an [`Environment`](/binja/api/environment/) for loaders, caches, custom registries, or many renders.
- Use [`compile()`](/binja/api/compile/) for a supported static template that must render synchronously.
