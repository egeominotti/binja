---
title: Security
description: Security considerations and best practices
---

## XSS Protection

### Autoescape (Default)

binja enables autoescape by default, protecting against Cross-Site Scripting (XSS) attacks:

```typescript
await render('{{ script }}', {
  script: '<script>alert("xss")</script>'
})
// Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

### Escaped Characters

| Character | Escaped |
|-----------|---------|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

### Safe Content

Use `|safe` only for trusted content:

```django
{{ trusted_html|safe }}
```

**Warning:** Never use `|safe` on user-provided content!

## Best Practices

### 1. Never Trust User Input

```django
{# DANGEROUS - XSS vulnerability #}
{{ user_comment|safe }}

{# SAFE - escaped by default #}
{{ user_comment }}
```

### 2. Validate Data Server-Side

Always validate and sanitize data before passing to templates:

```typescript
// Validate input
const sanitizedInput = sanitize(userInput)

await env.render('page.html', {
  content: sanitizedInput
})
```

### 3. Use CSRF Protection

For forms, include CSRF tokens:

```django
<form method="POST">
  {% csrf_token %}
  <input name="email" value="{{ email }}">
  <button type="submit">Submit</button>
</form>
```

### 4. Escape JavaScript

When embedding data in JavaScript:

```django
<script>
  // Use json filter for safe JSON embedding
  const data = {{ data|json|safe }};
</script>

{# Or use json_script for extra safety #}
{{ data|json_script:"data-id" }}
<script>
  const data = JSON.parse(document.getElementById('data-id').textContent);
</script>
```

### 5. Escape URLs

URL-encode user data in URLs:

```django
<a href="/search?q={{ query|urlencode }}">Search</a>
```

## Template Security

### Disable Unsafe Features in Production

```typescript
const env = new Environment({
  templates: './views',
  autoescape: true,  // Always keep enabled
  debug: false,      // Disable in production
})
```

### Restrict Template Access

Ensure templates can't access:
- File system paths outside template directory
- Sensitive configuration
- Internal Python/JavaScript objects

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do not** open a public issue
2. Email security details to the maintainers
3. Allow time for a fix before public disclosure

## Security Checklist

- [ ] Autoescape is enabled (default)
- [ ] User input is never marked as `|safe`
- [ ] CSRF tokens are used in forms
- [ ] Debug mode is disabled in production
- [ ] Template directory is restricted
- [ ] JSON data uses `|json` or `|json_script`
- [ ] URLs use `|urlencode` for user data
