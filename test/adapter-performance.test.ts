import { describe, expect, spyOn, test } from 'bun:test'
import * as fs from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { Elysia } from 'elysia'
import {
  binja as hono,
  clearCache as clearHono,
  getCacheStats as honoStats,
} from '../src/adapters/hono'
import {
  binja as elysia,
  clearCache as clearElysia,
  getCacheStats as elysiaStats,
} from '../src/adapters/elysia'
import type { BinjaHonoOptions } from '../src/adapters/hono'

const adapters = [
  {
    name: 'Hono',
    clear: clearHono,
    stats: honoStats,
    create(options: BinjaHonoOptions, template: () => string) {
      const app = new Hono()
        .use(hono(options))
        .get('/', (c) =>
          c.render(template(), { name: c.req.query('name') ?? 'Alice', label: 'request' })
        )
      return (name = 'Alice') => app.request(`/?name=${name}`)
    },
  },
  {
    name: 'Elysia',
    clear: clearElysia,
    stats: elysiaStats,
    create(options: BinjaHonoOptions, template: () => string) {
      const app = new Elysia()
        .use(elysia(options))
        .get('/', ({ render, query }) =>
          render(template(), { name: query.name ?? 'Alice', label: 'request' })
        )
      return (name = 'Alice') => app.handle(new Request(`http://localhost/?name=${name}`))
    },
  },
]

for (const adapter of adapters) {
  describe(`${adapter.name} cached rendering`, () => {
    for (const engine of ['handlebars', 'liquid', 'twig'] as const) {
      test(`${engine} caches layouts with the body, invalidates both and isolates contexts`, async () => {
        const root = fs.mkdtempSync(join(tmpdir(), 'binja-layout-cache-'))
        const layout = join(root, 'layout.html')
        adapter.clear()
        try {
          fs.writeFileSync(join(root, 'page.html'), 'body {{ name }}')
          fs.writeFileSync(layout, 'old {{ label }} [{{ content }}]')
          const request = adapter.create(
            {
              root,
              engine,
              cache: true,
              cacheMaxSize: 2,
              layout: 'layout',
              globals: { label: 'global' },
            },
            () => 'page'
          )
          expect(await (await request()).text()).toBe('old request [body Alice]')
          fs.writeFileSync(layout, 'new {{ label }} [{{ content }}]')
          expect(await (await request('Bob')).text()).toBe('old request [body Bob]')
          expect(adapter.stats().keys.filter((key) => key.includes(root))).toHaveLength(2)

          adapter.clear()
          const outputs = await Promise.all(
            Array.from({ length: 16 }, async (_, i) => (await request(`user${i}`)).text())
          )
          expect(outputs).toEqual(
            Array.from({ length: 16 }, (_, i) => `new request [body user${i}]`)
          )

          const uncached = adapter.create(
            { root, engine, cache: false, layout: 'layout' },
            () => 'page'
          )
          expect(await (await uncached()).text()).toBe('new request [body Alice]')
          fs.writeFileSync(layout, 'updated [{{ content }}]')
          expect(await (await uncached()).text()).toBe('updated [body Alice]')
        } finally {
          fs.rmSync(root, { recursive: true, force: true })
          adapter.clear()
        }
      })

      test(`${engine} shares the LRU limit between templates and layouts`, async () => {
        const root = fs.mkdtempSync(join(tmpdir(), 'binja-layout-lru-'))
        let template = 'one'
        adapter.clear()
        try {
          fs.writeFileSync(join(root, 'one.html'), 'one')
          fs.writeFileSync(join(root, 'two.html'), 'two')
          fs.writeFileSync(join(root, 'layout.html'), '[{{ content }}]')
          const request = adapter.create(
            { root, engine, cache: true, cacheMaxSize: 2, layout: 'layout' },
            () => template
          )
          expect(await (await request()).text()).toBe('[one]')
          template = 'two'
          expect(await (await request()).text()).toBe('[two]')
          const keys = adapter.stats().keys.filter((key) => key.includes(root))
          expect(keys).toHaveLength(2)
          expect(keys.some((key) => key.endsWith('/layout.html'))).toBe(true)
          expect(keys.some((key) => key.endsWith('/one.html'))).toBe(false)
          fs.writeFileSync(join(root, 'one.html'), 'reloaded')
          template = 'one'
          expect(await (await request()).text()).toBe('[reloaded]')
        } finally {
          fs.rmSync(root, { recursive: true, force: true })
          adapter.clear()
        }
      })
    }

    test('warm Jinja body and layout rendering performs no filesystem path checks', async () => {
      const root = fs.mkdtempSync(join(tmpdir(), 'binja-path-cache-'))
      try {
        fs.writeFileSync(join(root, 'page.html'), '<b>{{ name }}</b>')
        fs.writeFileSync(join(root, 'layout.html'), '<main>{{ content }}</main>')
        const request = adapter.create({ root, cache: true, layout: 'layout' }, () => 'page')
        expect(await (await request()).text()).toBe('<main><b>Alice</b></main>')
        const realpath = spyOn(fs, 'realpathSync')
        const exists = spyOn(fs, 'existsSync')
        try {
          expect(await (await request('Bob')).text()).toBe('<main><b>Bob</b></main>')
          expect(realpath).not.toHaveBeenCalled()
          expect(exists).not.toHaveBeenCalled()
        } finally {
          realpath.mockRestore()
          exists.mockRestore()
        }
      } finally {
        fs.rmSync(root, { recursive: true, force: true })
        adapter.clear()
      }
    })

    for (const engine of ['jinja2', 'handlebars', 'liquid', 'twig'] as const) {
      test(`${engine} validates traversal and symlinks when loading and after invalidation`, async () => {
        const directory = fs.mkdtempSync(join(tmpdir(), 'binja-adapter-paths-'))
        const root = join(directory, 'views')
        fs.mkdirSync(root)
        fs.writeFileSync(join(root, 'safe.html'), 'inside')
        fs.writeFileSync(join(directory, 'secret.html'), 'outside-secret')
        fs.symlinkSync(join(root, 'safe.html'), join(root, 'alias.html'))
        fs.symlinkSync(join(directory, 'secret.html'), join(root, 'escape.html'))
        let template = 'alias'
        const errorLog = spyOn(console, 'error').mockImplementation(() => {})
        try {
          const request = adapter.create({ root, engine, cache: true }, () => template)
          expect(await (await request()).text()).toBe('inside')
          for (const invalid of ['../secret', join(directory, 'secret.html'), 'escape']) {
            template = invalid
            const response = await request()
            expect(response.status).toBe(500)
            expect(await response.text()).not.toContain('outside-secret')
          }
          fs.unlinkSync(join(root, 'alias.html'))
          fs.symlinkSync(join(directory, 'secret.html'), join(root, 'alias.html'))
          template = 'alias'
          // A cache hit can only use the previously validated source, never the new target.
          expect(await (await request()).text()).toBe('inside')
          adapter.clear()
          const reloaded = await request()
          expect(reloaded.status).toBe(500)
          expect(await reloaded.text()).not.toContain('outside-secret')

          const layoutRequest = adapter.create(
            { root, engine, cache: false, layout: '../secret' },
            () => 'safe'
          )
          expect((await layoutRequest()).status).toBe(500)
          const symlinkLayout = adapter.create(
            { root, engine, cache: false, layout: 'escape' },
            () => 'safe'
          )
          expect((await symlinkLayout()).status).toBe(500)

          const rootAlias = join(directory, 'root-alias')
          fs.symlinkSync(root, rootAlias)
          const aliasedRoot = adapter.create(
            { root: rootAlias, engine, cache: false },
            () => 'safe'
          )
          expect(await (await aliasedRoot()).text()).toBe('inside')
        } finally {
          errorLog.mockRestore()
          fs.rmSync(directory, { recursive: true, force: true })
          adapter.clear()
        }
      })
    }
  })
}
