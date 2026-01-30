---
title: Template Inheritance
description: Create reusable layouts with extends and blocks
---

Template inheritance lets you create a base template with common structure and override specific sections in child templates.

## Basic Inheritance

### Base Template

**templates/base.html**
```django
<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}Default Title{% endblock %}</title>
  {% block head %}{% endblock %}
</head>
<body>
  <header>
    {% block header %}
      <nav>Default Navigation</nav>
    {% endblock %}
  </header>

  <main>
    {% block content %}{% endblock %}
  </main>

  <footer>
    {% block footer %}
      <p>&copy; {{ year }} My Site</p>
    {% endblock %}
  </footer>
</body>
</html>
```

### Child Template

**templates/pages/home.html**
```django
{% extends "base.html" %}

{% block title %}Home | My Site{% endblock %}

{% block content %}
  <h1>Welcome!</h1>
  <p>This is the home page.</p>
{% endblock %}
```

## Block Features

### Default Content

Blocks can have default content:

```django
{% block sidebar %}
  <nav>Default sidebar content</nav>
{% endblock %}
```

Child templates can override or use the default by not defining the block.

### super()

Include parent block content:

```django
{% block header %}
  {{ super() }}
  <div class="breadcrumb">Home / About</div>
{% endblock %}
```

### Nested Blocks

```django
{% block content %}
  <div class="container">
    {% block inner_content %}{% endblock %}
  </div>
{% endblock %}
```

## Multi-Level Inheritance

### Three-Level Example

**base.html**
```django
<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}{% endblock %}</title>
</head>
<body>
  {% block body %}{% endblock %}
</body>
</html>
```

**layouts/two-column.html**
```django
{% extends "base.html" %}

{% block body %}
  <div class="row">
    <div class="col-9">{% block main %}{% endblock %}</div>
    <div class="col-3">{% block sidebar %}{% endblock %}</div>
  </div>
{% endblock %}
```

**pages/dashboard.html**
```django
{% extends "layouts/two-column.html" %}

{% block title %}Dashboard{% endblock %}

{% block main %}
  <h1>Dashboard</h1>
{% endblock %}

{% block sidebar %}
  <nav>Dashboard Menu</nav>
{% endblock %}
```

## Best Practices

### 1. Create Semantic Blocks

```django
{# Good - semantic block names #}
{% block page_title %}{% endblock %}
{% block main_content %}{% endblock %}
{% block sidebar_content %}{% endblock %}

{# Avoid - vague names #}
{% block a %}{% endblock %}
{% block stuff %}{% endblock %}
```

### 2. Keep Base Templates Minimal

```django
{# base.html - structure only #}
<!DOCTYPE html>
<html>
<head>{% block head %}{% endblock %}</head>
<body>{% block body %}{% endblock %}</body>
</html>
```

### 3. Use Layout Templates for Common Patterns

```
templates/
├── base.html           # Core HTML structure
├── layouts/
│   ├── default.html    # Standard page layout
│   ├── dashboard.html  # Dashboard layout
│   └── auth.html       # Auth pages layout
└── pages/
    ├── home.html       # Extends layouts/default.html
    └── login.html      # Extends layouts/auth.html
```

### 4. Document Block Purpose

```django
{# Block for page-specific CSS #}
{% block styles %}{% endblock %}

{# Main content area - required in child templates #}
{% block content %}{% endblock %}

{# Optional: page-specific JavaScript #}
{% block scripts %}{% endblock %}
```

## Using with Environment

For inheritance, use `Environment` with file loading:

```typescript
import { Environment } from 'binja'

const env = new Environment({
  templates: './templates',
  cache: true, // Cache templates for performance
})

// Render child template (inheritance resolved automatically)
const html = await env.render('pages/home.html', {
  year: new Date().getFullYear()
})
```

## Performance

Enable caching for better inheritance performance:

```typescript
const env = new Environment({
  templates: './templates',
  cache: true,
  cacheMaxSize: 100,
})

// Pre-warm cache at startup
await env.loadTemplate('base.html')
await env.loadTemplate('layouts/default.html')
```
