---
title: Introduction
description: Binja's execution modes, compatibility scope, and intended use.
---

Binja is a Bun-first TypeScript template engine. Its default syntax combines a tested subset of Jinja expressions with common Django Template Language tags and aliases.

## Capabilities

- asynchronous source-string and loader-backed rendering;
- synchronous AOT functions for the supported static subset;
- inheritance, includes, blocks, `block.super`, and LRU caching through `Environment`;
- autoescape by default, explicit safe strings, HTML-safe JSON, and protected property access;
- 91 filter registry entries and 35 test entries, including aliases;
- Hono and Elysia adapters;
- CLI compilation/check/lint workflows;
- debug collection and optional AI-assisted linting;
- Handlebars, Liquid, and Twig compatibility subsets.

## Compatibility is a tested subset

Binja does not claim complete Django, Jinja2, Handlebars, Liquid, or Twig compatibility. Upstream engines include extension APIs and host-specific behavior that Binja does not expose. Unsupported syntax should fail explicitly rather than disappear from output.

| Module | Intended scope | Important boundary |
|---|---|---|
| Core Jinja/DTL | Common variables, expressions, control flow, filters/tests, inheritance, includes, and selected Django tags | No Python extension ecosystem or complete upstream syntax |
| Handlebars | Variables, escaped/triple output, comments, `if`, `unless`, `each`, `with`, loop metadata | No custom-helper or partial registration API |
| Liquid | Common expressions, filters, `if`/`unless`/`case`, loops/modifiers/ranges, `assign`, `capture`, counters | No Shopify object/theme runtime; `break`/`continue` rejected |
| Twig | Common Jinja-like syntax plus `elseif`, `? :`, `??`, Twig filter aliases, `divisible by` | No Symfony extensions, macros, namespaces, or loader API in the Twig module |

## Rendering modes

### Runtime

```ts
import { render } from 'binja'

const html = await render('Hello {{ name }}', { name: 'Ada' })
```

Use `Environment` for file loading, includes, inheritance, cache management, resolvers, globals, custom filters, timezone handling, or debug mode.

### AOT

```ts
import { compile } from 'binja'

const renderCard = compile('<article>{{ title|upper }}</article>')
const html = renderCard({ title: 'News' })
```

AOT rendering is synchronous after compilation. It supports the common expression/control-flow subset and built-in filter/test registries. Dynamic template loading, URL/static resolver tags, and runtime-only nodes must use `Environment`.

### Static inheritance AOT

```ts
import { compileWithInheritance } from 'binja'

const renderPage = await compileWithInheritance('pages/home.html', {
  templates: './views',
})
```

Every `extends` and `include` target must be a literal so the flattener can resolve it safely during compilation.

## Intended use

Binja fits Bun server-side rendering, HTML/email generation, static build pipelines, and projects migrating a compatible subset of templates from another ecosystem. Run the target templates through `binja check` and regression tests before a migration; syntax similarity is not proof of full compatibility.

## Next steps

- [Installation](/binja/guide/installation/)
- [Quick start](/binja/guide/quickstart/)
- [AOT compilation](/binja/guide/aot/)
- [Security model](/binja/security/)
- [Benchmarks](/binja/guide/benchmarks/)
