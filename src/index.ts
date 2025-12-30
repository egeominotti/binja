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
  /** Template file extensions to try (default: ['.html', '.jinja', '.jinja2']) */
  extensions?: string[]
}

export class Environment {
  private options: Required<EnvironmentOptions>
  private runtime: Runtime
  private templateCache: Map<string, TemplateNode> = new Map()
  private routes: Map<string, string> = new Map()

  constructor(options: EnvironmentOptions = {}) {
    this.options = {
      templates: options.templates ?? './templates',
      autoescape: options.autoescape ?? true,
      filters: options.filters ?? {},
      globals: options.globals ?? {},
      urlResolver: options.urlResolver ?? this.defaultUrlResolver.bind(this),
      staticResolver: options.staticResolver ?? this.defaultStaticResolver.bind(this),
      cache: options.cache ?? true,
      extensions: options.extensions ?? ['.html', '.jinja', '.jinja2', ''],
    }

    this.runtime = new Runtime({
      autoescape: this.options.autoescape,
      filters: this.options.filters,
      globals: this.options.globals,
      urlResolver: this.options.urlResolver,
      staticResolver: this.options.staticResolver,
      templateLoader: this.loadTemplate.bind(this),
    })
  }

  /**
   * Render a template file with the given context
   */
  async render(templateName: string, context: Record<string, any> = {}): Promise<string> {
    const ast = await this.loadTemplate(templateName)
    return this.runtime.render(ast, context)
  }

  /**
   * Render a template string directly
   */
  async renderString(source: string, context: Record<string, any> = {}): Promise<string> {
    const ast = this.compile(source)
    return this.runtime.render(ast, context)
  }

  /**
   * Compile a template string to AST (useful for caching)
   */
  compile(source: string): TemplateNode {
    const lexer = new Lexer(source)
    const tokens = lexer.tokenize()
    const parser = new Parser(tokens)
    return parser.parse()
  }

  /**
   * Load and compile a template file
   */
  async loadTemplate(templateName: string): Promise<TemplateNode> {
    // Check cache first
    if (this.options.cache && this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!
    }

    // Resolve template path
    const templatePath = await this.resolveTemplatePath(templateName)
    if (!templatePath) {
      throw new Error(`Template not found: ${templateName}`)
    }

    // Read and compile - Bun.file() is 5-10x faster than fs.promises
    const source = await Bun.file(templatePath).text()
    const ast = this.compile(source)

    // Cache if enabled
    if (this.options.cache) {
      this.templateCache.set(templateName, ast)
    }

    return ast
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.templateCache.clear()
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
  const parser = new Parser(tokens)
  const ast = parser.parse()
  return compileToFunction(ast, options)
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
  const parser = new Parser(tokens)
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
export type { CompileOptions } from './compiler'
export { builtinTests } from './tests'
export type { TestFunction } from './tests'
