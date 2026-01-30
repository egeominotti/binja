---
title: Multi-Engine Overview
description: Support for multiple template syntaxes through a unified API
---

binja uniquely supports multiple template engines through a unified API. All engines parse to a common AST and share the same runtime, filters, and optimizations.

## Supported Engines

| Engine | Syntax | Use Case |
|--------|--------|----------|
| **Jinja2/DTL** | `{{ var }}` `{% if %}` | Default, Python/Django compatibility |
| **Handlebars** | `{{var}}` `{{#if}}` | JavaScript ecosystem, Ember.js |
| **Liquid** | `{{ var }}` `{% if %}` | Shopify, Jekyll, static sites |
| **Twig** | `{{ var }}` `{% if %}` | PHP/Symfony, Drupal, Craft CMS |

## Quick Comparison

| Feature | Jinja2 | Handlebars | Liquid | Twig |
|---------|--------|------------|--------|------|
| Variables | `{{ x }}` | `{{x}}` | `{{ x }}` | `{{ x }}` |
| Conditionals | `{% if %}` | `{{#if}}` | `{% if %}` | `{% if %}` |
| Loops | `{% for %}` | `{{#each}}` | `{% for %}` | `{% for %}` |
| Filters | `{{ x\|filter }}` | `{{ x }}` | `{{ x \| filter }}` | `{{ x\|filter }}` |
| Comments | `{# #}` | `{{! }}` | `{% comment %}` | `{# #}` |
| Assignment | `{% set %}` | - | `{% assign %}` | `{% set %}` |
| Unescaped | `{{ x\|safe }}` | `{{{x}}}` | - | `{{ x\|raw }}` |

## Direct Engine Usage

```typescript
// Import specific engines
import * as handlebars from 'binja/engines/handlebars'
import * as liquid from 'binja/engines/liquid'
import * as twig from 'binja/engines/twig'

// Handlebars
await handlebars.render('Hello {{name}}!', { name: 'World' })

// Liquid
await liquid.render('Hello {{ name }}!', { name: 'World' })

// Twig
await twig.render('Hello {{ name }}!', { name: 'World' })
```

## MultiEngine API

For dynamic engine selection:

```typescript
import { MultiEngine } from 'binja/engines'

const engine = new MultiEngine()

// Render with any engine
await engine.render('Hello {{name}}!', { name: 'World' }, 'handlebars')
await engine.render('Hello {{ name }}!', { name: 'World' }, 'liquid')
await engine.render('Hello {{ name }}!', { name: 'World' }, 'twig')
await engine.render('Hello {{ name }}!', { name: 'World' }, 'jinja2')
```

## Auto-Detection

Detect engine from file extension:

```typescript
import { detectEngine } from 'binja/engines'

const eng = detectEngine('template.hbs')     // Handlebars
const eng2 = detectEngine('page.liquid')     // Liquid
const eng3 = detectEngine('page.twig')       // Twig
const eng4 = detectEngine('page.html')       // Jinja2 (default)
```

## Shared Features

All engines benefit from:

- **84+ built-in filters** - Same filters work across all engines
- **Runtime optimizations** - Inline filter execution
- **AOT compilation** - Pre-compile for performance
- **Autoescape** - XSS protection by default
- **Error handling** - Consistent error messages

## Migration Guide

### From Handlebars.js

```handlebars
{{! Before: Handlebars.js }}
{{#if user}}
  Hello {{user.name}}!
{{/if}}

{{#each items}}
  <li>{{this}}</li>
{{/each}}
```

```typescript
// After: binja
import * as handlebars from 'binja/engines/handlebars'

const html = await handlebars.render(template, {
  user: { name: 'John' },
  items: ['Apple', 'Banana']
})
```

### From Liquid/Jekyll

```liquid
{% comment %} Before: Liquid/Jekyll {% endcomment %}
{% if user %}
  Hello {{ user.name }}!
{% endif %}

{% for item in items %}
  <li>{{ item }}</li>
{% endfor %}
```

```typescript
// After: binja
import * as liquid from 'binja/engines/liquid'

const html = await liquid.render(template, {
  user: { name: 'John' },
  items: ['Apple', 'Banana']
})
```

## See Also

- [Handlebars Engine](/binja/guide/handlebars/)
- [Liquid Engine](/binja/guide/liquid/)
- [Twig Engine](/binja/guide/twig/)
