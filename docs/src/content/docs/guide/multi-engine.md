---
title: Multi-engine overview
description: Use Binja's documented Handlebars, Liquid, and Twig compatibility subsets.
---

Binja exposes three secondary parsers over the shared runtime. They are compatibility subsets, not embedded copies of the upstream engines.

## Imports

```ts
import { MultiEngine, detectEngine, getEngine } from 'binja/engines'
import * as handlebars from 'binja/engines/handlebars'
import * as liquid from 'binja/engines/liquid'
import * as twig from 'binja/engines/twig'
```

All subpaths are package exports and are covered by the package smoke test.

## Direct rendering

```ts
await handlebars.render('Hello {{name}}', { name: 'Ada' })
await liquid.render('Hello {{ name | upcase }}', { name: 'Ada' })
await twig.render('{{ enabled ? "yes" : "no" }}', { enabled: true })
```

Each module exports `parse`, `compile`, `render`, and an `engine` descriptor. Secondary-engine `compile()` caches parsing but returns an asynchronous render function:

```ts
const renderLiquid = liquid.compile('{{ name | upcase }}')
const output = await renderLiquid({ name: 'Ada' })
```

It is not the synchronous AOT compiler used by core `compile()`.

## `MultiEngine`

```ts
const engines = new MultiEngine('jinja2')

await engines.render('Hello {{ name }}', { name: 'Ada' }, 'liquid')
const renderHbs = engines.compile('{{name}}', 'handlebars')
await renderHbs({ name: 'Ada' })
```

Core aliases are `jinja2`, `jinja`, `dtl`, and `django`. Secondary aliases include `handlebars`/`hbs`, `liquid`, and `twig`.

`getEngine(nameOrExtension)` and `detectEngine(filePath)` recognize `.hbs`, `.handlebars`, `.liquid`, `.twig`, and `.html.twig`. Unknown or extensionless inputs return `undefined`; the top-level multi-engine `render()` falls back to the core engine when no requested engine resolves.

## Tested feature matrix

| Feature | Core | Handlebars subset | Liquid subset | Twig subset |
|---|---|---|---|---|
| Nested variables | Yes | Yes | Yes | Yes |
| Escaped output | Yes | Yes | Yes | Yes |
| Conditions | `if`/`elif` | `if`/`unless` | `if`/`elsif`/`unless`/`case` | `if`/`elseif`, ternary, `??` |
| Loops | `for`/`empty` | `each`/`else` | `for`/`else`, modifiers, ranges | Core `for` syntax |
| Assignment | `set` | No | `assign`, `capture`, counters | `set` |
| Loader-backed dependencies in direct module API | Core `Environment` only | No | No | No |

## Shared and non-shared behavior

The modules share runtime escaping, protected property access, truthiness, built-in filters/tests where their parsers emit those nodes, and render-state isolation. Parser syntax and aliases still differ.

Do not assume every one of Binja's core filters parses naturally in every syntax. For example, Liquid supplies common aliases (`upcase`, `downcase`, `strip`, `size`, `truncate`, `json`), while Twig maps names such as `raw`, `json_encode`, `number_format`, `keys`, and `merge`.

## Loader limitation

The direct secondary-engine APIs accept source strings and do not expose loader/partial registration. A parsed Handlebars partial, Liquid `include`/`render`, or Twig `include`/`extends` therefore fails when it tries to load another template. Use the core `Environment` where compatible core syntax is acceptable, or resolve/compose dependencies in application code.

## Migration rule

Run representative templates in tests before migration. Upstream host objects, plugins, custom helpers, drops, macros, namespaces, and framework integrations are outside the subset unless explicitly documented on the engine page.
