---
title: Django Compatibility
description: Django Template Language compatibility
---

binja implements a broad Django-compatible template subset for JavaScript/TypeScript projects. Validate advanced or custom Django templates during migration.

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

The following Django-style `forloop` variables are supported:

| Variable | Description |
|----------|-------------|
| `forloop.counter` | 1-indexed iteration count |
| `forloop.counter0` | 0-indexed iteration count |
| `forloop.revcounter` | Reverse counter (1-indexed) |
| `forloop.revcounter0` | Reverse counter (0-indexed) |
| `forloop.first` | True if first iteration |
| `forloop.last` | True if last iteration |
| `forloop.parentloop` | Parent loop context |

```jinja
{% for item in items %}
  <tr class="{% cycle 'odd' 'even' %}">
    <td>{{ forloop.counter }}</td>
    <td>{{ item.name }}</td>
  </tr>
{% endfor %}
```

## Filters

Binja provides a broad filter registry, not every Django filter or exact edge-case behavior. See [Built-in Filters](/binja/guide/filters/).

### Filter Syntax

Django-style (colon for arguments):

```jinja
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
  urlResolver: (name: string, args: any[], kwargs: Record<string, any>) => {
    const routes: Record<string, string> = {
      home: '/',
      about: '/about/',
      user_profile: '/users/:id/',
    }
    let url = routes[name] || '#'
    for (const [key, value] of Object.entries(kwargs)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)))
    }
    return url
  },

  // Static resolver for {% static %} tag
  staticResolver: (path: string) => `/static/${path}`
})
```

Usage:

```jinja
<a href="{% url 'user_profile' id=user.id %}">Profile</a>
<link rel="stylesheet" href="{% static 'css/style.css' %}">
```

## CSRF Token

```jinja
<form method="POST">
  {% csrf_token %}
  <input type="text" name="username">
  <button type="submit">Submit</button>
</form>
```

Supply the request's CSRF token in render context:

```typescript
await env.render('form.html', {
  csrf_token: requestCsrfToken,
})
```

The tag escapes the token and renders nothing when absent. Binja does not generate or validate CSRF tokens; use the host framework's CSRF middleware.

## Migration from Django

### 1. Copy Templates

Copy the templates, then run compatibility checks and fixture tests. Custom tags, filters, internationalization, context processors, and unsupported syntax require migration work:

```bash
cp -r django_project/templates ./templates
```

### 2. Update {% load %} Tags

`{% load %}` tags are accepted but ignored (no-op):

```jinja
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
  urlResolver: (name, args, kwargs) => { /* your logic */ },
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
