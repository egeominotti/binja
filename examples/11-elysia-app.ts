/**
 * Elysia Framework Example
 *
 * Complete example of binja integration with Elysia.
 * Run: bun run examples/11-elysia-app.ts
 */

import { Elysia } from 'elysia'
import { binja } from '../src/adapters/elysia'

// Sample data
const posts = [
  { id: 1, title: 'Getting Started with Binja', author: 'Alice', date: new Date('2024-01-15'), views: 1234, tags: ['tutorial', 'binja'] },
  { id: 2, title: 'Hono vs Elysia', author: 'Bob', date: new Date('2024-01-10'), views: 567, tags: ['comparison', 'frameworks'] },
  { id: 3, title: 'Template Performance Tips', author: 'Charlie', date: new Date('2024-01-05'), views: 890, tags: ['performance', 'tips'] },
]

const categories = [
  { slug: 'tutorials', name: 'Tutorials', count: 12 },
  { slug: 'news', name: 'News', count: 8 },
  { slug: 'tips', name: 'Tips & Tricks', count: 15 },
]

// Create app with binja plugin
const app = new Elysia()
  .use(binja({
    root: './examples/views',
    extension: '.html',
    engine: 'jinja2',
    cache: false,
    debug: true,
    globals: {
      siteName: 'Binja + Elysia Blog',
      year: new Date().getFullYear(),
      navigation: [
        { href: '/', label: 'Home' },
        { href: '/blog', label: 'Blog' },
        { href: '/categories', label: 'Categories' },
        { href: '/about', label: 'About' },
      ],
    },
  }))

  // Home page
  .get('/', ({ render }) => {
    return render('blog-home', {
      title: 'Home',
      featured: posts[0],
      recentPosts: posts.slice(1),
      sidebar: {
        categories: categories.slice(0, 5),
        popularTags: ['binja', 'elysia', 'hono', 'bun', 'typescript'],
      },
    })
  })

  // Blog listing
  .get('/blog', ({ render, query }) => {
    const page = parseInt(query.page as string) || 1
    const perPage = 10
    const totalPages = Math.ceil(posts.length / perPage)

    return render('blog-list', {
      title: 'Blog',
      posts,
      pagination: {
        current: page,
        total: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  })

  // Single post
  .get('/blog/:id', ({ render, params }) => {
    const id = parseInt(params.id)
    const post = posts.find(p => p.id === id)

    if (!post) {
      return render('error', {
        title: 'Not Found',
        message: 'Post not found',
        code: 404,
      })
    }

    const relatedPosts = posts.filter(p => p.id !== id).slice(0, 2)

    return render('blog-post', {
      title: post.title,
      post,
      relatedPosts,
      comments: [
        { author: 'Reader1', text: 'Great article!', date: new Date() },
        { author: 'Reader2', text: 'Very helpful, thanks!', date: new Date() },
      ],
    })
  })

  // Categories
  .get('/categories', ({ render }) => {
    return render('categories', {
      title: 'Categories',
      categories,
      stats: {
        totalCategories: categories.length,
        totalPosts: categories.reduce((sum, c) => sum + c.count, 0),
      },
    })
  })

  // Category detail
  .get('/categories/:slug', ({ render, params }) => {
    const category = categories.find(c => c.slug === params.slug)

    if (!category) {
      return render('error', {
        title: 'Not Found',
        message: 'Category not found',
        code: 404,
      })
    }

    return render('category-detail', {
      title: category.name,
      category,
      posts: posts.filter(p => p.tags.includes(params.slug)),
    })
  })

  // About page
  .get('/about', ({ render }) => {
    return render('about', {
      title: 'About',
      version: '0.9.0',
      description: 'A demo blog built with Elysia and binja templates.',
      team: [
        { name: 'Alice', role: 'Developer' },
        { name: 'Bob', role: 'Designer' },
      ],
    })
  })

  // API endpoints
  .get('/api/posts', () => posts)
  .get('/api/categories', () => categories)

  // Search
  .get('/search', ({ render, query }) => {
    const q = (query.q as string) || ''
    const results = q
      ? posts.filter(p =>
          p.title.toLowerCase().includes(q.toLowerCase()) ||
          p.tags.some(t => t.includes(q.toLowerCase()))
        )
      : []

    return render('search', {
      title: `Search: ${q}`,
      query: q,
      results,
      resultCount: results.length,
    })
  })

  .listen(3001)

console.log(`
🚀 Elysia + binja blog running!

  http://localhost:3001/
  http://localhost:3001/blog
  http://localhost:3001/blog/1
  http://localhost:3001/categories
  http://localhost:3001/search?q=binja
  http://localhost:3001/api/posts (JSON)

Press Ctrl+C to stop.
`)
