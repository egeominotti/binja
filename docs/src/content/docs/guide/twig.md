---
title: Twig subset
description: Supported Twig-style expressions, aliases, control flow, and compatibility boundaries.
---

```ts
import * as twig from 'binja/engines/twig'

const html = await twig.render('Hello {{ name|upper }}!', { name: 'Ada' })
```

Twig reuses the core lexer/parser/runtime and transforms Twig-specific filter aliases.

## Expressions

```twig
{{ user.name }}
{{ enabled ? 'yes' : 'no' }}
{{ configured ?? fallback }}

{% if count is divisible by(3) %}multiple of three{% endif %}
```

`null` is recognized as a null literal/test alias. Chained comparisons, protected property access, membership, boolean operators, and core arithmetic follow the shared runtime.

## Control flow

```twig
{% if primary %}
  Primary
{% elseif secondary %}
  Secondary
{% else %}
  Other
{% endif %}

{% for item in items %}
  {{ loop.index }}. {{ item }}
{% else %}
  Empty
{% endfor %}

{% set label = 'Status' %}
```

## Filter aliases

| Twig name | Shared Binja filter |
|---|---|
| `e` | `escape` |
| `raw` | `safe` |
| `nl2br` | `linebreaksbr` |
| `number_format` | `floatformat` |
| `json_encode` | `json` |
| `merge` | `merge` |
| `keys` | `keys` |
| `column` | `map` |

`raw` is a trust assertion and must not receive unsanitized input.

## API

```ts
const ast = twig.parse(source)
const renderCached = twig.compile(source)
const html = await renderCached(context)
```

`compile()` is an asynchronous parsed-runtime cache, not core synchronous AOT.

## Compatibility boundaries

- The direct Twig module has no filesystem loader. Although core-style `extends`/`include` nodes parse, external templates cannot be resolved through this API.
- Symfony/Twig extensions, functions, macros, imports, namespaces, named arguments, sandbox policies, escaper strategies, and the full filter/test catalog are not implemented.
- Twig-specific coercion and precedence may differ outside the tested subset.

Use the upstream Twig implementation when exact PHP/Symfony behavior or its extension ecosystem is required.
