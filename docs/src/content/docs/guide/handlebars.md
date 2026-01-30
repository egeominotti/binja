---
title: Handlebars Engine
description: Handlebars template syntax support
---

binja supports Handlebars template syntax through a dedicated engine.

## Installation

Handlebars support is included with binja:

```bash
bun add binja
```

## Basic Usage

```typescript
import * as handlebars from 'binja/engines/handlebars'

const html = await handlebars.render('Hello {{name}}!', { name: 'World' })
// Output: Hello World!
```

## Syntax

### Variables

```handlebars
{{name}}
{{user.email}}
{{items.[0]}}
```

### Unescaped Output

Use triple braces for unescaped HTML:

```handlebars
{{{rawHtml}}}
```

### Comments

```handlebars
{{! This is a comment }}

{{!--
  This is a
  multi-line comment
--}}
```

## Control Structures

### if / else

```handlebars
{{#if user}}
  Hello {{user.name}}!
{{else}}
  Hello Guest!
{{/if}}
```

### unless

```handlebars
{{#unless isAdmin}}
  <p>You don't have admin access.</p>
{{/unless}}
```

### each

```handlebars
{{#each items}}
  <li>{{this}}</li>
{{/each}}
```

With index:

```handlebars
{{#each items}}
  <li>{{@index}}: {{this}}</li>
{{/each}}
```

With else (empty):

```handlebars
{{#each items}}
  <li>{{this}}</li>
{{else}}
  <li>No items found</li>
{{/each}}
```

### with

```handlebars
{{#with user}}
  <p>Name: {{name}}</p>
  <p>Email: {{email}}</p>
{{/with}}
```

## Loop Variables

| Variable | Description |
|----------|-------------|
| `@index` | Zero-based index |
| `@first` | True if first iteration |
| `@last` | True if last iteration |
| `@key` | Key for object iteration |

```handlebars
{{#each items}}
  <li class="{{#if @first}}first{{/if}} {{#if @last}}last{{/if}}">
    {{@index}}: {{this}}
  </li>
{{/each}}
```

## Helpers

### Built-in Helpers

binja's Handlebars engine supports:

- `if`, `unless`
- `each`
- `with`

### Using binja Filters

All 84+ binja filters work in Handlebars:

```typescript
const html = await handlebars.render('{{name}}', { name: 'world' })
```

For filters in Handlebars, use the context:

```typescript
const html = await handlebars.render('{{upper name}}', {
  name: 'world',
  upper: (s: string) => s.toUpperCase()
})
```

## Partials

```handlebars
{{>header}}

<main>
  {{>content}}
</main>

{{>footer}}
```

Register partials:

```typescript
import * as handlebars from 'binja/engines/handlebars'

// Coming soon: partial registration
```

## Comparison with Jinja2

| Feature | Handlebars | Jinja2 |
|---------|------------|--------|
| Variables | `{{var}}` | `{{ var }}` |
| Unescaped | `{{{var}}}` | `{{ var\|safe }}` |
| If | `{{#if}}` | `{% if %}` |
| Loop | `{{#each}}` | `{% for %}` |
| Comments | `{{! }}` | `{# #}` |
| Filters | helpers | `\|filter` |

## Migration from Handlebars.js

```typescript
// Before: Handlebars.js
import Handlebars from 'handlebars'
const template = Handlebars.compile(source)
const html = template(context)

// After: binja
import * as handlebars from 'binja/engines/handlebars'
const html = await handlebars.render(source, context)
```

## Performance

Handlebars templates in binja benefit from:

- Same optimized runtime as Jinja2
- Same 84+ built-in filters
- Template caching
- AOT compilation support
