<h1 align="center">binja</h1>

<p align="center">
  <strong>A Bun-first Jinja/Django-style template engine with runtime rendering, AOT compilation, framework adapters, and tested Handlebars, Liquid, and Twig subsets.</strong>
</p>

<p align="center">
  <a href="https://egeominotti.github.io/binja/"><strong>Documentation</strong></a> ·
  <a href="#installation">Installation</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#execution-modes">Execution modes</a> ·
  <a href="#security-model">Security</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/binja"><img src="https://img.shields.io/npm/v/binja?label=npm&color=10b981" alt="npm version"></a>
  <a href="https://github.com/egeominotti/binja/actions"><img src="https://github.com/egeominotti/binja/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/egeominotti/binja/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-BSD--3--Clause-blue.svg" alt="BSD-3-Clause License"></a>
</p>

Binja targets Bun `>=1.3.14` and TypeScript. The default engine implements a broad, tested Jinja/Django-compatible subset; it is not a byte-for-byte replacement for Python Jinja2 or Django Templates. The Handlebars, Liquid, and Twig modules are compatibility subsets implemented over the same AST/runtime and should not be treated as drop-in replacements for their upstream engines.

## Highlights

- Escaping is enabled by default, with explicit safe-string handling and HTML-safe JSON helpers.
- `Environment` loads templates with LRU caching, inheritance, includes, extension lookup, and root containment.
- `compile()` produces synchronous render functions for the supported static AOT subset.
- Hono and Elysia adapters support the core engine and the three secondary syntax modules.
- The package exposes 91 filter registry entries and 35 test registry entries, including aliases.
- The CLI checks AOT compatibility and generates executable ESM modules.
- Debug tooling records lexer, parser, render, filter/test, template, cache, and optional query telemetry.

## Installation

```sh
bun add binja
```

## Quick start

```ts
import { Environment, render } from 'binja'

const greeting = await render('Hello, {{ name }}!', { name: 'World' })

const env = new Environment({
  templates: './views',
  autoescape: true,
  cache: true,
  cacheMaxSize: 100,
  timezone: 'Europe/Rome',
  globals: { siteName: 'Example' },
})

const html = await env.render('pages/home.html', {
  user: { name: 'Ada' },
  items: ['one', 'two'],
})
```

`render()` and `Environment.renderString()` are asynchronous. The function returned by `compile()` is synchronous:

```ts
import { compile } from 'binja'

const renderCard = compile('<h2>{{ title|upper }}</h2>')
const html = renderCard({ title: 'Status' })
```

## Execution modes

| API | Result | Loader support | Best fit |
|---|---|---|---|
| `render(source, context, options?)` | `Promise<string>` | Uses a one-off environment configured by `options`; no cache survives the call | One-off source strings |
| `Environment.renderString(source, context?)` | `Promise<string>` | Includes and inheritance use that environment's loader | Configured source strings |
| `Environment.render(name, context?)` | `Promise<string>` | Yes; root-contained file loader and optional LRU cache | File templates and dynamic template names |
| `compile(source, options?)` | `(context) => string` | No runtime loading | Static templates on a hot path |
| `compileWithInheritance(name, options)` | `Promise<(context) => string>` | Static `extends`/`include` resolved at compile time | AOT file templates with literal dependencies |
| CLI `compile` | Importable ESM module | Static `extends`/`include` flattened at build time | Build pipelines |

Runtime and AOT share the same visible semantics for their common supported subset: Python-style `True`/`False`, Jinja truthiness, autoescape blocks, filters/tests, comparisons, loops, `set`, `with`, and `spaceless`.

The AOT compiler intentionally rejects runtime-only nodes such as dynamic includes, dynamic inheritance, URL/static resolvers, and unsupported tags. Use `Environment` when template names are dynamic.

## Core syntax

### Variables and expressions

```jinja
{{ user.name }}
{{ items.0 }}
{{ data['key'] }}
{{ title|default:'Untitled'|upper }}
{{ 'active' if enabled else 'disabled' }}
{{ value ?? fallback }}
```

Property reads block prototype-escape primitives such as `constructor`, `prototype`, and `__proto__`. Object membership uses own properties only.

### Conditions

```jinja
{% if user.is_admin %}
  Admin
{% elif user.is_staff %}
  Staff
{% else %}
  User
{% endif %}
```

### Loops

```jinja
{% for item in items %}
  {{ loop.index }}. {{ item.name }}
{% empty %}
  No items
{% endfor %}
```

Jinja aliases (`loop.index`, `loop.index0`, `loop.first`, `loop.last`, `loop.length`, `loop.revindex`) and Django aliases (`forloop.counter`, `counter0`, `first`, `last`, `revcounter`, `revcounter0`, `parentloop`) are available.

### Assignment and local scopes

```jinja
{% set total = price * quantity %}
{% with label=product.name amount=total %}
  {{ label }}: {{ amount }}
{% endwith %}
```

### Escaping controls

```jinja
{% autoescape false %}
  {{ trusted_fragment }}
{% endautoescape %}

{% spaceless %}
  <div> <span>{{ value }}</span> </div>
{% endspaceless %}
```

Only disable escaping for values already trusted by the application.

## Template loading, inheritance, and includes

```jinja
{# pages/home.html #}
{% extends 'layouts/base.html' %}

{% block title %}Home{% endblock %}

{% block content %}
  {% include 'partials/card.html' with item=featured %}
{% endblock %}
```

```ts
const env = new Environment({
  templates: './views',
  extensions: ['.html', '.jinja', '.jinja2', ''],
  cache: true,
})

await env.render('pages/home.html', { featured })
```

Template names are resolved beneath `templates`; lexical traversal and symlink escapes are rejected. Inheritance/include cycles are detected. `{% include ... ignore missing %}` suppresses only an actual `TemplateNotFoundError`, not parser or render failures inside an included template.

For static AOT inheritance:

```ts
import { compileWithInheritance } from 'binja'

const renderPage = await compileWithInheritance('pages/home.html', {
  templates: './views',
})
```

All referenced template names must be string literals for compile-time flattening.

## Environment configuration

```ts
const env = new Environment({
  templates: './views',
  extensions: ['.html', '.jinja', '.jinja2', ''],
  autoescape: true,
  cache: true,
  cacheMaxSize: 100,
  timezone: 'UTC',
  debug: false,
  debugOptions: { dark: true, collapsed: true },
  globals: { siteName: 'Example' },
  filters: {
    currency: (value: number) => `€${value.toFixed(2)}`,
  },
  urlResolver: (name, args, kwargs) => resolveRoute(name, args, kwargs),
  staticResolver: (file) => `/assets/${file}`,
})

env.addFilter('double', (value: number) => value * 2)
env.addGlobal('release', 'canary')
env.addUrl('user-detail', '/users/:id')

env.cacheSize()
env.cacheKeys() // LRU order, oldest to newest
env.cacheStats() // { size, maxSize, hits, misses, hitRate }
env.clearCache()
```

`cacheMaxSize` must be a positive integer. Cache state belongs to the `Environment`; render-local cycle, counter, block, and include state is isolated across concurrent requests.

## Filters and tests

The public registries currently contain 91 filter entries and 35 test entries. Counts include aliases such as `e`, `d`, `tojson`, `null`, and `equalto`; consumers should inspect the exported registries rather than assuming that each entry is a distinct algorithm.

```ts
import { builtinFilters, builtinTests } from 'binja'

console.log(Object.keys(builtinFilters))
console.log(Object.keys(builtinTests))
```

Important filter groups include:

- strings and formatting: `upper`, `lower`, `capitalize`, `title`, `trim`, `replace`, `format`, `truncatechars`, `truncatewords`, `wordwrap`, `indent`;
- collections: `length`, `first`, `last`, `join`, `slice`, `sort`, `unique`, `batch`, `columns`, `groupby`, `map`, `select`, `reject`, `selectattr`, `rejectattr`;
- mappings: `items`, `keys`, `merge`, `dictsort`, `attr`, `xmlattr`;
- numbers and dates: `abs`, `round`, `int`, `float`, `sum`, `min`, `max`, `date`, `time`, `timesince`, `timeuntil`;
- escaping and serialization: `escape`, `forceescape`, `safe`, `escapejs`, `urlencode`, `json`, `tojson`, `json_script`.

Tests cover type checks, equality/order comparisons, defined/null checks, collection semantics, case checks, membership, truthiness, and boolean aliases:

```jinja
{% if value is defined and value is not none %}...{% endif %}
{% if count is divisibleby(3) %}...{% endif %}
{% if items is empty %}...{% endif %}
```

See the documentation site for the full registry tables.

## Django-style facilities

The core parser/runtime supports a tested subset including:

- `{% load %}` as a compatibility no-op;
- `{% url %}` and `{% static %}` through configured resolvers;
- `{% csrf_token %}` using `csrf_token` or `csrfToken` from context;
- `cycle`, `firstof`, `ifchanged`, `ifequal`, `ifnotequal`, `lorem`, `regroup`, `templatetag`, `widthratio`, and `debug`.

`{% csrf_token %}` renders nothing when no token is supplied. Binja does not generate, validate, rotate, or store CSRF tokens; the host framework must do that work.

## Secondary engine subsets

Use the documented package subpaths:

```ts
import { MultiEngine } from 'binja/engines'
import * as handlebars from 'binja/engines/handlebars'
import * as liquid from 'binja/engines/liquid'
import * as twig from 'binja/engines/twig'
```

| Capability | Handlebars subset | Liquid subset | Twig subset |
|---|---|---|---|
| Variables / nested paths | Yes | Yes | Yes |
| Escaped output | `{{x}}` | `{{ x }}` | `{{ x }}` |
| Explicit raw output | `{{{x}}}` | `safe` filter where appropriate | `raw` filter alias |
| Conditions | `if`, `unless`, `else` | `if`, `elsif`, `unless`, `case` | `if`, `elseif`, `else`, ternary, `??` |
| Loops | `each` + metadata | `for`, `else`, `limit`, `offset`, `reversed`, ranges | Core `for` syntax |
| Assignment | No | `assign`, `capture`, increment/decrement counters | `set` |
| Loader-backed partials/includes | Not exposed by string API | Not exposed by string API | Not exposed by string API |

Notable boundaries:

- Handlebars custom helper registration and partial registration are not exposed; inside `with`/`each`, use the supported `this` paths.
- Liquid implements common syntax and filter aliases, not Shopify objects, theme filesystem semantics, drops, or the complete upstream tag/filter set. Unsupported tags fail explicitly. `break`/`continue` are currently rejected.
- Twig supports common expression/filter syntax but not PHP/Symfony extensions, functions, macros, namespaces, or loader integration through the string-only Twig API.
- `MultiEngine.compile()` returns a cached parsed-runtime function with an asynchronous result; only the core `compile()` API is synchronous AOT.

## Hono and Elysia adapters

```ts
import { Hono } from 'hono'
import { binja } from 'binja/hono'

const app = new Hono()
app.use(
  binja({
    root: './views',
    extension: '.html',
    engine: 'jinja2',
    cache: true,
    globals: { siteName: 'Example' },
    layout: 'layouts/base',
    contentVar: 'content',
  })
)

app.get('/', (c) => c.render('home', { title: 'Home' }))
```

```ts
import { Elysia } from 'elysia'
import { binja } from 'binja/elysia'

new Elysia()
  .use(binja({ root: './views', cache: true }))
  .get('/', ({ render }) => render('home', { title: 'Home' }))
```

For the core engine, cached and uncached adapter modes both use `Environment`, so includes and inheritance keep the same semantics. Adapter template and layout paths remain contained under `root`.

## CLI

```sh
# Generate importable ESM modules; static includes/inheritance are flattened.
binja compile ./views -o ./compiled

# Compile one template with a stable function name.
binja compile ./views/card.html -o ./compiled --name renderCard

# Validate syntax, flattenability, and AOT code generation.
binja check ./views

# Syntax lint, optionally emitted as JSON.
binja lint ./views
binja lint ./views --format=json

# Recompile a directory on changes.
binja watch ./views -o ./compiled
```

Generated modules import `builtinFilters` and `builtinTests` from `binja` and export both `render` and a default function. Dynamic include/extends expressions are rejected because they cannot be flattened at build time. A failed directory compile/check exits non-zero.

AI linting is optional. Use `--ai` or `--ai=<anthropic|openai|groq|ollama>` and configure the corresponding provider. Provider SDKs are optional peer dependencies.

## Debug tooling

```ts
const env = new Environment({
  templates: './views',
  debug: Bun.env.NODE_ENV !== 'production',
  debugOptions: { dark: true, position: 'bottom-right' },
})
```

The HTML panel can expose context values, template names, errors, and database-query details. Enable it only in trusted development environments and avoid collecting secrets. Helpers for Hono/Express middleware plus Prisma, Drizzle, Bun SQL, and generic query wrappers are exported from `binja/debug`.

## Security model

Templates are trusted application code. Context values, route/template names, JSON payloads, debug data, and generated attribute values are treated as untrusted.

- Autoescape is on by default. `safe` is an explicit trust assertion; never apply it to unsanitized input.
- `json`/`tojson` escape characters that could terminate an HTML script element. Prefer `json_script` for inert JSON data blocks.
- `escapejs` escapes JavaScript string content, but it does not make arbitrary code generation safe.
- `xmlattr` validates attribute names and escapes values.
- Template property resolution blocks common JavaScript prototype-escape primitives.
- File loaders and adapters reject traversal and symlink escapes outside their configured roots.
- Debug panels and `{% debug %}` are development tools and can reveal sensitive context.
- CSRF protection belongs to the host application; the tag only renders a supplied token.

Safe JSON example:

```jinja
{{ payload|json_script:'bootstrap-data' }}
<script>
  const payload = JSON.parse(document.getElementById('bootstrap-data').textContent)
</script>
```

## AOT code generation API

`compileToCode()` and `compileWithInheritanceToCode()` return low-level function source that expects Binja runtime helpers in scope. They are useful for build-tool integrations that provide that helper contract. For a directly importable module with the correct helpers and built-in registries, use the CLI.

```ts
import { compileToCode } from 'binja'

const functionSource = compileToCode('{{ title }}', {
  functionName: 'renderTitle',
  autoescape: true,
  minify: false,
})
```

Function names are validated before code generation.

## Benchmarks

The repository harness measures separate synchronous and asynchronous paths, performs correctness checks, excludes setup/compile time, consumes outputs, warms each case, and reports medians, min/max, and relative standard deviation.

Latest local audit run (2026-07-23, Apple M1 Max, 32 GiB, macOS arm64, Bun 1.3.14, 15 warmed rounds):

| Case | Mode | Median ops/s | Min–max ops/s | RSD |
|---|:---:|---:|---:|---:|
| Lexer, default delimiters (2.3K chars) | sync | 207,164 | 188,383–218,412 | 4.5% |
| Lexer, custom delimiters (2.3K chars) | sync | 209,161 | 196,276–212,770 | 2.6% |
| Runtime, simple cached AST | async | 2,420,551 | 1,443,419–2,554,591 | 11.4% |
| Runtime, loop over 100 items | async | 59,213 | 49,758–62,054 | 5.3% |
| AOT, simple | sync | 10,008,841 | 8,418,069–10,499,377 | 6.6% |
| AOT, loop over 100 items | sync | 124,117 | 119,064–125,873 | 1.7% |
| Liquid loop modifiers, 100 items | async | 185,745 | 167,322–200,620 | 5.5% |
| `rejectattr`, 20K items | sync | 6,013 | 5,870–6,089 | 1.0% |

These are local microbenchmarks, not universal throughput guarantees and not a cross-engine comparison. Re-run on the target deployment and compare only identical workloads:

```sh
bun run benchmark
BENCH_ROUNDS=15 bun run benchmark -- --json
```

## Package exports

```text
binja
binja/ai
binja/debug
binja/hono
binja/elysia
binja/engines
binja/engines/handlebars
binja/engines/liquid
binja/engines/twig
```

Every documented subpath is exercised by the package smoke test.

## Development

```sh
bun install
bun run typecheck
bun run check
bun run test:coverage
bun run build
bun run test:package
bun run benchmark
cd docs && bun run build
```

Repository-specific maintenance guidance is in [`AGENTS.md`](./AGENTS.md). The reusable audit workflow is in [`SKILL.md`](./SKILL.md).

## License

BSD-3-Clause. See [`LICENSE`](./LICENSE).
