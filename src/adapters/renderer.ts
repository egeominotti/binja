import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { Environment, resolveContained } from '../index'
import { resolveContainedLexically } from '../paths'
import type { CacheRegistry } from './cache-registry'

interface RendererOptions {
  root?: string
  extension?: string
  engine?: 'jinja2' | 'handlebars' | 'liquid' | 'twig'
  debug?: boolean
  cache?: boolean
  cacheMaxSize?: number
  globals?: Record<string, any>
  layout?: string
  contentVar?: string
}

type CompiledTemplate = (context: Record<string, any>) => Promise<string>

/** Per-instance loading shared by both HTTP adapters, including their layouts. */
export class TemplateRenderer {
  private readonly options: Required<Omit<RendererOptions, 'layout'>> & { layout?: string }
  private readonly environment?: Environment
  private readonly templates = new Map<string, CompiledTemplate>()
  private readonly pending = new Map<string, Promise<CompiledTemplate>>()
  private generation = 0

  constructor(options: RendererOptions, registry: CacheRegistry) {
    this.options = {
      root: options.root ?? './views',
      extension: options.extension ?? '.html',
      engine: options.engine ?? 'jinja2',
      debug: options.debug ?? false,
      cache: options.cache ?? process.env.NODE_ENV === 'production',
      cacheMaxSize: options.cacheMaxSize ?? 100,
      globals: options.globals ?? {},
      layout: options.layout,
      contentVar: options.contentVar ?? 'content',
    }
    const { root, extension, engine, debug, cache, cacheMaxSize, globals } = this.options
    if (!Number.isInteger(cacheMaxSize) || cacheMaxSize <= 0) {
      throw new RangeError('cacheMaxSize must be a positive integer')
    }
    if (engine === 'jinja2') {
      this.environment = new Environment({
        templates: root,
        extensions: [extension, ''],
        debug,
        cache,
        cacheMaxSize,
        globals,
      })
    }
    if (this.environment || cache) registry.add(this)
  }

  async render(template: string, context: Record<string, any> = {}): Promise<string> {
    let html = await this.renderFile(template, context, 'Template')
    const { layout, contentVar } = this.options
    if (layout) {
      const content = this.environment ? Object.assign(new String(html), { __safe__: true }) : html
      html = await this.renderFile(layout, { ...context, [contentVar]: content }, 'Layout')
    }
    return html
  }

  private async renderFile(
    template: string,
    context: Record<string, any>,
    kind: 'Template' | 'Layout'
  ): Promise<string> {
    const { root, extension, globals } = this.options
    const templateName = extname(template) ? template : `${template}${extension}`
    // Reject traversal on every request. Symlink containment is checked when
    // loading source; a cache hit renders previously validated code without I/O.
    const fullPath = resolveContainedLexically(root, templateName)
    if (fullPath === null) throw new Error(`${kind} name escapes the root directory: ${template}`)
    if (this.environment) return this.environment.render(templateName, context)
    const compiled = await this.loadCompiled(fullPath)
    return compiled({ ...globals, ...context })
  }

  private async loadCompiled(fullPath: string): Promise<CompiledTemplate> {
    const { cache, engine, cacheMaxSize } = this.options
    if (!cache) return this.compileFile(fullPath)
    const key = `${engine}:${fullPath}`
    const cached = this.templates.get(key)
    if (cached) {
      this.templates.delete(key)
      this.templates.set(key, cached)
      return cached
    }
    const pending = this.pending.get(key)
    if (pending) return pending

    const generation = this.generation
    const load = this.compileFile(fullPath).then((compiled) => {
      // An invalidation must not be undone by an older in-flight file read.
      if (generation === this.generation) {
        this.templates.delete(key)
        while (this.templates.size >= cacheMaxSize) {
          const oldest = this.templates.keys().next().value
          if (oldest === undefined) break
          this.templates.delete(oldest)
        }
        this.templates.set(key, compiled)
      }
      return compiled
    })
    this.pending.set(key, load)
    try {
      return await load
    } finally {
      if (this.pending.get(key) === load) this.pending.delete(key)
    }
  }

  private async compileFile(fullPath: string): Promise<CompiledTemplate> {
    if (resolveContained(this.options.root, fullPath) === null) {
      throw new Error(`Template name escapes the root directory: ${fullPath}`)
    }
    const source = await readFile(fullPath, 'utf-8')
    switch (this.options.engine) {
      case 'handlebars':
        return (await import('../engines/handlebars')).compile(source)
      case 'liquid':
        return (await import('../engines/liquid')).compile(source)
      case 'twig':
        return (await import('../engines/twig')).compile(source)
      default:
        throw new Error(`Unsupported template engine: ${this.options.engine}`)
    }
  }

  clearCache(): void {
    this.generation++
    this.templates.clear()
    this.pending.clear()
    this.environment?.clearCache()
  }

  cacheKeys(): string[] {
    if (this.environment) {
      return this.environment.cacheKeys().map((key) => `jinja2:${this.options.root}:${key}`)
    }
    return [...this.templates.keys()]
  }
}
