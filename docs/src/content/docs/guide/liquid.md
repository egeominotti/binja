---
title: Liquid subset
description: Supported Liquid-style syntax, aliases, ranges, assignments, and limitations.
---

```ts
import * as liquid from 'binja/engines/liquid'

const html = await liquid.render('Hello {{ name | upcase }}!', { name: 'Ada' })
```

## Output and filters

```liquid
{{ user.name }}
{{ users[0].name }}
{{ title | upcase | truncate: 20 }}
```

Common Liquid aliases include `upcase`, `downcase`, `strip`, `size`, `truncate`, and `json`; compatible Binja registry names can also be used when the syntax parses them.

## Conditions

```liquid
{% if product.available %}
  Available
{% elsif product.backorder %}
  Back order
{% else %}
  Unavailable
{% endif %}

{% unless hidden %}Visible{% endunless %}

{% case tier %}
  {% when 'pro' %}Pro
  {% when 'team' %}Team
  {% else %}Free
{% endcase %}
```

Supported logical/comparison operators include `and`, `or`, `==`, `!=`, `<`, `<=`, `>`, `>=`, and `contains`. Literals include `true`, `false`, `nil`, and `null`.

## Loops and ranges

```liquid
{% for item in items offset: 1 limit: 3 reversed %}
  {{ forloop.counter }}: {{ item }}
{% else %}
  Empty
{% endfor %}

{% for n in (1..5) %}{{ n }}{% endfor %}
```

`limit` and `offset` may be expressions. `reversed` applies to the selected slice. Inclusive ascending and descending ranges are supported and capped at 100,000 items.

Loop aliases use the shared runtime (`forloop.counter`, `counter0`, `first`, `last`, `length`, and reverse counters).

## Assignment, capture, and counters

```liquid
{% assign label = 'Status' %}
{% capture heading %}<strong>{{ label }}</strong>{% endcapture %}
{{ heading }}

{% increment row %}
{% increment row %}
{% decrement remaining %}
```

Counters are render-local, so concurrent renders do not share values.

## Comments and raw text

```liquid
{% comment %}not rendered{% endcomment %}
{% raw %}{{ not_parsed }}{% endraw %}
```

## API

```ts
const ast = liquid.parse(source)
const renderCached = liquid.compile(source)
const html = await renderCached(context)
```

## Compatibility boundaries

- This is not the Shopify theme runtime: Shopify objects, drops, sections, schema, locale/theme files, and the complete tag/filter surface are not provided.
- Direct `include`/`render` has no configured loader and is therefore not usable through the string-only module API.
- `break` and `continue` are rejected explicitly in this release.
- Unknown tags throw a source-aware syntax error.
- Whitespace and coercion edge cases may differ from LiquidJS or Shopify Liquid; protect migrations with fixtures.
