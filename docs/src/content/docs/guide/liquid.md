---
title: Liquid Engine
description: Shopify/Jekyll Liquid template syntax support
---

binja supports Liquid template syntax, commonly used in Shopify themes and Jekyll static sites.

## Installation

Liquid support is included with binja:

```bash
bun add binja
```

## Basic Usage

```typescript
import * as liquid from 'binja/engines/liquid'

const html = await liquid.render('Hello {{ name }}!', { name: 'World' })
// Output: Hello World!
```

## Syntax

### Variables

```liquid
{{ name }}
{{ user.email }}
{{ items[0] }}
```

### Filters

```liquid
{{ name | upcase }}
{{ text | truncate: 20 }}
{{ price | money }}
```

### Comments

```liquid
{% comment %}
  This is a comment
{% endcomment %}
```

## Control Structures

### if / elsif / else

```liquid
{% if user %}
  Hello {{ user.name }}!
{% elsif guest %}
  Hello Guest!
{% else %}
  Hello Visitor!
{% endif %}
```

### unless

```liquid
{% unless is_admin %}
  <p>You don't have admin access.</p>
{% endunless %}
```

### case / when

```liquid
{% case status %}
  {% when 'active' %}
    <span class="badge-success">Active</span>
  {% when 'pending' %}
    <span class="badge-warning">Pending</span>
  {% else %}
    <span class="badge-secondary">Unknown</span>
{% endcase %}
```

### for

```liquid
{% for item in items %}
  <li>{{ item }}</li>
{% endfor %}
```

With else (empty):

```liquid
{% for item in items %}
  <li>{{ item }}</li>
{% else %}
  <li>No items found</li>
{% endfor %}
```

### Loop Variables

| Variable | Description |
|----------|-------------|
| `forloop.index` | 1-based index |
| `forloop.index0` | 0-based index |
| `forloop.first` | True if first |
| `forloop.last` | True if last |
| `forloop.length` | Total items |

```liquid
{% for item in items %}
  <li class="{% if forloop.first %}first{% endif %}">
    {{ forloop.index }}. {{ item }}
  </li>
{% endfor %}
```

### Loop Parameters

```liquid
{% for item in items limit: 5 %}
{% for item in items offset: 2 %}
{% for item in items reversed %}
```

## Variable Assignment

### assign

```liquid
{% assign greeting = "Hello" %}
{{ greeting }}
```

### capture

```liquid
{% capture full_name %}
  {{ first_name }} {{ last_name }}
{% endcapture %}

{{ full_name }}
```

## Raw Output

```liquid
{% raw %}
  {{ this will not be processed }}
{% endraw %}
```

## Filters

### Built-in Liquid Filters

binja supports standard Liquid filters plus all 84+ binja filters:

```liquid
{{ "hello" | upcase }}           {# HELLO #}
{{ "HELLO" | downcase }}         {# hello #}
{{ "hello" | capitalize }}       {# Hello #}
{{ "hello world" | truncate: 8 }} {# hello... #}
{{ items | size }}               {# 5 #}
{{ items | first }}
{{ items | last }}
{{ items | join: ", " }}
{{ items | sort }}
{{ items | reverse }}
```

## Comparison with Jinja2

| Feature | Liquid | Jinja2 |
|---------|--------|--------|
| Variables | `{{ var }}` | `{{ var }}` |
| Filters | `{{ var \| filter }}` | `{{ var\|filter }}` |
| If | `{% if %}` | `{% if %}` |
| Loop | `{% for %}` | `{% for %}` |
| Assign | `{% assign %}` | `{% set %}` |
| Comments | `{% comment %}` | `{# #}` |
| Raw | `{% raw %}` | `{% raw %}` |

## Migration from LiquidJS

```typescript
// Before: LiquidJS
import { Liquid } from 'liquidjs'
const engine = new Liquid()
const html = await engine.parseAndRender(source, context)

// After: binja
import * as liquid from 'binja/engines/liquid'
const html = await liquid.render(source, context)
```

## Shopify Theme Development

binja's Liquid engine is compatible with Shopify theme syntax:

```liquid
{% for product in collection.products %}
  <div class="product">
    <h2>{{ product.title }}</h2>
    <p>{{ product.price | money }}</p>
    {% if product.available %}
      <button>Add to Cart</button>
    {% else %}
      <span>Sold Out</span>
    {% endif %}
  </div>
{% endfor %}
```

## Performance

Liquid templates in binja benefit from:

- Same optimized runtime as Jinja2
- Same 84+ built-in filters
- Template caching
- AOT compilation support
