---
title: Troubleshooting
description: Solutions to common issues
---

## Template Errors

### Template not found

**Error:** `Template not found: pages/home.html`

**Cause:** The template path doesn't exist or the templates directory is misconfigured.

**Solution:**

```typescript
const env = new Environment({
  // Ensure path is correct (relative to working directory)
  templates: './views',
})

// Check that file exists
console.log(await Bun.file('./views/pages/home.html').exists())
```

### Syntax error in template

**Error:** `Unexpected token at line 5`

**Cause:** Invalid template syntax.

**Common issues:**

```django
{# Wrong - missing closing tag #}
{% if user %}
  Hello {{ user.name }}

{# Correct #}
{% if user %}
  Hello {{ user.name }}
{% endif %}
```

```django
{# Wrong - missing endif #}
{% if a %}{% if b %}...{% endif %}

{# Correct #}
{% if a %}{% if b %}...{% endif %}{% endif %}
```

### Undefined variable

**Error:** `Cannot read property 'name' of undefined`

**Cause:** Accessing property of undefined variable.

**Solution:** Use `default` filter or check with `if`:

```django
{{ user.name|default:"Guest" }}

{% if user %}
  {{ user.name }}
{% endif %}
```

## Filter Issues

### Filter not found

**Error:** `Unknown filter: myfilter`

**Cause:** Using a filter that doesn't exist.

**Solution:** Check filter name or add custom filter:

```typescript
const env = new Environment({
  filters: {
    myfilter: (value) => value.toUpperCase()
  }
})
```

### Filter argument syntax

**Django style (colon):**
```django
{{ text|truncatechars:20 }}
```

**Jinja2 style (parentheses):**
```django
{{ text|truncate(20) }}
```

Both work in binja.

### Double escaping

**Symptom:** `&amp;lt;` instead of `&lt;`

**Cause:** Content is being escaped twice.

**Solution:** Use `|safe` on already-escaped content:

```django
{{ already_escaped_html|safe }}
```

## Performance Issues

### Slow template rendering

**Solutions:**

1. **Use AOT compilation for static templates:**
   ```typescript
   const template = compile(templateString)
   const html = template(context) // Much faster
   ```

2. **Enable caching:**
   ```typescript
   const env = new Environment({
     cache: true,
     cacheMaxSize: 100,
   })
   ```

3. **Pre-warm cache at startup:**
   ```typescript
   await env.loadTemplate('base.html')
   await env.loadTemplate('home.html')
   ```

### Memory usage

If memory usage is high:

1. **Limit cache size:**
   ```typescript
   const env = new Environment({
     cacheMaxSize: 50, // Reduce from default 100
   })
   ```

2. **Monitor cache:**
   ```typescript
   const stats = env.cacheStats()
   console.log(stats.size, stats.hitRate)
   ```

## Framework Integration

### Hono adapter not working

**Error:** `c.render is not a function`

**Cause:** Middleware not applied.

**Solution:** Ensure middleware is added before routes:

```typescript
const app = new Hono()

// Add middleware FIRST
app.use(binja({ root: './views' }))

// Then define routes
app.get('/', (c) => c.render('index'))
```

### Elysia adapter not working

**Error:** `render is not defined`

**Cause:** Plugin not registered.

**Solution:**

```typescript
const app = new Elysia()
  .use(binja({ root: './views' }))  // Register plugin
  .get('/', ({ render }) => render('index'))  // Now available
```

## AOT Compilation

### extends/include not working with compile()

**Cause:** AOT compilation doesn't support inheritance.

**Solution:** Use Environment with caching instead:

```typescript
// Instead of compile() for templates with inheritance:
const env = new Environment({
  templates: './views',
  cache: true,
})

const html = await env.render('page.html', context)
```

### Compiled template errors

If compiled templates have runtime errors:

1. Check that all filters used exist
2. Verify context has all required variables
3. Test with runtime mode first

## Debug Panel

### Panel not showing

**Cause:** Debug mode not enabled or not HTML output.

**Solution:**

```typescript
const env = new Environment({
  templates: './views',
  debug: true,  // Must be true
})
```

The panel only injects into HTML responses (content with `<body>` tag).

### Panel showing in production

**Solution:** Use environment-based toggle:

```typescript
const env = new Environment({
  debug: process.env.NODE_ENV !== 'production',
})
```

## Still Having Issues?

1. Check the [FAQ](/binja/faq/)
2. Search [GitHub Issues](https://github.com/egeominotti/binja/issues)
3. Open a new issue with:
   - binja version
   - Bun version
   - Minimal reproduction code
   - Expected vs actual behavior
