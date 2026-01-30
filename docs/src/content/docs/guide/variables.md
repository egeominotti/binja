---
title: Variables & Expressions
description: Template variables, expressions, and operators
---

## Variables

Output variables using double curly braces:

```django
{{ name }}
{{ user.email }}
{{ items[0] }}
```

## Property Access

### Dot Notation

```django
{{ user.name }}
{{ user.profile.avatar }}
{{ user.settings.theme }}
```

### Bracket Notation

```django
{{ data['key'] }}
{{ data["key with spaces"] }}
{{ items[0] }}
```

### Array Index (Django-style)

```django
{{ items.0 }}
{{ items.1 }}
{{ matrix.0.0 }}
```

## Filters

Apply filters with the pipe character:

```django
{{ name|upper }}
{{ text|truncatechars:20 }}
{{ price|floatformat:2 }}
```

### Filter Chaining

```django
{{ name|lower|capitalize|truncatechars:30 }}
{{ items|sort|reverse|join:", " }}
```

### Filter Arguments

**Django-style (colon):**
```django
{{ text|truncatechars:20 }}
{{ text|replace:"old","new" }}
```

**Jinja2-style (parentheses):**
```django
{{ text|truncate(20) }}
{{ text|replace("old", "new") }}
```

## Operators

### Comparison

| Operator | Description |
|----------|-------------|
| `==` | Equal |
| `!=` | Not equal |
| `<` | Less than |
| `>` | Greater than |
| `<=` | Less than or equal |
| `>=` | Greater than or equal |

```django
{% if age >= 18 %}Adult{% endif %}
{% if status == "active" %}Active{% endif %}
{% if count != 0 %}Has items{% endif %}
```

### Logical

| Operator | Description |
|----------|-------------|
| `and` | Logical AND |
| `or` | Logical OR |
| `not` | Logical NOT |

```django
{% if user and user.is_admin %}Admin{% endif %}
{% if is_staff or is_admin %}Has access{% endif %}
{% if not is_banned %}Welcome{% endif %}
```

### Membership

```django
{% if "admin" in user.roles %}Admin{% endif %}
{% if key in data %}Key exists{% endif %}
```

### String Concatenation

```django
{{ "Hello, " ~ name ~ "!" }}
{{ first_name ~ " " ~ last_name }}
```

### Math

```django
{{ price * quantity }}
{{ total + tax }}
{{ count / 2 }}
{{ remainder % 10 }}
```

## Ternary Expressions

Jinja2-style conditional expressions:

```django
{{ "Active" if is_active else "Inactive" }}
{{ user.name if user else "Guest" }}
{{ count if count > 0 else "None" }}
```

## Tests (is operator)

Check values with the `is` operator:

```django
{% if value is defined %}Defined{% endif %}
{% if num is even %}Even{% endif %}
{% if items is empty %}No items{% endif %}
{% if count is divisibleby(3) %}Divisible by 3{% endif %}
```

See [Built-in Tests](/binja/guide/tests/) for all available tests.

## Undefined Variables

Undefined variables output empty string by default:

```django
{{ undefined_var }}  {# Outputs nothing #}
```

Use `default` filter for fallback:

```django
{{ name|default:"Anonymous" }}
{{ count|default:0 }}
```

## Context Lookup Order

Variables are resolved in this order:

1. Local scope (set/with blocks)
2. Loop variables
3. Template context
4. Global variables

```django
{% set name = "Local" %}
{% for name in names %}
  {{ name }}  {# Loop variable #}
{% endfor %}
{{ name }}  {# Local variable #}
```
