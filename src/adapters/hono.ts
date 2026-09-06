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

import { CacheRegistry } from './cache-registry'
import { TemplateRenderer } from './renderer'
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
  /** Maximum templates and layouts cached by this adapter instance (default: 100) */
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

const registry = new CacheRegistry()

/**
 * Create binja middleware for Hono
 */
export function binja(options: BinjaHonoOptions = {}): MiddlewareHandler {
  const renderer = new TemplateRenderer(options, registry)
  const debug = options.debug ?? false

  return async (c, next) => {
    // Add render method to context
    c.setRenderer(async (template: string, context: Record<string, any> = {}) => {
      try {
        const html = await renderer.render(template, context)
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
  registry.clear()
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return registry.stats()
}

export default binja
