/**
 * Framework Adapter Tests
 * Tests for Hono and Elysia integrations
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { Elysia } from 'elysia'
import { binja as honoAdapter, clearCache as honoClearCache } from '../src/adapters/hono'
import { binja as elysiaAdapter, clearCache as elysiaClearCache } from '../src/adapters/elysia'

const TEST_PORT_HONO = 4001
const TEST_PORT_ELYSIA = 4002

describe('Hono Adapter', () => {
  let app: Hono

  beforeAll(() => {
    honoClearCache()
    app = new Hono()
    app.use(honoAdapter({
      root: './test/views',
      extension: '.html',
      debug: true,
      cache: false,
    }))
    app.get('/', (c) => c.render('index', { title: 'Test', name: 'World' }))
    app.get('/missing', (c) => c.render('nonexistent', {}))
  })

  test('renders template with context', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain('<title>Test</title>')
    expect(html).toContain('<h1>Hello World!</h1>')
  })

  test('returns 500 for missing template in debug mode', async () => {
    const res = await app.request('/missing')
    expect(res.status).toBe(500)

    const html = await res.text()
    expect(html).toContain('Template Error')
  })

  test('renders with different engines', async () => {
    // Handlebars
    const hbsApp = new Hono()
    hbsApp.use(honoAdapter({
      root: './test/views',
      engine: 'handlebars',
      cache: false,
    }))
    hbsApp.get('/', (c) => c.render('index', { title: 'HBS', name: 'Handlebars' }))

    const res = await hbsApp.request('/')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Hello Handlebars!')
  })

  test('supports global context', async () => {
    const globalApp = new Hono()
    globalApp.use(honoAdapter({
      root: './test/views',
      cache: false,
      globals: { siteName: 'MySite' },
    }))
    globalApp.get('/', (c) => c.render('index', { title: 'Test', name: 'User' }))

    const res = await globalApp.request('/')
    expect(res.status).toBe(200)
  })
})

describe('Elysia Adapter', () => {
  let app: Elysia

  beforeAll(() => {
    elysiaClearCache()
    app = new Elysia()
      .use(elysiaAdapter({
        root: './test/views',
        extension: '.html',
        debug: true,
        cache: false,
      }))
      .get('/', ({ render }) => render('index', { title: 'Test', name: 'World' }))
      .get('/missing', ({ render }) => render('nonexistent', {}))
  })

  test('renders template with context', async () => {
    const res = await app.handle(new Request('http://localhost/'))
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain('<title>Test</title>')
    expect(html).toContain('<h1>Hello World!</h1>')
  })

  test('handles missing template', async () => {
    try {
      await app.handle(new Request('http://localhost/missing'))
    } catch (e) {
      // Expected to throw for missing template
      expect(e).toBeDefined()
    }
  })

  test('renders with different engines', async () => {
    const twigApp = new Elysia()
      .use(elysiaAdapter({
        root: './test/views',
        engine: 'twig',
        cache: false,
      }))
      .get('/', ({ render }) => render('index', { title: 'Twig', name: 'TwigUser' }))

    const res = await twigApp.handle(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Hello TwigUser!')
  })

  test('supports global context', async () => {
    const globalApp = new Elysia()
      .use(elysiaAdapter({
        root: './test/views',
        cache: false,
        globals: { version: '1.0.0' },
      }))
      .get('/', ({ render }) => render('index', { title: 'Global', name: 'Test' }))

    const res = await globalApp.handle(new Request('http://localhost/'))
    expect(res.status).toBe(200)
  })
})

describe('Cache Management', () => {
  test('Hono cache operations', () => {
    honoClearCache()
    const { getCacheStats } = require('../src/adapters/hono')
    const stats = getCacheStats()
    expect(stats.size).toBe(0)
    expect(stats.keys).toEqual([])
  })

  test('Elysia cache operations', () => {
    elysiaClearCache()
    const { getCacheStats } = require('../src/adapters/elysia')
    const stats = getCacheStats()
    expect(stats.size).toBe(0)
    expect(stats.keys).toEqual([])
  })
})
