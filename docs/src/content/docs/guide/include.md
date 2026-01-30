---
title: Include & Macros
description: Reusable template components
---

## Include

Include renders another template within the current template.

### Basic Include

```django
{% include "components/header.html" %}

<main>
  Content here
</main>

{% include "components/footer.html" %}
```

### Include with Context

Pass variables to included template:

```django
{% include "components/card.html" with title="Hello" description="World" %}
```

**components/card.html**
```django
<div class="card">
  <h3>{{ title }}</h3>
  <p>{{ description }}</p>
</div>
```

### Include with Object

```django
{% include "components/user-card.html" with user=current_user %}
```

### Include Only

Use `only` to restrict context to passed variables:

```django
{% include "components/widget.html" with title="Widget" only %}
```

The included template won't have access to parent context.

## Component Patterns

### Card Component

**components/card.html**
```django
<div class="card {% if class %}{{ class }}{% endif %}">
  {% if title %}
    <div class="card-header">
      <h3>{{ title }}</h3>
    </div>
  {% endif %}
  <div class="card-body">
    {{ content|safe }}
  </div>
  {% if footer %}
    <div class="card-footer">
      {{ footer|safe }}
    </div>
  {% endif %}
</div>
```

**Usage:**
```django
{% include "components/card.html" with
   title="Welcome"
   content="<p>Hello, World!</p>"
   class="card-primary"
%}
```

### Alert Component

**components/alert.html**
```django
<div class="alert alert-{{ type|default:'info' }}" role="alert">
  {% if dismissible %}
    <button type="button" class="close" data-dismiss="alert">&times;</button>
  {% endif %}
  {{ message }}
</div>
```

**Usage:**
```django
{% include "components/alert.html" with
   type="success"
   message="Operation completed!"
   dismissible=true
%}
```

### Button Component

**components/button.html**
```django
<button
  type="{{ type|default:'button' }}"
  class="btn btn-{{ variant|default:'primary' }} {% if size %}btn-{{ size }}{% endif %}"
  {% if disabled %}disabled{% endif %}
>
  {% if icon %}<i class="{{ icon }}"></i>{% endif %}
  {{ label }}
</button>
```

**Usage:**
```django
{% include "components/button.html" with
   label="Submit"
   variant="success"
   type="submit"
   icon="fas fa-check"
%}
```

## Loops with Include

```django
{% for product in products %}
  {% include "components/product-card.html" with product=product %}
{% endfor %}
```

## Conditional Include

```django
{% if user.is_admin %}
  {% include "partials/admin-nav.html" %}
{% else %}
  {% include "partials/user-nav.html" %}
{% endif %}
```

## Dynamic Include

Include template based on variable:

```django
{% include "themes/" ~ theme ~ "/header.html" %}
```

## Organization Tips

```
templates/
├── base.html
├── components/           # Reusable UI components
│   ├── card.html
│   ├── button.html
│   ├── alert.html
│   └── modal.html
├── partials/             # Page sections
│   ├── header.html
│   ├── footer.html
│   ├── sidebar.html
│   └── nav.html
├── layouts/              # Page layouts
│   ├── default.html
│   └── dashboard.html
└── pages/                # Full pages
    ├── home.html
    └── about.html
```

## Performance

Included templates are cached with the Environment:

```typescript
const env = new Environment({
  templates: './views',
  cache: true, // Included templates are cached
})
```

For frequently-used components, the first include triggers parsing; subsequent includes use the cached AST.
