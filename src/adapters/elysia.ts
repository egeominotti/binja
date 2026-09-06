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

import { CacheRegistry } from './cache-registry'
import { TemplateRenderer } from './renderer'
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
  /** Maximum templates and layouts cached by this adapter instance (default: 100) */
  cacheMaxSize?: number
  /** Global context data available in all templates */
  globals?: Record<string, any>
  /** Layout template name (optional) */
  layout?: string
  /** Content variable name in layout (default: 'content') */
  contentVar?: string
}

const registry = new CacheRegistry()

/**
 * Create binja plugin for Elysia
 */
export function binja(options: BinjaElysiaOptions = {}) {
  const renderer = new TemplateRenderer(options, registry)
  const renderTemplate = async (template: string, context: Record<string, any> = {}) =>
    new Response(await renderer.render(template, context), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })

  return (app: Elysia) =>
    app.derive(() => ({
      render: renderTemplate,
    }))
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
