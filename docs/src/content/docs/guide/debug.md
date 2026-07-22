---
title: Debug Panel
description: Request-local template, context, cache, filter/test, and query telemetry for development.
---

## Enable through `Environment`

```ts
const env = new Environment({
  templates: './views',
  debug: Bun.env.NODE_ENV !== 'production',
  debugOptions: {
    position: 'bottom',
    height: 300,
    open: false,
    dark: true,
  },
})

const html = await env.render('page.html', context)
```

Automatic injection occurs only when the rendered string looks like a complete HTML document (`<html`, `<body`, or `<!DOCTYPE`).

## Collected data

- lexer, parser, render, and total timing;
- root, inheritance, and include template chain where observed;
- a depth-limited context snapshot with circular-reference handling;
- filter and test usage counts;
- cache hits and misses;
- manually or automatically recorded database/query telemetry;
- collector warnings.

Each injected panel gets a unique DOM ID, so multiple panels do not collide.

## Panel options

```ts
interface PanelOptions {
  position?: 'bottom' | 'right' | 'popup' // default: bottom
  height?: number                         // default: 300
  width?: number                          // default: 400
  open?: boolean                          // default: false
  dark?: boolean                          // default: true
}
```

The panel supports tab switching, bottom/right docking, popup mode, close/reopen, and resizing for docked modes.

## Explicit debug rendering

```ts
import {
  createDebugRenderer,
  renderStringWithDebug,
  renderWithDebug,
} from 'binja/debug'

await renderWithDebug(env, 'page.html', context, {
  htmlOnly: true,
  panel: { position: 'right' },
})

await renderStringWithDebug(env, source, context)

const debug = createDebugRenderer(env)
await debug.render('page.html', context)
```

## Request middleware

```ts
import { debugMiddleware } from 'binja/debug'

app.use(debugMiddleware(env).hono())
// or an Express-style middleware:
app.use(debugMiddleware(env).express())
```

Collection begins before the downstream request handler, allowing query wrappers invoked during the request to reach the same request-local collector.

## Query telemetry

`binja/debug` exports `recordQuery`, Prisma helpers, a Drizzle logger/wrapper, Bun SQL wrappers, and generic query wrappers. Integrations record only while a collector is active.

```ts
import { recordQuery } from 'binja/debug'

recordQuery({
  sql: 'select * from users where id = ?',
  params: [id],
  duration: 3.2,
  rows: 1,
  source: 'custom',
})
```

## Direct collection

```ts
import { withDebugCollection } from 'binja/debug'

const data = await withDebugCollection(async (collector) => {
  collector.captureContext(context)
  collector.startRender()
  await env.render('page.html', context)
  collector.endRender()
  return collector.getData()
})
```

## Production warning

Debug data can reveal secrets, personal data, SQL text/parameters, template names, and stack details. Escaping prevents HTML injection into the panel, but it does not prevent information disclosure. Keep the feature disabled in production and avoid placing credentials in render contexts.
