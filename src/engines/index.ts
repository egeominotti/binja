/**
 * Multi-Engine Support
 * Unified interface for multiple template engines
 */

import * as handlebars from './handlebars'
import * as liquid from './liquid'
import * as twig from './twig'

export { handlebars, liquid, twig }

/**
 * Engine interface
 */
export interface TemplateEngine {
  name: string
  extensions: string[]
  parse: (source: string) => any
  compile: (source: string) => (context: Record<string, any>) => Promise<string>
  render: (source: string, context?: Record<string, any>) => Promise<string>
}

/**
 * Registry of all available engines
 */
export const engines: Record<string, TemplateEngine> = {
  handlebars: handlebars.engine,
  hbs: handlebars.engine,
  liquid: liquid.engine,
  twig: twig.engine,
}

/**
 * Get engine by name or file extension
 */
export function getEngine(nameOrExt: string): TemplateEngine | undefined {
  // Direct name lookup
  if (engines[nameOrExt]) {
    return engines[nameOrExt]
  }

  // Extension lookup
  const ext = nameOrExt.startsWith('.') ? nameOrExt : '.' + nameOrExt
  for (const engine of Object.values(engines)) {
    if (engine.extensions.includes(ext)) {
      return engine
    }
  }

  return undefined
}

/**
 * Detect engine from file path
 */
export function detectEngine(filePath: string): TemplateEngine | undefined {
  const ext = filePath.substring(filePath.lastIndexOf('.'))
  return getEngine(ext)
}

/**
 * Render a template with auto-detected engine
 */
export async function render(
  source: string,
  context: Record<string, any> = {},
  engineName?: string
): Promise<string> {
  const engine = engineName ? getEngine(engineName) : undefined

  if (engine) {
    return engine.render(source, context)
  }

  // Fall back to default binja (Jinja2) engine
  const { render: binjaRender } = await import('../index')
  return binjaRender(source, context)
}

/**
 * Multi-engine environment for API service
 */
export class MultiEngine {
  private defaultEngine: string = 'jinja2'

  constructor(defaultEngine?: string) {
    if (defaultEngine) {
      this.defaultEngine = defaultEngine
    }
  }

  /**
   * Render with specified engine
   */
  async render(
    source: string,
    context: Record<string, any> = {},
    engineName?: string
  ): Promise<string> {
    const name = engineName || this.defaultEngine

    // Handle jinja2/dtl (default binja)
    if (name === 'jinja2' || name === 'jinja' || name === 'dtl' || name === 'django') {
      const { render } = await import('../index')
      return render(source, context)
    }

    const engine = getEngine(name)
    if (!engine) {
      throw new Error(`Unknown template engine: ${name}`)
    }

    return engine.render(source, context)
  }

  /**
   * Compile template with specified engine
   */
  compile(source: string, engineName?: string): (context: Record<string, any>) => Promise<string> {
    const name = engineName || this.defaultEngine

    // Handle jinja2/dtl (default binja)
    if (name === 'jinja2' || name === 'jinja' || name === 'dtl' || name === 'django') {
      // Return a wrapper that uses binja
      return async (context: Record<string, any>) => {
        const { render } = await import('../index')
        return render(source, context)
      }
    }

    const engine = getEngine(name)
    if (!engine) {
      throw new Error(`Unknown template engine: ${name}`)
    }

    return engine.compile(source)
  }

  /**
   * List all available engines
   */
  listEngines(): string[] {
    return ['jinja2', 'jinja', 'dtl', 'django', ...Object.keys(engines)]
  }
}
