---
title: Django Compatibility
description: 100% Django Template Language compatibility
---

binja is designed to be a drop-in replacement for Django templates in JavaScript/TypeScript projects.

## Supported Tags

### Core Tags

| Tag | Status | Example |
|-----|--------|---------|
| `{% if %}` | Supported | `{% if user %}...{% endif %}` |
| `{% elif %}` | Supported | `{% elif condition %}` |
| `{% else %}` | Supported | `{% else %}` |
| `{% for %}` | Supported | `{% for item in items %}` |
| `{% empty %}` | Supported | `{% empty %}No items{% endfor %}` |
| `{% block %}` | Supported | `{% block content %}{% endblock %}` |
| `{% extends %}` | Supported | `{% extends "base.html" %}` |
| `{% include %}` | Supported | `{% include "partial.html" %}` |
| `{% with %}` | Supported | `{% with x=1 %}{% endwith %}` |
| `{% load %}` | Supported (no-op) | `{% load static %}` |
| `{% comment %}` | Supported | `{% comment %}...{% endcomment %}` |
| `{% verbatim %}` | Supported | `{% verbatim %}{{ raw }}{% endverbatim %}` |

### Django-Specific Tags

| Tag | Status | Example |
|-----|--------|---------|
| `{% csrf_token %}` | Supported | Outputs hidden input |
| `{% url %}` | Supported | `{% url 'home' %}` |
| `{% static %}` | Supported | `{% static 'css/style.css' %}` |
| `{% cycle %}` | Supported | `{% cycle 'odd' 'even' %}` |
| `{% firstof %}` | Supported | `{% firstof var1 var2 "default" %}` |
| `{% ifchanged %}` | Supported | `{% ifchanged %}{{ item }}{% endifchanged %}` |
| `{% ifequal %}` | Supported | `{% ifequal a b %}...{% endifequal %}` |
| `{% lorem %}` | Supported | `{% lorem 3 p %}` |
| `{% now %}` | Supported | `{% now "Y-m-d" %}` |
| `{% regroup %}` | Supported | `{% regroup list by attr as grouped %}` |
| `{% templatetag %}` | Supported | `{% templatetag openblock %}` |
| `{% widthratio %}` | Supported | `{% widthratio value max 100 %}` |
| `{% debug %}` | Supported | Outputs context as JSON |

## Loop Variables

Django's `forloop` variables are fully supported:

| Variable | Description |
|----------|-------------|
| `forloop.counter` | 1-indexed iteration count |
| `forloop.counter0` | 0-indexed iteration count |
| `forloop.revcounter` | Reverse counter (1-indexed) |
| `forloop.revcounter0` | Reverse counter (0-indexed) |
| `forloop.first` | True if first iteration |
| `forloop.last` | True if last iteration |
| `forloop.parentloop` | Parent loop context |

```django
{% for item in items %}
  <tr class="{% cycle 'odd' 'even' %}">
    <td>{{ forloop.counter }}</td>
    <td>{{ item.name }}</td>
  </tr>
{% endfor %}
```

## Filters

All Django built-in filters are supported. See [Built-in Filters](/binja/guide/filters/).

### Filter Syntax

Django-style (colon for arguments):

```django
{{ text|truncatechars:20 }}
{{ list|join:", " }}
{{ date|date:"Y-m-d" }}
```

## URL and Static

Configure URL and static resolvers:

```typescript
const env = new Environment({
  templates: './templates',

  // URL resolver for {% url %} tag
  urlResolver: (name: string, ...args: any[]) => {
    const routes: Record<string, string> = {
      home: '/',
      about: '/about/',
      user_profile: '/users/:id/',
    }
    let url = routes[name] || '#'
    // Replace URL parameters
    args.forEach((arg) => {
      if (typeof arg === 'object') {
        Object.entries(arg).forEach(([key, value]) => {
          url = url.replace(`:${key}`, String(value))
        })
      }
    })
    return url
  },

  // Static resolver for {% static %} tag
  staticResolver: (path: string) => `/static/${path}`
})
```

Usage:

```django
<a href="{% url 'user_profile' id=user.id %}">Profile</a>
<link rel="stylesheet" href="{% static 'css/style.css' %}">
```

## CSRF Token

```django
<form method="POST">
  {% csrf_token %}
  <input type="text" name="username">
  <button type="submit">Submit</button>
</form>
```

Configure CSRF token:

```typescript
const env = new Environment({
  templates: './templates',
  globals: {
    csrf_token: 'your-csrf-token-here'
  }
})
```

## Migration from Django

### 1. Copy Templates

Django templates should work with minimal changes:

```bash
cp -r django_project/templates ./templates
```

### 2. Update {% load %} Tags

`{% load %}` tags are accepted but ignored (no-op):

```django
{% load static %}  {# Works, but doesn't load anything #}
{% load i18n %}    {# Same #}
```

### 3. Configure Environment

```typescript
import { Environment } from 'binja'

const env = new Environment({
  templates: './templates',
  autoescape: true,  // Same as Django default

  // Set up URL/static resolvers
  urlResolver: (name, ...args) => { /* your logic */ },
  staticResolver: (path) => `/static/${path}`,

  // Global context (like Django context processors)
  globals: {
    DEBUG: process.env.NODE_ENV !== 'production',
    STATIC_URL: '/static/',
  }
})
```

### 4. Replace Views

```python
# Django
def home(request):
    return render(request, 'home.html', {'title': 'Home'})
```

```typescript
// binja + Hono
app.get('/', (c) => c.render('home.html', { title: 'Home' }))
```

## Differences from Django

### Minor Syntax Differences

| Django | binja | Notes |
|--------|-------|-------|
| `{% load %}` | Accepted (no-op) | No custom tag libraries |
| `{% trans %}` | Not supported | Use i18n library |
| `{% blocktrans %}` | Not supported | Use i18n library |

### Context Processors

Django context processors → binja globals:

```typescript
// Django equivalent context processors
const env = new Environment({
  globals: {
    user: getCurrentUser(),
    messages: getMessages(),
    DEBUG: process.env.NODE_ENV !== 'production',
  }
})
```
