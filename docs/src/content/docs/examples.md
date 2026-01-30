---
title: Examples
description: Practical examples for common use cases
---

## Web Applications

### Elysia + binja

```typescript
import { Elysia } from 'elysia'
import { binja } from 'binja/elysia'

const app = new Elysia()
  .use(binja({
    root: './views',
    globals: {
      siteName: 'My App',
      year: new Date().getFullYear()
    }
  }))
  .get('/', ({ render }) => render('index', { title: 'Home' }))
  .get('/users/:id', async ({ render, params }) => {
    const user = await getUser(params.id)
    return render('users/profile', { user })
  })
  .listen(3000)
```

### Hono + binja

```typescript
import { Hono } from 'hono'
import { binja } from 'binja/hono'

const app = new Hono()

app.use(binja({
  root: './views',
  layout: 'layouts/base'
}))

app.get('/', (c) => c.render('pages/home', { title: 'Home' }))
app.get('/about', (c) => c.render('pages/about', { title: 'About' }))

export default app
```

### HTMX Integration

```typescript
import { Elysia } from 'elysia'
import { binja } from 'binja/elysia'

const app = new Elysia()
  .use(binja({ root: './views' }))
  // Full page
  .get('/', ({ render }) => render('index', { items: [] }))
  // HTMX partial
  .post('/items', async ({ render, body }) => {
    const item = await createItem(body)
    return render('components/item', { item })
  })
  .delete('/items/:id', async ({ params }) => {
    await deleteItem(params.id)
    return ''
  })
```

**views/components/item.html**
```django
<li id="item-{{ item.id }}" class="item">
  {{ item.name }}
  <button hx-delete="/items/{{ item.id }}"
          hx-target="#item-{{ item.id }}"
          hx-swap="outerHTML">
    Delete
  </button>
</li>
```

## AOT Compilation

### Production Server

```typescript
import { compile } from 'binja'

// Pre-compile all templates at startup
const templates = {
  home: compile(await Bun.file('./views/home.html').text()),
  user: compile(await Bun.file('./views/user.html').text()),
  product: compile(await Bun.file('./views/product.html').text()),
  error: compile(await Bun.file('./views/error.html').text()),
}

Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/') {
      return new Response(templates.home({ title: 'Welcome' }), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    if (url.pathname.startsWith('/user/')) {
      const id = url.pathname.split('/')[2]
      return new Response(templates.user({ id }), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    return new Response(templates.error({ code: 404 }), {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    })
  }
})
```

## Email Templates

```typescript
import { Environment } from 'binja'

const env = new Environment({
  templates: './emails',
  autoescape: true
})

async function sendWelcomeEmail(user: User) {
  const html = await env.render('welcome.html', {
    user,
    activationLink: `https://example.com/activate/${user.token}`,
    year: new Date().getFullYear()
  })

  await sendEmail({
    to: user.email,
    subject: 'Welcome to Our App!',
    html
  })
}
```

**emails/welcome.html**
```django
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; }
    .button { background: #10b981; color: white; padding: 12px 24px; }
  </style>
</head>
<body>
  <h1>Welcome, {{ user.name }}!</h1>
  <p>Thanks for signing up. Click below to activate your account:</p>
  <a href="{{ activationLink }}" class="button">Activate Account</a>
  <p>&copy; {{ year }} Our App</p>
</body>
</html>
```

## Static Site Generator

```typescript
import { Environment } from 'binja'
import { mkdir, writeFile, readdir } from 'fs/promises'

const env = new Environment({ templates: './src/templates' })

const pages = [
  { template: 'index.html', output: 'dist/index.html', data: { title: 'Home' } },
  { template: 'about.html', output: 'dist/about.html', data: { title: 'About' } },
  { template: 'contact.html', output: 'dist/contact.html', data: { title: 'Contact' } },
]

// Build all pages
await mkdir('dist', { recursive: true })

for (const page of pages) {
  const html = await env.render(page.template, {
    ...page.data,
    siteName: 'My Site',
    year: new Date().getFullYear()
  })
  await writeFile(page.output, html)
  console.log(`Built: ${page.output}`)
}
```

## Multi-Engine Project

```typescript
// Marketing site uses Liquid (designer-friendly)
import * as liquid from 'binja/engines/liquid'

// Admin dashboard uses Handlebars (JS ecosystem)
import * as handlebars from 'binja/engines/handlebars'

// Main app uses Jinja2 (Django compatibility)
import { render } from 'binja'

// Use appropriate engine for each part
const marketingHtml = await liquid.render(marketingTemplate, data)
const adminHtml = await handlebars.render(adminTemplate, data)
const appHtml = await render(appTemplate, data)
```

## PDF Generation

```typescript
import { Environment } from 'binja'

const templates = new Environment({ templates: './templates' })

async function generateInvoice(invoice: Invoice) {
  const html = await templates.render('invoice.html', {
    invoice,
    company: {
      name: 'Acme Corp',
      address: '123 Main St',
      logo: '/logo.png'
    }
  })

  // Use any PDF library (puppeteer, playwright, etc.)
  const pdf = await generatePDF(html)
  return pdf
}
```

**templates/invoice.html**
```django
<!DOCTYPE html>
<html>
<head>
  <style>
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; border: 1px solid #ddd; }
    .total { font-weight: bold; font-size: 1.2em; }
  </style>
</head>
<body>
  <h1>Invoice #{{ invoice.number }}</h1>
  <p>Date: {{ invoice.date|date:"F j, Y" }}</p>

  <h2>Bill To:</h2>
  <p>{{ invoice.customer.name }}<br>{{ invoice.customer.address }}</p>

  <table>
    <thead>
      <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
    </thead>
    <tbody>
      {% for item in invoice.items %}
      <tr>
        <td>{{ item.name }}</td>
        <td>{{ item.qty }}</td>
        <td>${{ item.price|floatformat:2 }}</td>
        <td>${{ item.qty * item.price|floatformat:2 }}</td>
      </tr>
      {% endfor %}
    </tbody>
    <tfoot>
      <tr class="total">
        <td colspan="3">Total</td>
        <td>${{ invoice.total|floatformat:2 }}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>
```
