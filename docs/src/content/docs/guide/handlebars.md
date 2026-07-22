---
title: Handlebars subset
description: Supported Handlebars-style syntax and explicit compatibility boundaries.
---

```ts
import * as handlebars from 'binja/engines/handlebars'

const html = await handlebars.render('Hello {{name}}!', { name: 'Ada' })
```

## Supported syntax

### Output and paths

```handlebars
{{name}}
{{user.address.city}}
{{user/name}}
{{{trustedHtml}}}
{{! inline comment }}
{{!-- block comment --}}
```

Double braces use the shared HTML autoescape. Triple braces mark the value trusted; never use them for unsanitized input.

### Conditions

```handlebars
{{#if enabled}}Enabled{{else}}Disabled{{/if}}
{{#unless hidden}}Visible{{else}}Hidden{{/unless}}
```

### Iteration

```handlebars
{{#each items}}
  {{@index}}: {{this}}
  {{#if @first}}first{{/if}}
  {{#if @last}}last{{/if}}
{{else}}
  Empty
{{/each}}
```

Supported metadata is translated to the shared loop object, including `@index`, `@first`, and `@last`.

### Context blocks

```handlebars
{{#with user}}
  {{this.name}} — {{this.email}}
{{/with}}
```

Use explicit `this` paths inside `with`/`each` for portable behavior within this implementation.

## API

```ts
const ast = handlebars.parse(source)
const renderCached = handlebars.compile(source)
const html = await renderCached(context)
```

`compile()` caches the parsed AST and remains asynchronous; it is not core AOT.

## Compatibility boundaries

- No custom-helper registration API is exposed. A callable intentionally placed in context may be invoked by supported expression syntax, but this is not Handlebars.js helper resolution.
- Partial syntax can be parsed, but the direct API has no partial registry/loader, so partial rendering is not supported.
- Block parameters, decorators, data frames beyond documented loop metadata, whitespace semantics, subexpressions, and upstream plugin behavior are not guaranteed.
- Mismatched or unclosed blocks produce syntax errors instead of being silently accepted.

Use upstream Handlebars when a project depends on its complete helper/partial ecosystem.
