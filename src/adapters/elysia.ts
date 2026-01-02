/**
 * Elysia Adapter for binja
 * Seamless integration with Elysia framework
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia'
 * import { binja } from 'binja/elysia'
 *
 * const app = new Elysia()
 *   .use(binja({ root: './views' }))
 *   .get('/', ({ render }) => render('index', { title: 'Home' }))
 *   .listen(3000)
 * ```
 */

import { readFile } from 'fs/promises'
import { join, extname } from 'path'
import { Environment, compile as binjaCompile } from '../index'
import type { Elysia } from 'elysia'

export interface BinjaElysiaOptions {
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
  /** Global context data available in all templates */
  globals?: Record<string, any>
  /** Layout template name (optional) */
  layout?: string
  /** Content variable name in layout (default: 'content') */
  contentVar?: string
}

const templateCache = new Map<string, (ctx: Record<string, any>) => Promise<string>>()

/**
 * Create binja plugin for Elysia
 */
export function binja(options: BinjaElysiaOptions = {}) {
  const {
    root = './views',
    extension = '.html',
    engine = 'jinja2',
    debug = false,
    cache = process.env.NODE_ENV === 'production',
    globals = {},
    layout,
    contentVar = 'content',
  } = options

  const env = new Environment({ debug })

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

  // Render function to be added to context
  const renderTemplate = async (template: string, context: Record<string, any> = {}) => {
    // Resolve template path
    const ext = extname(template) || extension
    const templatePath = extname(template) ? template : `${template}${ext}`
    const fullPath = join(root, templatePath)
    const cacheKey = `${engine}:${fullPath}`

    let html: string

    // Check cache
    if (cache && templateCache.has(cacheKey)) {
      const compiledFn = templateCache.get(cacheKey)!
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
          default: {
            const compiled = binjaCompile(source)
            compileFn = async (ctx) => compiled(ctx)
          }
        }

        templateCache.set(cacheKey, compileFn)
        html = await compileFn({ ...globals, ...context })
      } else {
        html = await render(source, { ...globals, ...context })
      }
    }

    // Apply layout if specified
    if (layout) {
      const layoutPath = join(root, extname(layout) ? layout : `${layout}${extension}`)
      const layoutSource = await readFile(layoutPath, 'utf-8')
      const render = await getRenderFn(engine)
      html = await render(layoutSource, { ...globals, ...context, [contentVar]: html })
    }

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return (app: Elysia) =>
    app.derive(() => ({
      render: renderTemplate,
    }))
}

/**
 * Clear template cache
 */
export function clearCache(): void {
  templateCache.clear()
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: templateCache.size,
    keys: Array.from(templateCache.keys()),
  }
}

export default binja
