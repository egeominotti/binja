---
title: Custom Filters
description: Create your own template filters
---

## Adding Custom Filters

### With Environment

```typescript
const env = new Environment({
  templates: './views',
  filters: {
    // Simple filter
    double: (value: number) => value * 2,

    // Filter with argument
    repeat: (value: string, times: number = 2) => value.repeat(times),

    // Multiple arguments
    replace_all: (value: string, search: string, replace: string) =>
      value.split(search).join(replace),
  }
})
```

### With addFilter Method

```typescript
const env = new Environment({ templates: './views' })

env.addFilter('currency', (value: number, symbol = '$') => {
  return `${symbol}${value.toFixed(2)}`
})

env.addFilter('truncate_middle', (value: string, length: number) => {
  if (value.length <= length) return value
  const half = Math.floor((length - 3) / 2)
  return value.slice(0, half) + '...' + value.slice(-half)
})
```

### With render() Options

```typescript
import { render } from 'binja'

const html = await render('{{ price|currency }}',
  { price: 42.5 },
  {
    filters: {
      currency: (value: number) => `$${value.toFixed(2)}`
    }
  }
)
```

## Usage in Templates

```django
{{ 5|double }}           {# Output: 10 #}
{{ "hi"|repeat:3 }}      {# Output: hihihi #}
{{ price|currency }}     {# Output: $42.50 #}
{{ price|currency:"€" }} {# Output: €42.50 #}
```

## Filter Function Signature

```typescript
type FilterFunction = (value: any, ...args: any[]) => any
```

- First argument is always the input value
- Additional arguments come from template syntax
- Return value becomes the filter output

## Examples

### String Filters

```typescript
env.addFilter('initials', (name: string) => {
  return name
    .split(' ')
    .map(word => word[0].toUpperCase())
    .join('')
})

env.addFilter('mask_email', (email: string) => {
  const [user, domain] = email.split('@')
  return user[0] + '***@' + domain
})
```

```django
{{ "John Doe"|initials }}        {# JD #}
{{ "john@example.com"|mask_email }} {# j***@example.com #}
```

### Number Filters

```typescript
env.addFilter('percentage', (value: number, decimals = 0) => {
  return (value * 100).toFixed(decimals) + '%'
})

env.addFilter('ordinal', (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
})
```

```django
{{ 0.75|percentage }}      {# 75% #}
{{ 0.756|percentage:1 }}   {# 75.6% #}
{{ 1|ordinal }}            {# 1st #}
{{ 23|ordinal }}           {# 23rd #}
```

### Array Filters

```typescript
env.addFilter('shuffle', (arr: any[]) => {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
})

env.addFilter('pluck', (arr: object[], key: string) => {
  return arr.map(item => item[key])
})
```

```django
{{ items|shuffle|first }}
{{ users|pluck:"name"|join:", " }}
```

### Date Filters

```typescript
env.addFilter('relative_time', (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'just now'
})
```

```django
{{ post.created_at|relative_time }}  {# 2 hours ago #}
```

### Async Filters

```typescript
env.addFilter('translate', async (text: string, lang: string) => {
  const response = await fetch(`/api/translate?text=${text}&lang=${lang}`)
  const data = await response.json()
  return data.translated
})
```

```django
{{ "Hello"|translate:"es" }}  {# Hola #}
```

## Best Practices

1. **Keep filters pure** - No side effects
2. **Handle edge cases** - null, undefined, empty strings
3. **Use TypeScript** - Type your filter functions
4. **Document filters** - Comment usage and parameters
5. **Test filters** - Write unit tests

```typescript
// Good: handles edge cases
env.addFilter('safe_upper', (value: any) => {
  if (value == null) return ''
  return String(value).toUpperCase()
})
```
