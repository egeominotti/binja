/**
 * Hono Adapter for binja
 * Seamless integration with Hono framework
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono'
 * import { binja } from 'binja/hono'
 *
 * const app = new Hono()
 *
 * app.use(binja({ root: './views' }))
 *
 * app.get('/', (c) => c.render('index', { title: 'Home' }))
 * ```
 */

import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { Environment, resolveContained } from '../index'
import type { MiddlewareHandler } from 'hono'

export interface BinjaHonoOptions {
  /** Root directory for templates (default: './views') */
  root?: string
  /** Default file extension (default: '.html') */
  extension?: string
  /** Template engine: 'jinja2' | 'handlebars' | 'liquid' | 'twig' (default: 'jinja2') */
  engine?: 'jinja2' | 'handlebars' | 'liquid' | 'twig'
  /** Enable debug panel (default: false) */
  debug?: boolean
  /** Cache compiled templates (default: true in production) */
  cache?: boolean
  /** Maximum templates cached by this adapter instance (default: 100) */
  cacheMaxSize?: number
  /** Global context data available in all templates */
  globals?: Record<string, any>
  /** Layout template name (optional) */
  layout?: string
  /** Content variable name in layout (default: 'content') */
  contentVar?: string
}

// Extend Hono's Context type
declare module 'hono' {
  interface ContextRenderer {
    (template: string, context?: Record<string, any>): Response | Promise<Response>
  }
}

type CompiledTemplate = (ctx: Record<string, any>) => Promise<string>

const secondaryCaches = new Set<{ cache: WeakRef<Map<string, CompiledTemplate>> }>()
const jinjaEnvironments = new Set<{ env: WeakRef<Environment>; root: string }>()

/**
 * Create binja middleware for Hono
 */
export function binja(options: BinjaHonoOptions = {}): MiddlewareHandler {
  const {
    root = './views',
    extension = '.html',
    engine = 'jinja2',
    debug = false,
    cache = process.env.NODE_ENV === 'production',
    cacheMaxSize = 100,
    globals = {},
    layout,
    contentVar = 'content',
  } = options

  if (!Number.isInteger(cacheMaxSize) || cacheMaxSize <= 0) {
    throw new RangeError('cacheMaxSize must be a positive integer')
  }

  // Secondary-engine compilation state belongs to one middleware instance.
  // Keeping it local prevents a newly-created app from inheriting stale code
  // compiled by an older app that happened to use the same absolute path.
  const templateCache = new Map<string, CompiledTemplate>()

  const env = new Environment({
    templates: root,
    extensions: [extension, ''],
    debug,
    cache,
    cacheMaxSize,
    globals,
  })
  if (engine === 'jinja2') {
    jinjaEnvironments.add({ env: new WeakRef(env), root })
  } else if (cache) {
    secondaryCaches.add({ cache: new WeakRef(templateCache) })
  }

  // Get render function based on engine
  const getRenderFn = async (engineName: string) => {
    switch (engineName) {
      case 'handlebars':
        return (await import('../engines/handlebars')).render
      case 'liquid':
        return (await import('../engines/liquid')).render
      case 'twig':
        return (await import('../engines/twig')).render
      default:
        return (source: string, ctx: Record<string, any>) => env.renderString(source, ctx)
    }
  }

  return async (c, next) => {
    // Add render method to context
    c.setRenderer(async (template: string, context: Record<string, any> = {}) => {
      try {
        // Resolve template path with traversal containment: a user-controlled
        // template name (e.g. a route param) must not escape the root dir.
        const templatePath = extname(template) ? template : `${template}${extension}`
        const fullPath = resolveContained(root, templatePath)
        if (fullPath === null) {
          throw new Error(`Template name escapes the root directory: ${template}`)
        }
        const cacheKey = `${engine}:${fullPath}`

        let html: string

        if (engine === 'jinja2') {
          // Environment owns parsing, LRU caching, includes and inheritance.
          html = await env.render(templatePath, context)
        } else if (cache && templateCache.has(cacheKey)) {
          const compiledFn = templateCache.get(cacheKey)!
          templateCache.delete(cacheKey)
          templateCache.set(cacheKey, compiledFn)
          html = await compiledFn({ ...globals, ...context })
        } else {
          // Read and render template
          const source = await readFile(fullPath, 'utf-8')
          const render = await getRenderFn(engine)

          if (cache) {
            // Compile and cache
            let compileFn: (ctx: Record<string, any>) => Promise<string>

            switch (engine) {
              case 'handlebars': {
                const { compile } = await import('../engines/handlebars')
                const fn = compile(source)
                compileFn = async (ctx) => fn(ctx)
                break
              }
              case 'liquid': {
                const { compile } = await import('../engines/liquid')
                const fn = compile(source)
                compileFn = async (ctx) => fn(ctx)
                break
              }
              case 'twig': {
                const { compile } = await import('../engines/twig')
                const fn = compile(source)
                compileFn = async (ctx) => fn(ctx)
                break
              }
              default:
                throw new Error(`Unsupported template engine: ${engine}`)
            }

            while (templateCache.size >= cacheMaxSize) {
              const oldestKey = templateCache.keys().next().value
              if (oldestKey === undefined) break
              templateCache.delete(oldestKey)
            }
            templateCache.set(cacheKey, compileFn)
            html = await compileFn({ ...globals, ...context })
          } else {
            html = await render(source, { ...globals, ...context })
          }
        }

        // Apply layout if specified
        if (layout) {
          const layoutPath = resolveContained(
            root,
            extname(layout) ? layout : `${layout}${extension}`
          )
          if (layoutPath === null) {
            throw new Error(`Layout name escapes the root directory: ${layout}`)
          }
          if (engine === 'jinja2') {
            const safeContent = new String(html) as any
            safeContent.__safe__ = true
            const layoutName = extname(layout) ? layout : `${layout}${extension}`
            html = await env.render(layoutName, { ...context, [contentVar]: safeContent })
          } else {
            const layoutSource = await readFile(layoutPath, 'utf-8')
            const render = await getRenderFn(engine)
            html = await render(layoutSource, { ...globals, ...context, [contentVar]: html })
          }
        }

        return c.html(html)
      } catch (error) {
        const err = error as Error
        console.error(`[binja] Template error: ${err.message}`)

        if (debug) {
          // Escape the stack/message: it can contain template source or user
          // input and must not be injected into the error page as raw HTML.
          const detail = Bun.escapeHTML(err.stack || err.message)
          return c.html(
            `
            <html>
              <head><title>Template Error</title></head>
              <body style="font-family: monospace; padding: 20px;">
                <h1 style="color: red;">Template Error</h1>
                <pre style="background: #f5f5f5; padding: 15px; overflow: auto;">${detail}</pre>
              </body>
            </html>
          `,
            500
          )
        }

        throw error
      }
    })

    await next()
  }
}

/**
 * Clear template cache
 */
export function clearCache(): void {
  for (const entry of secondaryCaches) {
    const cache = entry.cache.deref()
    if (cache) cache.clear()
    else secondaryCaches.delete(entry)
  }
  for (const entry of jinjaEnvironments) {
    const env = entry.env.deref()
    if (env) env.clearCache()
    else jinjaEnvironments.delete(entry)
  }
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; keys: string[] } {
  const keys: string[] = []
  for (const entry of secondaryCaches) {
    const cache = entry.cache.deref()
    if (!cache) {
      secondaryCaches.delete(entry)
      continue
    }
    keys.push(...cache.keys())
  }
  for (const entry of jinjaEnvironments) {
    const env = entry.env.deref()
    if (!env) {
      jinjaEnvironments.delete(entry)
      continue
    }
    const { root } = entry
    for (const key of env.cacheKeys()) {
      keys.push(`jinja2:${root}:${key}`)
    }
  }

  return {
    size: keys.length,
    keys,
  }
}

export default binja
