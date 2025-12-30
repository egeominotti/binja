/**
 * binja Debug Panel
 *
 * Usage:
 * ```typescript
 * import { renderWithDebug } from 'binja/debug'
 *
 * // In development
 * const html = await renderWithDebug(env, 'page.html', context)
 * // HTML includes debug panel at the bottom
 * ```
 */

import type { Environment } from '../index'
import { DebugCollector, startDebugCollection, endDebugCollection } from './collector'
import { generateDebugPanel, PanelOptions } from './panel'
import type { DebugData } from './collector'

export { DebugCollector, startDebugCollection, endDebugCollection, getDebugCollector } from './collector'
export type { DebugData, ContextValue } from './collector'
export { generateDebugPanel } from './panel'
export type { PanelOptions } from './panel'

export interface DebugRenderOptions {
  /** Panel options */
  panel?: PanelOptions
  /** Only inject if response is HTML */
  htmlOnly?: boolean
}

/**
 * Render a template with debug panel injection
 */
export async function renderWithDebug(
  env: Environment,
  templateName: string,
  context: Record<string, any> = {},
  options: DebugRenderOptions = {}
): Promise<string> {
  const collector = startDebugCollection()

  // Capture context
  collector.captureContext(context)
  collector.addTemplate(templateName, 'root')
  collector.setMode('runtime')

  // Time the render
  collector.startRender()
  const html = await env.render(templateName, context)
  collector.endRender()

  const data = endDebugCollection()!

  // Check if we should inject
  if (options.htmlOnly !== false) {
    const isHtml = html.includes('<html') || html.includes('<body') || html.includes('<!DOCTYPE')
    if (!isHtml) {
      return html
    }
  }

  // Generate and inject panel
  const panel = generateDebugPanel(data, options.panel)

  // Inject before </body> or at end
  if (html.includes('</body>')) {
    return html.replace('</body>', `${panel}</body>`)
  }

  return html + panel
}

/**
 * Render a string template with debug panel
 */
export async function renderStringWithDebug(
  env: Environment,
  source: string,
  context: Record<string, any> = {},
  options: DebugRenderOptions = {}
): Promise<string> {
  const collector = startDebugCollection()

  collector.captureContext(context)
  collector.setMode('runtime')

  collector.startRender()
  const html = await env.renderString(source, context)
  collector.endRender()

  const data = endDebugCollection()!

  if (options.htmlOnly !== false) {
    const isHtml = html.includes('<html') || html.includes('<body')
    if (!isHtml) {
      return html
    }
  }

  const panel = generateDebugPanel(data, options.panel)

  if (html.includes('</body>')) {
    return html.replace('</body>', `${panel}</body>`)
  }

  return html + panel
}

/**
 * Create debug-enabled render functions
 */
export function createDebugRenderer(env: Environment, options: DebugRenderOptions = {}) {
  return {
    async render(templateName: string, context: Record<string, any> = {}): Promise<string> {
      return renderWithDebug(env, templateName, context, options)
    },
    async renderString(source: string, context: Record<string, any> = {}): Promise<string> {
      return renderStringWithDebug(env, source, context, options)
    },
  }
}

/**
 * Middleware factory for web frameworks
 * Injects debug panel into HTML responses
 */
export function debugMiddleware(env: Environment, options: DebugRenderOptions = {}) {
  return {
    /**
     * Hono middleware
     */
    hono() {
      return async (c: any, next: () => Promise<void>) => {
        await next()

        const contentType = c.res.headers.get('content-type') || ''
        if (!contentType.includes('text/html')) return

        const body = await c.res.text()
        const collector = startDebugCollection()
        collector.captureContext({})
        collector.setMode('runtime')
        collector.endRender()
        const data = endDebugCollection()!

        const panel = generateDebugPanel(data, options.panel)
        const newBody = body.includes('</body>')
          ? body.replace('</body>', `${panel}</body>`)
          : body + panel

        c.res = new Response(newBody, {
          status: c.res.status,
          headers: c.res.headers,
        })
      }
    },

    /**
     * Express-style middleware
     */
    express() {
      return (req: any, res: any, next: () => void) => {
        const originalSend = res.send.bind(res)

        res.send = (body: string) => {
          const contentType = res.get('Content-Type') || ''
          if (!contentType.includes('text/html') || typeof body !== 'string') {
            return originalSend(body)
          }

          const collector = startDebugCollection()
          collector.captureContext({})
          collector.setMode('runtime')
          collector.endRender()
          const data = endDebugCollection()!

          const panel = generateDebugPanel(data, options.panel)
          const newBody = body.includes('</body>')
            ? body.replace('</body>', `${panel}</body>`)
            : body + panel

          return originalSend(newBody)
        }

        next()
      }
    },
  }
}
