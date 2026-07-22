/**
 * Framework Adapter Tests
 * Tests for Hono and Elysia integrations
 */

import { describe, test, expect, beforeAll } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { Elysia } from 'elysia'
import {
  binja as honoAdapter,
  clearCache as honoClearCache,
  getCacheStats as getHonoCacheStats,
} from '../src/adapters/hono'
import {
  binja as elysiaAdapter,
  clearCache as elysiaClearCache,
  getCacheStats as getElysiaCacheStats,
} from '../src/adapters/elysia'

const _TEST_PORT_HONO = 4001
const _TEST_PORT_ELYSIA = 4002

function createElysiaTestApp() {
  return new Elysia()
    .use(
      elysiaAdapter({
        root: './test/views',
        extension: '.html',
        debug: true,
        cache: false,
      })
    )
    .get('/', ({ render }) => render('index', { title: 'Test', name: 'World' }))
    .get('/missing', ({ render }) => render('nonexistent', {}))
}

describe('Hono Adapter', () => {
  let app: Hono

  beforeAll(() => {
    honoClearCache()
    app = new Hono()
    app.use(
      honoAdapter({
        root: './test/views',
        extension: '.html',
        debug: true,
        cache: false,
      })
    )
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
    hbsApp.use(
      honoAdapter({
        root: './test/views',
        engine: 'handlebars',
        cache: false,
      })
    )
    hbsApp.get('/', (c) => c.render('index', { title: 'HBS', name: 'Handlebars' }))

    const res = await hbsApp.request('/')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Hello Handlebars!')
  })

  test('supports global context', async () => {
    const globalApp = new Hono()
    globalApp.use(
      honoAdapter({
        root: './test/views',
        cache: false,
        globals: { siteName: 'MySite' },
      })
    )
    globalApp.get('/', (c) => c.render('index', { title: 'Test', name: 'User' }))

    const res = await globalApp.request('/')
    expect(res.status).toBe(200)
  })

  test('cached mode preserves includes, inheritance and configured root', async () => {
    honoClearCache()
    const cachedApp = new Hono()
    cachedApp.use(honoAdapter({ root: './test/views', cache: true }))
    cachedApp.get('/', (c) =>
      c.render('adapter-child', { title: 'Inherited', message: 'included' })
    )

    const first = await cachedApp.request('/')
    const second = await cachedApp.request('/')
    expect(first.status).toBe(200)
    expect(await first.text()).toContain('<title>Inherited</title>')
    expect(await second.text()).toContain('<span>included</span>')
    expect(getHonoCacheStats().keys).toContain('jinja2:./test/views:adapter-child.html')
  })

  test('secondary-engine cache does not leak stale compilations into a new app', async () => {
    honoClearCache()
    const root = mkdtempSync(join(tmpdir(), `binja-hono-cache-${process.pid}-`))
    const templatePath = join(root, 'page.html')

    try {
      writeFileSync(templatePath, 'old {{ value }}')
      const firstApp = new Hono()
      firstApp.use(honoAdapter({ root, engine: 'handlebars', cache: true }))
      firstApp.get('/', (c) => c.render('page', { value: 'version' }))
      expect(await (await firstApp.request('/')).text()).toBe('old version')

      writeFileSync(templatePath, 'new {{ value }}')
      const secondApp = new Hono()
      secondApp.use(honoAdapter({ root, engine: 'handlebars', cache: true }))
      secondApp.get('/', (c) => c.render('page', { value: 'version' }))
      expect(await (await secondApp.request('/')).text()).toBe('new version')
    } finally {
      rmSync(root, { force: true, recursive: true })
      honoClearCache()
    }
  })

  test('secondary-engine cache obeys the per-adapter LRU bound', async () => {
    honoClearCache()
    const root = mkdtempSync(join(tmpdir(), `binja-hono-lru-${process.pid}-`))
    for (const name of ['a', 'b', 'c']) writeFileSync(join(root, `${name}.html`), name)

    try {
      const app = new Hono()
      app.use(honoAdapter({ root, engine: 'handlebars', cache: true, cacheMaxSize: 2 }))
      app.get('/:page', (c) => c.render(c.req.param('page')))
      for (const name of ['a', 'b', 'c']) {
        expect((await app.request(`/${name}`)).status).toBe(200)
      }

      const keys = getHonoCacheStats().keys
      expect(keys).toHaveLength(2)
      expect(keys.some((key) => key.endsWith('/a.html'))).toBe(false)
      expect(keys.some((key) => key.endsWith('/b.html'))).toBe(true)
      expect(keys.some((key) => key.endsWith('/c.html'))).toBe(true)
    } finally {
      rmSync(root, { force: true, recursive: true })
      honoClearCache()
    }
  })
})

describe('Elysia Adapter', () => {
  let app: ReturnType<typeof createElysiaTestApp>

  beforeAll(() => {
    elysiaClearCache()
    app = createElysiaTestApp()
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
      .use(
        elysiaAdapter({
          root: './test/views',
          engine: 'twig',
          cache: false,
        })
      )
      .get('/', ({ render }) => render('index', { title: 'Twig', name: 'TwigUser' }))

    const res = await twigApp.handle(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Hello TwigUser!')
  })

  test('supports global context', async () => {
    const globalApp = new Elysia()
      .use(
        elysiaAdapter({
          root: './test/views',
          cache: false,
          globals: { version: '1.0.0' },
        })
      )
      .get('/', ({ render }) => render('index', { title: 'Global', name: 'Test' }))

    const res = await globalApp.handle(new Request('http://localhost/'))
    expect(res.status).toBe(200)
  })

  test('cached mode preserves includes and inheritance', async () => {
    elysiaClearCache()
    const cachedApp = new Elysia()
      .use(elysiaAdapter({ root: './test/views', cache: true }))
      .get('/', ({ render }) =>
        render('adapter-child', { title: 'Inherited', message: 'included' })
      )

    const res = await cachedApp.handle(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('<title>Inherited</title>')
    expect(html).toContain('<span>included</span>')
    expect(getElysiaCacheStats().keys).toContain('jinja2:./test/views:adapter-child.html')
  })
})

describe('Cache Management', () => {
  test('Hono cache operations', () => {
    honoClearCache()
    const stats = getHonoCacheStats()
    expect(stats.size).toBe(0)
    expect(stats.keys).toEqual([])
  })

  test('Elysia cache operations', () => {
    elysiaClearCache()
    const stats = getElysiaCacheStats()
    expect(stats.size).toBe(0)
    expect(stats.keys).toEqual([])
  })
})
