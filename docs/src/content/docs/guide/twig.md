---
title: Twig Engine
description: Symfony/PHP Twig template syntax support
---

binja supports Twig template syntax, commonly used in PHP/Symfony projects.

## Installation

Twig support is included with binja:

```bash
bun add binja
```

## Basic Usage

```typescript
import * as twig from 'binja/engines/twig'

const html = await twig.render('Hello {{ name }}!', { name: 'World' })
// Output: Hello World!
```

## Syntax

### Variables

```twig
{{ name }}
{{ user.email }}
{{ items[0] }}
```

### Filters

```twig
{{ name|upper }}
{{ text|truncate(20) }}
{{ price|number_format(2) }}
```

### Comments

```twig
{# This is a comment #}

{#
  Multi-line
  comment
#}
```

## Control Structures

### if / elseif / else

```twig
{% if user %}
  Hello {{ user.name }}!
{% elseif guest %}
  Hello Guest!
{% else %}
  Hello Visitor!
{% endif %}
```

### for

```twig
{% for item in items %}
  <li>{{ item }}</li>
{% endfor %}
```

With else (empty):

```twig
{% for item in items %}
  <li>{{ item }}</li>
{% else %}
  <li>No items found</li>
{% endfor %}
```

### Loop Variables

| Variable | Description |
|----------|-------------|
| `loop.index` | 1-based index |
| `loop.index0` | 0-based index |
| `loop.first` | True if first |
| `loop.last` | True if last |
| `loop.length` | Total items |

```twig
{% for item in items %}
  <li class="{% if loop.first %}first{% endif %}">
    {{ loop.index }}. {{ item }}
  </li>
{% endfor %}
```

## Variable Assignment

### set

```twig
{% set greeting = "Hello" %}
{{ greeting }}

{% set items = ['apple', 'banana', 'cherry'] %}
```

## Template Inheritance

### extends / block

**base.twig**
```twig
<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}Default{% endblock %}</title>
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>
```

**page.twig**
```twig
{% extends "base.twig" %}

{% block title %}My Page{% endblock %}

{% block content %}
  <h1>Welcome!</h1>
{% endblock %}
```

## Include

```twig
{% include "header.twig" %}
{% include "card.twig" with {'title': 'Hello'} %}
```

## Raw Output

```twig
{% raw %}
  {{ this will not be processed }}
{% endraw %}
```

Or:

```twig
{% verbatim %}
  {{ not processed }}
{% endverbatim %}
```

## Filters

### Common Twig Filters

```twig
{{ name|upper }}
{{ name|lower }}
{{ name|capitalize }}
{{ name|title }}
{{ text|striptags }}
{{ text|nl2br }}
{{ text|trim }}
{{ text|raw }}        {# Unescaped output #}
{{ items|length }}
{{ items|first }}
{{ items|last }}
{{ items|join(', ') }}
{{ items|sort }}
{{ items|reverse }}
{{ number|abs }}
{{ number|round }}
{{ date|date('Y-m-d') }}
{{ data|json_encode }}
```

## Tests

```twig
{% if value is defined %}
{% if value is null %}
{% if value is empty %}
{% if number is even %}
{% if number is odd %}
{% if number is divisible by(3) %}
```

## Comparison with Jinja2

Twig and Jinja2 have very similar syntax:

| Feature | Twig | Jinja2 |
|---------|------|--------|
| Variables | `{{ var }}` | `{{ var }}` |
| Filters | `{{ var\|filter }}` | `{{ var\|filter }}` |
| If | `{% if %}` | `{% if %}` |
| Else if | `{% elseif %}` | `{% elif %}` |
| Loop | `{% for %}` | `{% for %}` |
| Set | `{% set %}` | `{% set %}` |
| Comments | `{# #}` | `{# #}` |
| Raw | `{% verbatim %}` | `{% raw %}` |
| Unescaped | `{{ var\|raw }}` | `{{ var\|safe }}` |

Main differences:
- `elseif` vs `elif`
- `|raw` vs `|safe` for unescaped output
- `|date('format')` vs `|date:"format"`

## Migration from PHP Twig

```php
// Before: PHP Twig
$loader = new \Twig\Loader\FilesystemLoader('./templates');
$twig = new \Twig\Environment($loader);
echo $twig->render('page.twig', ['name' => 'World']);
```

```typescript
// After: binja
import * as twig from 'binja/engines/twig'
const html = await twig.render(template, { name: 'World' })
```

## Performance

Twig templates in binja benefit from:

- Same optimized runtime as Jinja2
- Same 84+ built-in filters
- Template caching
- AOT compilation support
