/**
 * Jinja-Bun: Jinja2/Django Template Language engine for Bun/JavaScript
 *
 * 100% compatible with Django Template Language (DTL)
 * High performance template rendering for Bun runtime
 *
 * @example
 * ```typescript
 * import { Environment } from 'jinja-bun'
 *
 * const env = new Environment({
 *   templates: './templates',
 *   autoescape: true,
 * })
 *
 * const html = await env.render('page.html', {
 *   title: 'Hello',
 *   items: [1, 2, 3],
 * })
 * ```
 */

import { Lexer, Token, TokenType } from './lexer'
import { Parser, TemplateNode } from './parser'
import { Runtime, RuntimeOptions, Context } from './runtime'
import { builtinFilters, FilterFunction } from './filters'
import { compileToString, compileToFunction, CompileOptions } from './compiler'
import { flattenTemplate, canFlatten, TemplateLoader } from './compiler/flattener'
import { startDebugCollection, endDebugCollection, generateDebugPanel } from './debug'
import type { PanelOptions } from './debug'
import * as path from 'path'

// Pre-compiled regex for URL parameter replacement (avoid per-call compilation)
const URL_PARAM_REGEX = /<[^>]+>|:[a-zA-Z_]+|\(\?P<[^>]+>\[[^\]]+\]\)/g

export interface EnvironmentOptions {
  /** Template directory path */
  templates?: string
  /** Auto-escape HTML (default: true) */
  autoescape?: boolean
  /** Custom filters */
  filters?: Record<string, FilterFunction>
  /** Global variables available in all templates */
  globals?: Record<string, any>
  /** URL resolver for {% url %} tag */
  urlResolver?: (name: string, args: any[], kwargs: Record<string, any>) => string
  /** Static file resolver for {% static %} tag */
  staticResolver?: (path: string) => string
  /** Cache compiled templates (default: true) */
  cache?: boolean
  /** Maximum number of templates to cache (LRU eviction, default: 100) */
  cacheMaxSize?: number
  /** Template file extensions to try (default: ['.html', '.jinja', '.jinja2']) */
  extensions?: string[]
  /** Enable debug panel injection (default: false) */
  debug?: boolean
  /** Debug panel options */
  debugOptions?: PanelOptions
  /** Timezone for date/time operations (e.g., 'Europe/Rome', 'UTC', 'America/New_York') */
  timezone?: string
}

export interface CacheStats {
  /** Number of templates currently in cache */
  size: number
  /** Maximum cache size */
  maxSize: number
  /** Number of cache hits */
  hits: number
  /** Number of cache misses */
  misses: number
  /** Hit rate percentage */
  hitRate: number
}

export class Environment {
  private options: Omit<Required<EnvironmentOptions>, 'timezone' | 'cacheMaxSize'> & { timezone?: string; cacheMaxSize: number }
  private runtime: Runtime
  private templateCache: Map<string, TemplateNode> = new Map()
  private routes: Map<string, string> = new Map()
  private cacheHits: number = 0
  private cacheMisses: number = 0

  constructor(options: EnvironmentOptions = {}) {
    this.options = {
      templates: options.templates ?? './templates',
      autoescape: options.autoescape ?? true,
      filters: options.filters ?? {},
      globals: options.globals ?? {},
      urlResolver: options.urlResolver ?? this.defaultUrlResolver.bind(this),
      staticResolver: options.staticResolver ?? this.defaultStaticResolver.bind(this),
      cache: options.cache ?? true,
      cacheMaxSize: options.cacheMaxSize ?? 100,
      extensions: options.extensions ?? ['.html', '.jinja', '.jinja2', ''],
      debug: options.debug ?? false,
      debugOptions: options.debugOptions ?? {},
      timezone: options.timezone ?? undefined,
    }

    this.runtime = new Runtime({
      autoescape: this.options.autoescape,
      filters: this.options.filters,
      globals: this.options.globals,
      urlResolver: this.options.urlResolver,
      staticResolver: this.options.staticResolver,
      templateLoader: this.loadTemplate.bind(this),
      timezone: this.options.timezone,
    })
  }

  /**
   * Render a template file with the given context
   */
  async render(templateName: string, context: Record<string, any> = {}): Promise<string> {
    if (this.options.debug) {
      return this.renderWithDebug(templateName, context)
    }
    const ast = await this.loadTemplate(templateName)
    return this.runtime.render(ast, context)
  }

  /**
   * Render a template string directly
   */
  async renderString(source: string, context: Record<string, any> = {}): Promise<string> {
    if (this.options.debug) {
      return this.renderStringWithDebug(source, context)
    }
    const ast = this.compile(source)
    return this.runtime.render(ast, context)
  }

  /**
   * Internal: Render with debug panel
   */
  private async renderWithDebug(templateName: string, context: Record<string, any>): Promise<string> {
    const collector = startDebugCollection()
    collector.captureContext(context)
    collector.addTemplate(templateName, 'root')
    collector.setMode('runtime')

    collector.startRender()
    const ast = await this.loadTemplate(templateName)
    let html = this.runtime.render(ast, context)
    // Handle case where render might return a Promise
    if (html && typeof (html as any).then === 'function') {
      html = await (html as any)
    }
    collector.endRender()

    const data = endDebugCollection()!
    return this.injectDebugPanel(String(html || ''), data)
  }

  /**
   * Internal: Render string with debug panel
   */
  private async renderStringWithDebug(source: string, context: Record<string, any>): Promise<string> {
    const collector = startDebugCollection()
    collector.captureContext(context)
    collector.setMode('runtime')

    collector.startRender()
    const ast = this.compile(source)
    let html = this.runtime.render(ast, context)
    if (html && typeof (html as any).then === 'function') {
      html = await (html as any)
    }
    collector.endRender()

    const data = endDebugCollection()!
    return this.injectDebugPanel(String(html || ''), data)
  }

  /**
   * Internal: Inject debug panel into HTML
   */
  private injectDebugPanel(html: string, data: any): string {
    if (!html || typeof html !== 'string') return html || ''

    const isHtml = html.includes('<html') || html.includes('<body') || html.includes('<!DOCTYPE')
    if (!isHtml) return html

    const panel = generateDebugPanel(data, this.options.debugOptions)

    if (html.includes('</body>')) {
      return html.replace('</body>', `${panel}</body>`)
    }
    return html + panel
  }

  /**
   * Compile a template string to AST (useful for caching)
   */
  compile(source: string): TemplateNode {
    const lexer = new Lexer(source)
    const tokens = lexer.tokenize()
    const parser = new Parser(tokens, source)
    return parser.parse()
  }

  /**
   * Load and compile a template file (with LRU cache)
   */
  async loadTemplate(templateName: string): Promise<TemplateNode> {
    // Check cache first (LRU: move to end on access)
    if (this.options.cache && this.templateCache.has(templateName)) {
      this.cacheHits++
      // LRU: delete and re-add to move to end (most recently used)
      const ast = this.templateCache.get(templateName)!
      this.templateCache.delete(templateName)
      this.templateCache.set(templateName, ast)
      return ast
    }

    this.cacheMisses++

    // Resolve template path
    const templatePath = await this.resolveTemplatePath(templateName)
    if (!templatePath) {
      throw new Error(`Template not found: ${templateName}`)
    }

    // Read and compile - Bun.file() is 5-10x faster than fs.promises
    const source = await Bun.file(templatePath).text()
    const ast = this.compile(source)

    // Cache if enabled (with LRU eviction)
    if (this.options.cache) {
      // LRU eviction: remove oldest (first) entries if cache is full
      while (this.templateCache.size >= this.options.cacheMaxSize) {
        const oldestKey = this.templateCache.keys().next().value
        if (oldestKey) this.templateCache.delete(oldestKey)
      }
      this.templateCache.set(templateName, ast)
    }

    return ast
  }

  /**
   * Clear the template cache and reset stats
   */
  clearCache(): void {
    this.templateCache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }

  /**
   * Get current cache size
   */
  cacheSize(): number {
    return this.templateCache.size
  }

  /**
   * Get cache statistics
   */
  cacheStats(): CacheStats {
    const total = this.cacheHits + this.cacheMisses
    return {
      size: this.templateCache.size,
      maxSize: this.options.cacheMaxSize,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? (this.cacheHits / total) * 100 : 0,
    }
  }

  /**
   * Add a custom filter
   */
  addFilter(name: string, fn: FilterFunction): void {
    this.runtime.addFilter(name, fn)
  }

  /**
   * Add a global variable
   */
  addGlobal(name: string, value: any): void {
    this.runtime.addGlobal(name, value)
  }

  /**
   * Register a URL route for {% url %} tag (Django-style)
   */
  addUrl(name: string, pattern: string): void {
    this.routes.set(name, pattern)
  }

  /**
   * Register multiple URL routes
   */
  addUrls(routes: Record<string, string>): void {
    for (const [name, pattern] of Object.entries(routes)) {
      this.routes.set(name, pattern)
    }
  }

  // ==================== Private Methods ====================

  private async resolveTemplatePath(templateName: string): Promise<string | null> {
    const basePath = path.resolve(this.options.templates, templateName)

    // Try with each extension - Bun.file().exists() is faster than fs.access
    for (const ext of this.options.extensions) {
      const fullPath = basePath + ext
      if (await Bun.file(fullPath).exists()) {
        return fullPath
      }
    }

    return null
  }

  private defaultUrlResolver(name: string, args: any[], kwargs: Record<string, any>): string {
    const pattern = this.routes.get(name)
    if (!pattern) {
      console.warn(`URL pattern not found: ${name}`)
      return `#${name}`
    }

    // Replace named parameters using for...in (avoids Object.entries allocation)
    let url = pattern
    for (const key in kwargs) {
      const encoded = encodeURIComponent(String(kwargs[key]))
      // Use replaceAll for fixed strings (faster than multiple replace calls)
      url = url.replaceAll(`:${key}`, encoded)
      url = url.replaceAll(`<${key}>`, encoded)
      url = url.replaceAll(`(?P<${key}>[^/]+)`, encoded)
    }

    // Replace positional parameters (use pre-compiled regex)
    let argIndex = 0
    URL_PARAM_REGEX.lastIndex = 0 // Reset regex state
    url = url.replace(URL_PARAM_REGEX, () => {
      if (argIndex < args.length) {
        return encodeURIComponent(String(args[argIndex++]))
      }
      return ''
    })

    return url
  }

  private defaultStaticResolver(filePath: string): string {
    return `/static/${filePath}`
  }
}

/**
 * Quick render function for simple use cases
 */
export async function render(
  source: string,
  context: Record<string, any> = {},
  options: EnvironmentOptions = {}
): Promise<string> {
  const env = new Environment(options)
  return env.renderString(source, context)
}

/**
 * Create a template function (like Jinja2's Template class)
 */
export function Template(source: string, options: EnvironmentOptions = {}) {
  const env = new Environment(options)
  const ast = env.compile(source)

  // Create runtime once for better performance (avoid recreation on each render)
  const runtime = new Runtime({
    autoescape: options.autoescape ?? true,
    filters: options.filters ?? {},
    globals: options.globals ?? {},
    urlResolver: options.urlResolver,
    staticResolver: options.staticResolver,
    templateLoader: async () => ast,
  })

  return {
    async render(context: Record<string, any> = {}): Promise<string> {
      return runtime.render(ast, context)
    },
  }
}

// ==================== AOT Compilation ====================

/**
 * Compile a template to an optimized JavaScript function (AOT mode)
 * Returns a sync function that is 10-50x faster than runtime rendering
 *
 * Note: This function does NOT support {% extends %} or {% include %}.
 * Use compileWithInheritance() for templates with inheritance.
 *
 * @example
 * ```typescript
 * const renderUser = compile('<h1>{{ name|upper }}</h1>')
 * const html = renderUser({ name: 'world' }) // <h1>WORLD</h1>
 * ```
 */
export function compile(
  source: string,
  options: CompileOptions = {}
): (ctx: Record<string, any>) => string {
  const lexer = new Lexer(source)
  const tokens = lexer.tokenize()
  const parser = new Parser(tokens, source)
  const ast = parser.parse()
  return compileToFunction(ast, options)
}

export interface CompileWithInheritanceOptions extends CompileOptions {
  /** Base directory for resolving template paths */
  templates: string
  /** File extensions to try (default: ['.html', '.jinja', '.jinja2', '']) */
  extensions?: string[]
}

/**
 * Compile a template with full inheritance support (extends/include/block)
 * Resolves all template inheritance at compile-time for maximum AOT performance.
 *
 * IMPORTANT: All {% extends %} and {% include %} must use static string literals.
 * Dynamic template names (variables) are not supported in AOT mode.
 *
 * @example
 * ```typescript
 * // page.html: {% extends "base.html" %}{% block content %}Hello{% endblock %}
 * const renderPage = await compileWithInheritance('page.html', {
 *   templates: './templates'
 * })
 * const html = renderPage({ title: 'Home' }) // Full page with base template
 * ```
 */
export async function compileWithInheritance(
  templateName: string,
  options: CompileWithInheritanceOptions
): Promise<(ctx: Record<string, any>) => string> {
  const extensions = options.extensions ?? ['.html', '.jinja', '.jinja2', '']
  const templatesDir = path.resolve(options.templates)

  // Create template loader
  const loader: TemplateLoader = {
    load(name: string): string {
      const basePath = path.resolve(templatesDir, name)
      for (const ext of extensions) {
        const fullPath = basePath + ext
        const file = Bun.file(fullPath)
        // Sync check - Bun.file().text() is async but we need sync for flattening
        // Use require('fs') for sync file reading during compilation
        const fs = require('fs')
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath, 'utf-8')
        }
      }
      throw new Error(`Template not found: ${name}`)
    },
    parse(source: string): TemplateNode {
      const lexer = new Lexer(source)
      const tokens = lexer.tokenize()
      const parser = new Parser(tokens, source)
      return parser.parse()
    }
  }

  // Load and parse the main template
  const source = loader.load(templateName)
  const ast = loader.parse(source)

  // Check if we can flatten
  const check = canFlatten(ast)
  if (!check.canFlatten) {
    throw new Error(
      `Cannot compile template with AOT: ${check.reason}\n` +
      `Use Environment.render() for dynamic template names.`
    )
  }

  // Flatten the template (resolve all inheritance)
  const flattenedAst = flattenTemplate(ast, { loader })

  // Compile the flattened AST
  return compileToFunction(flattenedAst, options)
}

/**
 * Compile a template with inheritance to JavaScript code string
 * For build tools and CLI usage.
 */
export async function compileWithInheritanceToCode(
  templateName: string,
  options: CompileWithInheritanceOptions
): Promise<string> {
  const extensions = options.extensions ?? ['.html', '.jinja', '.jinja2', '']
  const templatesDir = path.resolve(options.templates)
  const fs = require('fs')

  const loader: TemplateLoader = {
    load(name: string): string {
      const basePath = path.resolve(templatesDir, name)
      for (const ext of extensions) {
        const fullPath = basePath + ext
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath, 'utf-8')
        }
      }
      throw new Error(`Template not found: ${name}`)
    },
    parse(source: string): TemplateNode {
      const lexer = new Lexer(source)
      const tokens = lexer.tokenize()
      const parser = new Parser(tokens, source)
      return parser.parse()
    }
  }

  const source = loader.load(templateName)
  const ast = loader.parse(source)

  const check = canFlatten(ast)
  if (!check.canFlatten) {
    throw new Error(`Cannot compile template with AOT: ${check.reason}`)
  }

  const flattenedAst = flattenTemplate(ast, { loader })
  return compileToString(flattenedAst, options)
}

/**
 * Compile a template to JavaScript code string (for build tools/CLI)
 * The generated code can be saved to a file and imported directly
 *
 * @example
 * ```typescript
 * const code = compileToCode('<h1>{{ name }}</h1>', { functionName: 'renderHeader' })
 * // Returns: "function renderHeader(__ctx) { ... }"
 * ```
 */
export function compileToCode(
  source: string,
  options: CompileOptions = {}
): string {
  const lexer = new Lexer(source)
  const tokens = lexer.tokenize()
  const parser = new Parser(tokens, source)
  const ast = parser.parse()
  return compileToString(ast, options)
}

// Re-export components for advanced usage
export { Lexer, TokenType } from './lexer'
export type { Token } from './lexer'
export { Parser } from './parser'
export type { TemplateNode, ASTNode, ExpressionNode } from './parser/nodes'
export { Runtime, Context } from './runtime'
export { builtinFilters } from './filters'
export type { FilterFunction } from './filters'
export { TemplateError, TemplateSyntaxError, TemplateRuntimeError } from './errors'
export type { CompileOptions } from './compiler'
export { builtinTests } from './tests'
export type { TestFunction } from './tests'
export { flattenTemplate, canFlatten } from './compiler/flattener'
export type { TemplateLoader } from './compiler/flattener'

// Debug Panel (development only)
export {
  renderWithDebug,
  renderStringWithDebug,
  createDebugRenderer,
  debugMiddleware,
  generateDebugPanel,
} from './debug'
export type { DebugData, PanelOptions, DebugRenderOptions } from './debug'
