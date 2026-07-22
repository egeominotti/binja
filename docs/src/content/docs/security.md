---
title: Security
description: Binja's trust boundary, escaping behavior, loader containment, and deployment responsibilities.
---

## Trust boundary

Templates are trusted application code. Do not render attacker-authored template source as a sandbox: filters, method calls, globals, and application-provided objects are capabilities.

Treat context values, template names, JSON payloads, generated attribute names/values, error text, and debug/query telemetry as untrusted.

## HTML autoescape

Autoescape is enabled by default:

```ts
await render('{{ value }}', { value: '<script>alert(1)</script>' })
// &lt;script&gt;alert(1)&lt;/script&gt;
```

`safe` is an explicit assertion that a value is trusted HTML:

```jinja
{{ application_sanitized_html|safe }}
```

Never use it merely to fix double escaping or to embed raw user input. `autoescape false` has the same trust requirement.

## Property access

Runtime, AOT, generated CLI modules, and property-oriented filters reject common prototype-escape primitives: `__proto__`, `prototype`, `constructor`, `caller`, `callee`, and `arguments`. Mapping membership checks own keys only.

This defense does not turn arbitrary application objects into a safe sandbox. Pass narrow data objects rather than database clients, request objects, secrets, or privileged services.

## JSON and JavaScript

`json`/`tojson` escape `<`, `>`, `&`, U+2028, and U+2029 so a value cannot terminate a script element. Prefer an inert JSON script block:

```jinja
{{ payload|json_script:'bootstrap-data' }}
<script>
  const payload = JSON.parse(document.getElementById('bootstrap-data').textContent)
</script>
```

`json_script` also escapes its `id` attribute. Do not append `|safe`; the filter already returns the required trusted wrapper after escaping its components.

`escapejs` escapes JavaScript string content, including HTML-breaking punctuation and control characters. It is not a general JavaScript code sanitizer.

## Attribute and URL contexts

Use quoted attributes and allow normal autoescape:

```jinja
<input value="{{ value }}">
<a href="/search?q={{ query|urlencode }}">Search</a>
```

`xmlattr` rejects whitespace, quotes, separators, control characters, and other unsafe attribute-name characters, then escapes values. URL encoding prevents delimiter injection but does not enforce an allowed protocol; validate destination schemes in application code.

## Template paths

`Environment`, AOT inheritance loading, the CLI, and adapters resolve templates beneath a configured root. Absolute paths, `..` traversal, and symlink escapes are rejected.

Keep template names separate from arbitrary filesystem paths and use a dedicated template directory with minimal permissions.

## Includes and errors

Inheritance/include cycles are detected. `ignore missing` suppresses only `TemplateNotFoundError`; syntax or render failures inside an existing include still surface.

## CSRF

```jinja
<form method="post">
  {% csrf_token %}
</form>
```

The tag reads `csrf_token` or `csrfToken` from context, escapes it, and renders a hidden input. If the value is absent it renders nothing. Binja does not create, rotate, store, or validate CSRF tokens; use the host framework's CSRF protection.

## Debug mode

The debug panel and `{% debug %}` can expose context, template names, stack traces, SQL text, query parameters, and timing. Enable them only in trusted development environments:

```ts
const env = new Environment({
  templates: './views',
  debug: Bun.env.NODE_ENV !== 'production',
})
```

The panel escapes displayed values, but disclosure itself remains sensitive.

## Resource limits

Application code should bound untrusted input sizes. Liquid ranges are capped at 100,000 items, and filters that require a positive step/width reject invalid values, but a large context or expensive custom filter can still consume substantial CPU or memory.

## Deployment checklist

- Keep templates application-controlled.
- Leave autoescape enabled and audit every `safe`/raw-output use.
- Pass narrow context objects without secrets or privileged services.
- Use `json_script` for bootstrap JSON and validate URL protocols.
- Supply and validate CSRF tokens in the host framework.
- Keep template roots dedicated and debug mode disabled in production.
- Apply request, payload, loop, and output-size limits appropriate to the service.
- Treat parser/render errors as untrusted when placing them in HTML or logs.
