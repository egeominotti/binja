---
title: Control Flow
description: Conditionals, loops, and control statements
---

## Conditionals

### if / elif / else

```jinja
{% if user.is_admin %}
  <span class="badge">Admin</span>
{% elif user.is_staff %}
  <span class="badge">Staff</span>
{% else %}
  <span class="badge">User</span>
{% endif %}
```

### Comparison Operators

```jinja
{% if age >= 18 %}Adult{% endif %}
{% if status == "active" %}Active{% endif %}
{% if count != 0 %}Has items{% endif %}
{% if price < 100 %}Affordable{% endif %}
```

### Logical Operators

```jinja
{% if user and user.is_active %}
  Welcome back!
{% endif %}

{% if is_admin or is_moderator %}
  Has permissions
{% endif %}

{% if not is_banned %}
  Access granted
{% endif %}
```

### Membership Test

```jinja
{% if "admin" in user.roles %}
  Admin panel link
{% endif %}

{% if key in data %}
  Key exists
{% endif %}
```

### Truthiness

Empty values are falsy:

```jinja
{% if items %}     {# True if not empty #}
{% if user %}      {# True if not null/undefined #}
{% if count %}     {# True if not 0 #}
{% if name %}      {# True if not empty string #}
```

## Loops

### Basic For Loop

```jinja
{% for item in items %}
  <li>{{ item }}</li>
{% endfor %}
```

### Empty Block

Handle empty lists:

```jinja
{% for item in items %}
  <li>{{ item.name }}</li>
{% empty %}
  <li>No items found</li>
{% endfor %}
```

### Loop Variables

| Variable | Description |
|----------|-------------|
| `loop.index` | Current iteration (1-indexed) |
| `loop.index0` | Current iteration (0-indexed) |
| `loop.first` | True if first iteration |
| `loop.last` | True if last iteration |
| `loop.length` | Total number of items |
| `loop.revindex` | Iterations remaining (1-indexed) |
| `loop.revindex0` | Iterations remaining (0-indexed) |
| `loop.parent` | Parent loop context |

**Django aliases:**
- `forloop.counter` = `loop.index`
- `forloop.counter0` = `loop.index0`
- `forloop.first` = `loop.first`
- `forloop.last` = `loop.last`
- `forloop.parentloop` = `loop.parent`

### Using Loop Variables

```jinja
{% for item in items %}
  <li class="{% if loop.first %}first{% endif %} {% if loop.last %}last{% endif %}">
    {{ loop.index }}. {{ item.name }}
  </li>
{% endfor %}
```

### Nested Loops

```jinja
{% for category in categories %}
  <h2>{{ category.name }}</h2>
  <ul>
    {% for item in category.items %}
      <li>{{ loop.parent.index }}.{{ loop.index }} - {{ item }}</li>
    {% endfor %}
  </ul>
{% endfor %}
```

### Loop with Condition

```jinja
{% for item in items if item.is_active %}
  <li>{{ item.name }}</li>
{% endfor %}
```

### Dictionary Iteration

```jinja
{% for key, value in data.items() %}
  <dt>{{ key }}</dt>
  <dd>{{ value }}</dd>
{% endfor %}

{# Or with items filter #}
{% for key, value in data|items %}
  {{ key }}: {{ value }}
{% endfor %}
```

## Set Variables

### set

```jinja
{% set greeting = "Hello" %}
{% set full_name = first_name ~ " " ~ last_name %}
{{ greeting }}, {{ full_name }}!
```

### with

Scoped variables (available only within block):

```jinja
{% with total = price * quantity %}
  Total: ${{ total|floatformat:2 }}
{% endwith %}
{# total is not available here #}
```

### Multiple Variables

```jinja
{% with a = 1, b = 2, c = 3 %}
  Sum: {{ a + b + c }}
{% endwith %}
```

## Raw Output

Output template syntax without processing:

```jinja
{% raw %}
  {{ this will not be processed }}
  {% neither will this %}
{% endraw %}
```

Django-style:

```jinja
{% verbatim %}
  {{ raw output }}
{% endverbatim %}
```

## Comments

```jinja
{# This is a comment #}

{#
  Multi-line
  comment
#}
```
