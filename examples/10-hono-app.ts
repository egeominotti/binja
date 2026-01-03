/**
 * Hono Framework Example
 *
 * Complete example of binja integration with Hono.
 * Run: bun run examples/10-hono-app.ts
 */

import { Hono } from 'hono'
import { binja } from '../src/adapters/hono'

// Create app with binja middleware
const app = new Hono()

app.use(binja({
  root: './examples/views',
  extension: '.html',
  engine: 'jinja2',
  cache: false, // Disable cache for development
  debug: true,
  globals: {
    siteName: 'Binja + Hono Demo',
    year: new Date().getFullYear(),
  },
}))

// Sample data
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' },
]

const products = [
  { id: 1, name: 'Laptop', price: 999, inStock: true },
  { id: 2, name: 'Phone', price: 699, inStock: true },
  { id: 3, name: 'Tablet', price: 449, inStock: false },
]

// Routes
app.get('/', (c) => {
  return c.render('home', {
    title: 'Home',
    hero: {
      heading: 'Welcome to Binja + Hono',
      subheading: 'High-performance templates for Bun',
    },
    features: [
      { icon: '🚀', title: 'Fast', description: '2-4x faster than Nunjucks' },
      { icon: '🔧', title: 'Multi-Engine', description: 'Jinja2, Handlebars, Liquid, Twig' },
      { icon: '🎯', title: 'Type-Safe', description: 'Full TypeScript support' },
    ],
  })
})

app.get('/users', (c) => {
  return c.render('users', {
    title: 'Users',
    users,
    stats: {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
    },
  })
})

app.get('/users/:id', (c) => {
  const id = parseInt(c.req.param('id'))
  const user = users.find(u => u.id === id)

  if (!user) {
    return c.render('error', {
      title: 'Not Found',
      message: 'User not found',
      code: 404,
    })
  }

  return c.render('user-detail', {
    title: user.name,
    user,
    recentActivity: [
      { action: 'Logged in', time: '2 hours ago' },
      { action: 'Updated profile', time: '1 day ago' },
      { action: 'Changed password', time: '1 week ago' },
    ],
  })
})

app.get('/products', (c) => {
  const inStock = c.req.query('inStock')
  let filteredProducts = products

  if (inStock === 'true') {
    filteredProducts = products.filter(p => p.inStock)
  }

  return c.render('products', {
    title: 'Products',
    products: filteredProducts,
    filter: inStock,
  })
})

app.get('/about', (c) => {
  return c.render('about', {
    title: 'About',
    version: '0.9.0',
    technologies: ['Bun', 'Hono', 'TypeScript', 'binja'],
  })
})

// API endpoint (JSON)
app.get('/api/users', (c) => {
  return c.json(users)
})

// Start server
const port = 3000
console.log(`
🚀 Hono + binja server running!

  http://localhost:${port}/
  http://localhost:${port}/users
  http://localhost:${port}/products
  http://localhost:${port}/about
  http://localhost:${port}/api/users (JSON)

Press Ctrl+C to stop.
`)

export default {
  port,
  fetch: app.fetch,
}
