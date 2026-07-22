---
title: Built-in Tests (35 registry entries)
description: Tests and aliases for the is operator in conditions
---

Tests check values using the `is` operator. `builtinTests` currently exposes **35 registry entries**, including aliases (`none`, `null`, `None`, `eq`, `equalto`, `greaterthan`, and `lessthan`).

## Usage

```jinja
{% if value is defined %}...{% endif %}
{% if num is even %}...{% endif %}
{% if num is divisibleby(3) %}...{% endif %}
```

## Negation

Use `is not` for negative tests:

```jinja
{% if value is not none %}...{% endif %}
{% if num is not even %}...{% endif %}
```

## Available Tests

### Type Tests

| Test | Description | Example |
|------|-------------|---------|
| `defined` | Variable exists | `{% if x is defined %}` |
| `undefined` | Variable doesn't exist | `{% if x is undefined %}` |
| `none` / `null` / `None` | Value is null/undefined | `{% if x is none %}` |
| `boolean` | Value is boolean | `{% if x is boolean %}` |
| `string` | Value is string | `{% if x is string %}` |
| `number` | Value is number | `{% if x is number %}` |
| `integer` | Value is integer | `{% if x is integer %}` |
| `float` | Value is float | `{% if x is float %}` |
| `mapping` | Value is object/dict | `{% if x is mapping %}` |
| `iterable` | Value is iterable | `{% if x is iterable %}` |
| `sequence` | Value is array | `{% if x is sequence %}` |
| `callable` | Value is function | `{% if x is callable %}` |

### Number Tests

| Test | Description | Example |
|------|-------------|---------|
| `even` | Number is even | `{% if n is even %}` |
| `odd` | Number is odd | `{% if n is odd %}` |
| `divisibleby(n)` | Divisible by n | `{% if n is divisibleby(3) %}` |

### Comparison Tests

| Test | Description | Example |
|------|-------------|---------|
| `eq(value)` / `equalto(value)` | Equal to | `{% if x is eq(5) %}` |
| `ne(value)` | Not equal to | `{% if x is ne(5) %}` |
| `lt(value)` / `lessthan(value)` | Less than | `{% if x is lt(10) %}` |
| `le(value)` | Less than or equal | `{% if x is le(10) %}` |
| `gt(value)` / `greaterthan(value)` | Greater than | `{% if x is gt(0) %}` |
| `ge(value)` | Greater than or equal | `{% if x is ge(0) %}` |
| `sameas(value)` | Same object reference | `{% if x is sameas(y) %}` |

### String Tests

| Test | Description | Example |
|------|-------------|---------|
| `upper` | String is uppercase | `{% if s is upper %}` |
| `lower` | String is lowercase | `{% if s is lower %}` |

### Collection Tests

| Test | Description | Example |
|------|-------------|---------|
| `empty` | Collection is empty | `{% if items is empty %}` |
| `in(collection)` | Value in collection | `{% if x is in(items) %}` |

### Boolean Tests

| Test | Description | Example |
|------|-------------|---------|
| `true` | Value is true | `{% if x is true %}` |
| `false` | Value is false | `{% if x is false %}` |
| `truthy` | Value is truthy | `{% if x is truthy %}` |
| `falsy` | Value is falsy | `{% if x is falsy %}` |

## Examples

### Check if variable exists

```jinja
{% if user is defined %}
  Hello, {{ user.name }}!
{% else %}
  Hello, Guest!
{% endif %}
```

### Alternate row colors

```jinja
{% for item in items %}
  <tr class="{% if loop.index is even %}even{% else %}odd{% endif %}">
    <td>{{ item.name }}</td>
  </tr>
{% endfor %}
```

### Group items by divisibility

```jinja
{% for n in numbers %}
  {% if n is divisibleby(3) %}
    <span class="divisible-3">{{ n }}</span>
  {% elif n is divisibleby(2) %}
    <span class="divisible-2">{{ n }}</span>
  {% else %}
    <span>{{ n }}</span>
  {% endif %}
{% endfor %}
```

### Handle empty collections

```jinja
{% if items is empty %}
  <p>No items found.</p>
{% else %}
  <ul>
    {% for item in items %}
      <li>{{ item }}</li>
    {% endfor %}
  </ul>
{% endif %}
```

### Type checking

```jinja
{% if value is string %}
  String: {{ value }}
{% elif value is number %}
  Number: {{ value|floatformat:2 }}
{% elif value is sequence %}
  List: {{ value|join:", " }}
{% else %}
  Other: {{ value }}
{% endif %}
```

## Programmatic Access

```typescript
import { builtinTests } from 'binja'

const names = Object.keys(builtinTests) // 35 in this release
```

Collection semantics follow Binja's Jinja-style truthiness rules: empty arrays, plain objects, `Map`, and `Set` values are empty/falsy; non-empty instances are truthy. Mapping membership checks own properties only.
