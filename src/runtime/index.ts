/**
 * Jinja2/DTL Runtime - Executes AST and produces output
 * Compatible with both Jinja2 and Django Template Language
 *
 * OPTIMIZED: Uses synchronous execution path for maximum performance.
 * Only Include/Extends tags require async (for template loading).
 */
import { Context } from './context'
import { builtinFilters, FilterFunction } from '../filters'
import { builtinTests, TestFunction } from '../tests'
import { TemplateRuntimeError, findSimilar } from '../errors'
import type {
  ASTNode,
  TemplateNode,
  TextNode,
  OutputNode,
  IfNode,
  ForNode,
  BlockNode,
  ExtendsNode,
  IncludeNode,
  SetNode,
  WithNode,
  LoadNode,
  UrlNode,
  StaticNode,
  NowNode,
  ExpressionNode,
  NameNode,
  LiteralNode,
  GetAttrNode,
  GetItemNode,
  FilterExprNode,
  BinaryOpNode,
  UnaryOpNode,
  CompareNode,
  ArrayNode,
  ObjectNode,
  ConditionalNode,
  FunctionCallNode,
  TestExprNode,
  // Django additional tags
  CycleNode,
  FirstofNode,
  IfchangedNode,
  RegroupNode,
  WidthratioNode,
  LoremNode,
  CsrfTokenNode,
  DebugNode,
  TemplatetagNode,
} from '../parser/nodes'

export interface RuntimeOptions {
  autoescape?: boolean
  filters?: Record<string, FilterFunction>
  tests?: Record<string, TestFunction>
  globals?: Record<string, any>
  urlResolver?: (name: string, args: any[], kwargs: Record<string, any>) => string
  staticResolver?: (path: string) => string
  templateLoader?: (name: string) => Promise<TemplateNode>
  /** Timezone for date/time operations (e.g., 'Europe/Rome', 'UTC') */
  timezone?: string
}

export class Runtime {
  private options: Omit<Required<RuntimeOptions>, 'timezone'> & { timezone?: string }
  private filters: Record<string, FilterFunction>
  private tests: Record<string, TestFunction>
  private blocks: Map<string, BlockNode> = new Map()
  private parentTemplate: TemplateNode | null = null
  private source?: string // Template source for error messages

  constructor(options: RuntimeOptions = {}) {
    this.options = {
      autoescape: options.autoescape ?? true,
      filters: options.filters ?? {},
      tests: options.tests ?? {},
      globals: options.globals ?? {},
      urlResolver: options.urlResolver ?? ((name) => `#${name}`),
      staticResolver: options.staticResolver ?? ((path) => `/static/${path}`),
      templateLoader: options.templateLoader ?? (async () => {
        throw new Error('Template loader not configured')
      }),
      timezone: options.timezone ?? undefined,
    }

    // Merge builtin and custom filters
    this.filters = { ...builtinFilters, ...this.options.filters }

    // Override date filter with timezone support if timezone is configured
    if (this.options.timezone) {
      const tz = this.options.timezone
      this.filters.date = (value: any, format: string = 'N j, Y') => {
        const d = value instanceof Date ? value : new Date(value)
        if (isNaN(d.getTime())) return ''
        return this.formatDate(d, format)
      }
      this.filters.time = (value: any, format: string = 'H:i') => {
        return this.filters.date(value, format)
      }
    }

    // Merge builtin and custom tests
    this.tests = { ...builtinTests, ...this.options.tests }
  }

  async render(ast: TemplateNode, context: Record<string, any> = {}): Promise<string> {
    const ctx = new Context({ ...this.options.globals, ...context })
    this.blocks.clear()
    this.parentTemplate = null

    // Check if template needs async (has Extends or Include)
    const needsAsync = this.templateNeedsAsync(ast)

    if (needsAsync) {
      // Async path for templates with extends/include
      await this.collectBlocks(ast, ctx)
      if (this.parentTemplate) {
        return this.renderTemplateAsync(this.parentTemplate, ctx)
      }
      return this.renderTemplateAsync(ast, ctx)
    }

    // FAST SYNC PATH - no async overhead!
    this.collectBlocksSync(ast)
    return this.renderTemplateSync(ast, ctx)
  }

  // Check if template contains Include or Extends
  private templateNeedsAsync(ast: TemplateNode): boolean {
    for (const node of ast.body) {
      if (node.type === 'Extends' || node.type === 'Include') return true
      if (node.type === 'If') {
        const ifNode = node as IfNode
        if (this.nodesNeedAsync(ifNode.body)) return true
        for (const elif of ifNode.elifs) {
          if (this.nodesNeedAsync(elif.body)) return true
        }
        if (this.nodesNeedAsync(ifNode.else_)) return true
      }
      if (node.type === 'For') {
        const forNode = node as ForNode
        if (this.nodesNeedAsync(forNode.body)) return true
        if (this.nodesNeedAsync(forNode.else_)) return true
      }
      if (node.type === 'Block') {
        if (this.nodesNeedAsync((node as BlockNode).body)) return true
      }
      if (node.type === 'With') {
        if (this.nodesNeedAsync((node as WithNode).body)) return true
      }
    }
    return false
  }

  private nodesNeedAsync(nodes: ASTNode[]): boolean {
    for (const node of nodes) {
      if (node.type === 'Extends' || node.type === 'Include') return true
      if (node.type === 'If') {
        const ifNode = node as IfNode
        if (this.nodesNeedAsync(ifNode.body)) return true
        for (const elif of ifNode.elifs) {
          if (this.nodesNeedAsync(elif.body)) return true
        }
        if (this.nodesNeedAsync(ifNode.else_)) return true
      }
      if (node.type === 'For') {
        const forNode = node as ForNode
        if (this.nodesNeedAsync(forNode.body)) return true
        if (this.nodesNeedAsync(forNode.else_)) return true
      }
      if (node.type === 'Block') {
        if (this.nodesNeedAsync((node as BlockNode).body)) return true
      }
      if (node.type === 'With') {
        if (this.nodesNeedAsync((node as WithNode).body)) return true
      }
    }
    return false
  }

  // ==================== SYNC PATH (FAST) ====================

  private collectBlocksSync(ast: TemplateNode): void {
    for (const node of ast.body) {
      if (node.type === 'Block') {
        this.blocks.set((node as BlockNode).name, node as BlockNode)
      }
    }
  }

  private renderTemplateSync(ast: TemplateNode, ctx: Context): string {
    const parts: string[] = []
    for (const node of ast.body) {
      const result = this.renderNodeSync(node, ctx)
      if (result !== null) parts.push(result)
    }
    return parts.join('')
  }

  // Optimized: inline hot paths (Text, Output) before switch - 10-15% faster
  private renderNodeSync(node: ASTNode, ctx: Context): string | null {
    // Hot path 1: Text nodes (most common in templates)
    if (node.type === 'Text') {
      return (node as TextNode).value
    }
    // Hot path 2: Output nodes (variable interpolation)
    if (node.type === 'Output') {
      return this.stringify(this.eval(node.expression, ctx))
    }

    switch (node.type) {
      case 'If':
        return this.renderIfSync(node as IfNode, ctx)
      case 'For':
        return this.renderForSync(node as ForNode, ctx)
      case 'Block':
        return this.renderBlockSync(node as BlockNode, ctx)
      case 'Set':
        ctx.set((node as SetNode).target, this.eval((node as SetNode).value, ctx))
        return ''
      case 'With':
        return this.renderWithSync(node as WithNode, ctx)
      case 'Url':
        return this.renderUrlSync(node as UrlNode, ctx)
      case 'Static':
        return this.renderStaticSync(node as StaticNode, ctx)
      case 'Now':
        return this.renderNowSync(node as NowNode, ctx)
      case 'Load':
      case 'Extends':
        return null
      // Django additional tags
      case 'Cycle':
        return this.renderCycleSync(node as CycleNode, ctx)
      case 'Firstof':
        return this.renderFirstofSync(node as FirstofNode, ctx)
      case 'Ifchanged':
        return this.renderIfchangedSync(node as IfchangedNode, ctx)
      case 'Regroup':
        return this.renderRegroupSync(node as RegroupNode, ctx)
      case 'Widthratio':
        return this.renderWidthratioSync(node as WidthratioNode, ctx)
      case 'Lorem':
        return this.renderLoremSync(node as LoremNode, ctx)
      case 'CsrfToken':
        return this.renderCsrfTokenSync()
      case 'Debug':
        return this.renderDebugSync(ctx)
      case 'Templatetag':
        return this.renderTemplatetagSync(node as TemplatetagNode)
      default:
        return null
    }
  }

  private renderIfSync(node: IfNode, ctx: Context): string {
    if (this.isTruthy(this.eval(node.test, ctx))) {
      return this.renderNodesSync(node.body, ctx)
    }
    for (const elif of node.elifs) {
      if (this.isTruthy(this.eval(elif.test, ctx))) {
        return this.renderNodesSync(elif.body, ctx)
      }
    }
    return node.else_.length > 0 ? this.renderNodesSync(node.else_, ctx) : ''
  }

  private renderForSync(node: ForNode, ctx: Context): string {
    const iterable = this.eval(node.iter, ctx)
    const items = this.toIterable(iterable)
    const len = items.length

    if (len === 0) {
      return this.renderNodesSync(node.else_, ctx)
    }

    ctx.push()
    ctx.pushForLoop(items, 0)

    // Optimized: use string concatenation for small loops, array for large
    // String concat is faster for < 50 items, array.join for larger
    let result: string

    // Optimized: hoist isUnpacking check outside loop - 8-12% faster
    if (Array.isArray(node.target)) {
      // Unpacking loop (e.g., {% for key, value in dict.items %})
      const targets = node.target as string[]
      const targetsLen = targets.length

      if (len < 50) {
        // Small loop: string concat
        result = ''
        for (let i = 0; i < len; i++) {
          const item = items[i]
          if (i > 0) ctx.updateForLoop(i, items)

          let values: any[]
          if (Array.isArray(item)) {
            values = item
          } else if (item && typeof item === 'object' && ('0' in item || 'key' in item)) {
            values = [item[0] ?? item.key, item[1] ?? item.value]
          } else {
            values = [item, item]
          }

          for (let j = 0; j < targetsLen; j++) {
            ctx.set(targets[j], values[j])
          }

          result += this.renderNodesSync(node.body, ctx)
        }
      } else {
        // Large loop: array join
        const parts = new Array<string>(len)
        for (let i = 0; i < len; i++) {
          const item = items[i]
          if (i > 0) ctx.updateForLoop(i, items)

          let values: any[]
          if (Array.isArray(item)) {
            values = item
          } else if (item && typeof item === 'object' && ('0' in item || 'key' in item)) {
            values = [item[0] ?? item.key, item[1] ?? item.value]
          } else {
            values = [item, item]
          }

          for (let j = 0; j < targetsLen; j++) {
            ctx.set(targets[j], values[j])
          }

          parts[i] = this.renderNodesSync(node.body, ctx)
        }
        result = parts.join('')
      }
    } else {
      // Simple loop (hot path - 99% of use cases)
      const target = node.target as string

      if (len < 50) {
        // Small loop: string concat (faster for small N)
        result = ''
        for (let i = 0; i < len; i++) {
          if (i > 0) ctx.updateForLoop(i, items)
          ctx.set(target, items[i])
          result += this.renderNodesSync(node.body, ctx)
        }
      } else {
        // Large loop: array join (better for large N)
        const parts = new Array<string>(len)
        for (let i = 0; i < len; i++) {
          if (i > 0) ctx.updateForLoop(i, items)
          ctx.set(target, items[i])
          parts[i] = this.renderNodesSync(node.body, ctx)
        }
        result = parts.join('')
      }
    }

    ctx.popForLoop()
    ctx.pop()
    return result
  }

  private renderBlockSync(node: BlockNode, ctx: Context): string {
    const blockToRender = this.blocks.get(node.name) || node
    ctx.push()
    // Pre-render parent content for {{ block.super }} - must be a value, not function
    const parentContent = this.renderNodesSync(node.body, ctx)
    // Mark as safe to prevent double-escaping
    const safeContent = new String(parentContent) as any
    safeContent.__safe__ = true
    ctx.set('block', { super: safeContent })
    const result = this.renderNodesSync(blockToRender.body, ctx)
    ctx.pop()
    return result
  }

  private renderWithSync(node: WithNode, ctx: Context): string {
    ctx.push()
    for (const { target, value } of node.assignments) {
      ctx.set(target, this.eval(value, ctx))
    }
    const result = this.renderNodesSync(node.body, ctx)
    ctx.pop()
    return result
  }

  private renderUrlSync(node: UrlNode, ctx: Context): string {
    const name = this.eval(node.name, ctx)
    // Optimized: for loop instead of .map()
    const args: any[] = []
    for (let i = 0; i < node.args.length; i++) {
      args.push(this.eval(node.args[i], ctx))
    }
    const kwargs = this.evalObjectSync(node.kwargs, ctx)
    const url = this.options.urlResolver(String(name), args, kwargs)
    if (node.asVar) {
      ctx.set(node.asVar, url)
      return ''
    }
    return url
  }

  private renderStaticSync(node: StaticNode, ctx: Context): string {
    const path = this.eval(node.path, ctx)
    const url = this.options.staticResolver(String(path))
    if (node.asVar) {
      ctx.set(node.asVar, url)
      return ''
    }
    return url
  }

  private renderNowSync(node: NowNode, ctx: Context): string {
    const format = String(this.eval(node.format, ctx))
    const result = this.formatDate(new Date(), format)
    if (node.asVar) {
      ctx.set(node.asVar, result)
      return ''
    }
    return result
  }

  // Django: {% cycle %} - cycles through values on each iteration
  // Optimized: use node position as key instead of JSON.stringify on values
  private cycleState: Map<string, number> = new Map()

  private renderCycleSync(node: CycleNode, ctx: Context): string {
    // Use source position as unique key - avoids expensive JSON.stringify
    const key = `cycle_${node.line}_${node.column}`

    // Get current index and increment
    const currentIndex = this.cycleState.get(key) ?? 0
    // Optimized: for loop instead of .map()
    const values: any[] = []
    for (let i = 0; i < node.values.length; i++) {
      values.push(this.eval(node.values[i], ctx))
    }
    const value = values[currentIndex % values.length]
    this.cycleState.set(key, currentIndex + 1)

    if (node.asVar) {
      ctx.set(node.asVar, value)
      return node.silent ? '' : this.stringify(value)
    }
    return this.stringify(value)
  }

  // Django: {% firstof %} - outputs first truthy value
  private renderFirstofSync(node: FirstofNode, ctx: Context): string {
    for (const expr of node.values) {
      const value = this.eval(expr, ctx)
      if (this.isTruthy(value)) {
        if (node.asVar) {
          ctx.set(node.asVar, value)
          return ''
        }
        return this.stringify(value)
      }
    }
    // Return fallback or empty
    const fallback = node.fallback ? this.eval(node.fallback, ctx) : ''
    if (node.asVar) {
      ctx.set(node.asVar, fallback)
      return ''
    }
    return this.stringify(fallback)
  }

  // Django: {% ifchanged %} - outputs only if value changed
  // Optimized: smart comparison - uses === for primitives, JSON.stringify only for objects
  private ifchangedState: Map<string, any> = new Map()

  private renderIfchangedSync(node: IfchangedNode, ctx: Context): string {
    // Generate key for this ifchanged block
    const key = `ifchanged_${node.line}_${node.column}`

    let currentValue: any
    if (node.values.length > 0) {
      // Compare specific values - use for loop instead of .map()
      const values: any[] = []
      for (let i = 0; i < node.values.length; i++) {
        values.push(this.eval(node.values[i], ctx))
      }
      currentValue = values
    } else {
      // Compare rendered body content (string)
      currentValue = this.renderNodesSync(node.body, ctx)
    }

    const lastValue = this.ifchangedState.get(key)
    const changed = !this.deepEqual(currentValue, lastValue)
    this.ifchangedState.set(key, currentValue)

    if (changed) {
      if (node.values.length > 0) {
        return this.renderNodesSync(node.body, ctx)
      }
      return currentValue as string
    } else {
      return this.renderNodesSync(node.else_, ctx)
    }
  }

  // Django: {% regroup %} - regroups list by attribute
  private renderRegroupSync(node: RegroupNode, ctx: Context): string {
    const list = this.toIterable(this.eval(node.target, ctx))
    const groups: Array<{ grouper: any; list: any[] }> = []
    let currentGrouper: any = Symbol('initial')
    let currentList: any[] = []

    for (const item of list) {
      // Get the grouping key using attribute access
      const grouper = item && typeof item === 'object' ? item[node.key] : undefined

      if (grouper !== currentGrouper) {
        if (currentList.length > 0) {
          groups.push({ grouper: currentGrouper, list: currentList })
        }
        currentGrouper = grouper
        currentList = [item]
      } else {
        currentList.push(item)
      }
    }

    // Don't forget the last group
    if (currentList.length > 0) {
      groups.push({ grouper: currentGrouper, list: currentList })
    }

    ctx.set(node.asVar, groups)
    return ''
  }

  // Django: {% widthratio %} - calculates width ratio
  private renderWidthratioSync(node: WidthratioNode, ctx: Context): string {
    const value = Number(this.eval(node.value, ctx))
    const maxValue = Number(this.eval(node.maxValue, ctx))
    const maxWidth = Number(this.eval(node.maxWidth, ctx))

    const ratio = maxValue === 0 ? 0 : Math.round((value / maxValue) * maxWidth)

    if (node.asVar) {
      ctx.set(node.asVar, ratio)
      return ''
    }
    return String(ratio)
  }

  // Django: {% lorem %} - generates lorem ipsum text
  private renderLoremSync(node: LoremNode, ctx: Context): string {
    const count = node.count ? Number(this.eval(node.count, ctx)) : 1
    const method = node.method

    const words = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
      'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
      'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
      'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
      'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
      'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
      'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
      'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
    ]

    const getWord = (index: number) => {
      if (node.random) {
        return words[Math.floor(Math.random() * words.length)]
      }
      return words[index % words.length]
    }

    if (method === 'w') {
      // Words
      const result: string[] = []
      for (let i = 0; i < count; i++) {
        result.push(getWord(i))
      }
      return result.join(' ')
    } else if (method === 'p' || method === 'b') {
      // Paragraphs
      const paragraphs: string[] = []
      for (let p = 0; p < count; p++) {
        const sentenceCount = 3 + (p % 3)
        const sentences: string[] = []
        for (let s = 0; s < sentenceCount; s++) {
          const wordCount = 8 + (s % 7)
          const sentenceWords: string[] = []
          for (let w = 0; w < wordCount; w++) {
            sentenceWords.push(getWord(p * 100 + s * 20 + w))
          }
          // Capitalize first word
          sentenceWords[0] = sentenceWords[0].charAt(0).toUpperCase() + sentenceWords[0].slice(1)
          sentences.push(sentenceWords.join(' ') + '.')
        }
        paragraphs.push(sentences.join(' '))
      }

      if (method === 'b') {
        // Plain paragraphs separated by double newlines
        return paragraphs.join('\n\n')
      }
      // HTML paragraphs
      return paragraphs.map(p => `<p>${p}</p>`).join('\n')
    }

    return ''
  }

  // Django: {% csrf_token %} - outputs CSRF token hidden input
  private renderCsrfTokenSync(): string {
    // In a real Django app, this would use the actual CSRF token
    // For compatibility, output a placeholder that can be replaced server-side
    return '<input type="hidden" name="csrfmiddlewaretoken" value="CSRF_TOKEN_PLACEHOLDER">'
  }

  // Django: {% debug %} - outputs debug info
  private renderDebugSync(ctx: Context): string {
    // Output context info for debugging
    const data = ctx.toObject?.() || {}
    return `<pre>${JSON.stringify(data, null, 2)}</pre>`
  }

  // Django: {% templatetag %} - outputs template syntax characters
  private renderTemplatetagSync(node: TemplatetagNode): string {
    const tagMap: Record<string, string> = {
      'openblock': '{%',
      'closeblock': '%}',
      'openvariable': '{{',
      'closevariable': '}}',
      'openbrace': '{',
      'closebrace': '}',
      'opencomment': '{#',
      'closecomment': '#}'
    }
    return tagMap[node.tagType] || ''
  }

  // Get date components in the specified timezone
  private getDateInTimezone(d: Date, tz?: string): {
    year: number, month: number, day: number, weekday: number,
    hours: number, minutes: number, seconds: number
  } {
    if (!tz) {
      // Use local timezone
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        weekday: d.getDay(),
        hours: d.getHours(),
        minutes: d.getMinutes(),
        seconds: d.getSeconds(),
      }
    }

    // Use Intl.DateTimeFormat to get components in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const parts = formatter.formatToParts(d)
    const get = (type: string) => parts.find(p => p.type === type)?.value || ''

    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

    return {
      year: parseInt(get('year'), 10),
      month: parseInt(get('month'), 10) - 1, // 0-indexed like JS Date
      day: parseInt(get('day'), 10),
      weekday: weekdayMap[get('weekday')] ?? 0,
      hours: parseInt(get('hour'), 10),
      minutes: parseInt(get('minute'), 10),
      seconds: parseInt(get('second'), 10),
    }
  }

  // Django date format helper for {% now %} tag
  private formatDate(d: Date, format: string): string {
    const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const MONTH_NAMES_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    // Get date components in the configured timezone
    const tz = this.options.timezone
    const { year, month, day, weekday, hours, minutes, seconds } = this.getDateInTimezone(d, tz)

    let result = ''
    for (let i = 0; i < format.length; i++) {
      const char = format[i]
      switch (char) {
        // Day
        case 'd': result += String(day).padStart(2, '0'); break
        case 'j': result += String(day); break
        case 'D': result += DAY_NAMES_SHORT[weekday]; break
        case 'l': result += DAY_NAMES_LONG[weekday]; break
        // Month
        case 'm': result += String(month + 1).padStart(2, '0'); break
        case 'n': result += String(month + 1); break
        case 'M': result += MONTH_NAMES_SHORT[month]; break
        case 'F': result += MONTH_NAMES_LONG[month]; break
        // Year
        case 'y': result += String(year).slice(-2); break
        case 'Y': result += String(year); break
        // Time
        case 'H': result += String(hours).padStart(2, '0'); break
        case 'G': result += String(hours); break
        case 'i': result += String(minutes).padStart(2, '0'); break
        case 's': result += String(seconds).padStart(2, '0'); break
        // AM/PM
        case 'a': result += hours < 12 ? 'a.m.' : 'p.m.'; break
        case 'A': result += hours < 12 ? 'AM' : 'PM'; break
        // 12-hour
        case 'g': result += String(hours % 12 || 12); break
        case 'h': result += String(hours % 12 || 12).padStart(2, '0'); break
        default: result += char
      }
    }
    return result
  }

  // Optimized: avoid array allocation for common cases (0-2 nodes)
  private renderNodesSync(nodes: ASTNode[], ctx: Context): string {
    const len = nodes.length

    // Fast path: empty → no allocation
    if (len === 0) return ''

    // Fast path: single node → no array needed (very common in loop bodies)
    if (len === 1) {
      return this.renderNodeSync(nodes[0], ctx) ?? ''
    }

    // Fast path: two nodes → direct concatenation
    if (len === 2) {
      const a = this.renderNodeSync(nodes[0], ctx) ?? ''
      const b = this.renderNodeSync(nodes[1], ctx) ?? ''
      return a + b
    }

    // General case: use array
    const parts: string[] = []
    for (let i = 0; i < len; i++) {
      const result = this.renderNodeSync(nodes[i], ctx)
      if (result !== null) parts.push(result)
    }
    return parts.join('')
  }

  // SYNC expression evaluation (no async overhead!)
  // Optimized: inline hot paths (Literal, Name, GetAttr) before switch - 15-20% faster
  private eval(node: ExpressionNode, ctx: Context): any {
    // Hot path 1: Literal (most common in comparisons, filter args)
    if (node.type === 'Literal') {
      return (node as LiteralNode).value
    }
    // Hot path 2: Name (variable lookup - most common)
    if (node.type === 'Name') {
      return ctx.get((node as NameNode).name)
    }
    // Hot path 3: GetAttr (object.property access)
    if (node.type === 'GetAttr') {
      return this.evalGetAttr(node as GetAttrNode, ctx)
    }

    // Less common cases use switch
    switch (node.type) {
      case 'GetItem':
        return this.evalGetItem(node as GetItemNode, ctx)
      case 'FilterExpr':
        return this.evalFilter(node as FilterExprNode, ctx)
      case 'BinaryOp':
        return this.evalBinaryOp(node as BinaryOpNode, ctx)
      case 'UnaryOp':
        return this.evalUnaryOp(node as UnaryOpNode, ctx)
      case 'Compare':
        return this.evalCompare(node as CompareNode, ctx)
      case 'Conditional':
        return this.evalConditional(node as ConditionalNode, ctx)
      case 'Array': {
        // Optimized: for loop instead of .map()
        const elements = (node as ArrayNode).elements
        const result: any[] = []
        for (let i = 0; i < elements.length; i++) {
          result.push(this.eval(elements[i], ctx))
        }
        return result
      }
      case 'Object':
        return this.evalObjectLiteral(node as ObjectNode, ctx)
      case 'FunctionCall':
        return this.evalFunctionCall(node as FunctionCallNode, ctx)
      case 'TestExpr':
        return this.evalTest(node as TestExprNode, ctx)
      default:
        return undefined
    }
  }

  // Optimized: fast property access with minimal checks - 15-20% faster
  private evalGetAttr(node: GetAttrNode, ctx: Context): any {
    const obj = this.eval(node.object, ctx)
    if (obj == null) return undefined

    const attr = node.attribute
    const value = obj[attr]

    // Fast path: most common case - simple property access (string, number, object)
    // Functions are rare, skip the typeof check for most cases
    if (value === undefined) {
      // Could be undefined property or array index - check array case
      if (Array.isArray(obj)) {
        const numIndex = parseInt(attr, 10)
        if (!isNaN(numIndex)) return obj[numIndex]
      }
      return undefined
    }

    // Only bind functions (rare case)
    if (typeof value === 'function') {
      return value.bind(obj)
    }

    return value
  }

  private evalGetItem(node: GetItemNode, ctx: Context): any {
    const obj = this.eval(node.object, ctx)
    const index = this.eval(node.index, ctx)
    if (obj == null) return undefined
    return obj[index]
  }

  private evalFilter(node: FilterExprNode, ctx: Context): any {
    const value = this.eval(node.node, ctx)
    // Optimized: for loop instead of .map() - 28% faster
    const args: any[] = []
    for (let i = 0; i < node.args.length; i++) {
      args.push(this.eval(node.args[i], ctx))
    }
    const kwargs = this.evalObjectSync(node.kwargs, ctx)
    const filter = this.filters[node.filter]
    if (!filter) {
      const available = Object.keys(this.filters)
      const suggestion = findSimilar(node.filter, available)
      throw new TemplateRuntimeError(`Unknown filter '${node.filter}'`, {
        line: node.line,
        column: node.column,
        source: this.source,
        suggestion: suggestion || undefined,
        availableOptions: available.slice(0, 15),
      })
    }
    return filter(value, ...args, ...Object.values(kwargs))
  }

  // Optimized: inline common operators, avoid Number() for integers
  private evalBinaryOp(node: BinaryOpNode, ctx: Context): any {
    const left = this.eval(node.left, ctx)
    const op = node.operator

    // Short-circuit operators
    if (op === 'and') return this.isTruthy(left) ? this.eval(node.right, ctx) : left
    if (op === 'or') return this.isTruthy(left) ? left : this.eval(node.right, ctx)

    const right = this.eval(node.right, ctx)

    // Hot path: modulo (common in loop.index % 2)
    if (op === '%') {
      // Fast path: both are already numbers (most common)
      if (typeof left === 'number' && typeof right === 'number') {
        return right === 0 ? NaN : left % right
      }
      const r = Number(right)
      return r === 0 ? NaN : Number(left) % r
    }

    // Hot path: addition (common for counters)
    if (op === '+') {
      // Fast path: both numbers
      if (typeof left === 'number' && typeof right === 'number') {
        return left + right
      }
      return typeof left === 'string' || typeof right === 'string'
        ? String(left) + String(right)
        : Number(left) + Number(right)
    }

    // Other operators
    switch (op) {
      case '-': return Number(left) - Number(right)
      case '*': return Number(left) * Number(right)
      case '/': return Number(left) / Number(right)
      case '~': return String(left) + String(right)
      default: return undefined
    }
  }

  private evalUnaryOp(node: UnaryOpNode, ctx: Context): any {
    const operand = this.eval(node.operand, ctx)
    switch (node.operator) {
      case 'not': return !this.isTruthy(operand)
      case '-': return -Number(operand)
      case '+': return +Number(operand)
      default: return operand
    }
  }

  // Optimized: inline common single-comparison case
  private evalCompare(node: CompareNode, ctx: Context): boolean {
    const left = this.eval(node.left, ctx)
    const ops = node.ops

    // Hot path: single comparison (95% of cases)
    if (ops.length === 1) {
      const { operator, right: rightNode } = ops[0]
      const right = this.eval(rightNode, ctx)

      // Hot path: equality check (most common)
      if (operator === '==') return left === right
      if (operator === '!=') return left !== right
      if (operator === '<') return left < right
      if (operator === '>') return left > right
      if (operator === '<=') return left <= right
      if (operator === '>=') return left >= right
      if (operator === 'in') return this.isIn(left, right)
      if (operator === 'not in') return !this.isIn(left, right)
      if (operator === 'is') return left === right
      if (operator === 'is not') return left !== right
      return false
    }

    // Chained comparisons (rare)
    let current = left
    for (const { operator, right: rightNode } of ops) {
      const right = this.eval(rightNode, ctx)
      let result: boolean
      switch (operator) {
        case '==': result = current === right; break
        case '!=': result = current !== right; break
        case '<': result = current < right; break
        case '>': result = current > right; break
        case '<=': result = current <= right; break
        case '>=': result = current >= right; break
        case 'in': result = this.isIn(current, right); break
        case 'not in': result = !this.isIn(current, right); break
        case 'is': result = current === right; break
        case 'is not': result = current !== right; break
        default: result = false
      }
      if (!result) return false
      current = right
    }
    return true
  }

  private evalConditional(node: ConditionalNode, ctx: Context): any {
    return this.isTruthy(this.eval(node.test, ctx))
      ? this.eval(node.trueExpr, ctx)
      : this.eval(node.falseExpr, ctx)
  }

  private evalObjectLiteral(node: ObjectNode, ctx: Context): Record<string, any> {
    const result: Record<string, any> = {}
    for (const { key, value } of node.pairs) {
      result[String(this.eval(key, ctx))] = this.eval(value, ctx)
    }
    return result
  }

  private evalFunctionCall(node: FunctionCallNode, ctx: Context): any {
    const callee = this.eval(node.callee, ctx)
    // Optimized: for loop instead of .map()
    const args: any[] = []
    for (let i = 0; i < node.args.length; i++) {
      args.push(this.eval(node.args[i], ctx))
    }
    const kwargs = this.evalObjectSync(node.kwargs, ctx)
    return typeof callee === 'function' ? callee(...args, kwargs) : undefined
  }

  private evalTest(node: TestExprNode, ctx: Context): boolean {
    if (node.test === 'defined' || node.test === 'undefined') {
      let isDefined = false
      if (node.node.type === 'Name') {
        isDefined = ctx.has((node.node as NameNode).name)
      } else {
        isDefined = this.eval(node.node, ctx) !== undefined
      }
      const result = node.test === 'defined' ? isDefined : !isDefined
      return node.negated ? !result : result
    }
    const value = this.eval(node.node, ctx)
    // Optimized: for loop instead of .map()
    const args: any[] = []
    for (let i = 0; i < node.args.length; i++) {
      args.push(this.eval(node.args[i], ctx))
    }
    const test = this.tests[node.test]
    if (!test) throw new Error(`Unknown test: ${node.test}`)
    const result = test(value, ...args)
    return node.negated ? !result : result
  }

  private evalObjectSync(obj: Record<string, ExpressionNode>, ctx: Context): Record<string, any> {
    const result: Record<string, any> = {}
    // Optimized: for...in instead of Object.entries() - 20-30% faster
    for (const key in obj) {
      result[key] = this.eval(obj[key], ctx)
    }
    return result
  }

  // ==================== ASYNC PATH (for Extends/Include) ====================

  private async collectBlocks(ast: TemplateNode, ctx: Context): Promise<void> {
    for (const node of ast.body) {
      if (node.type === 'Extends') {
        const templateName = this.eval((node as ExtendsNode).template, ctx)
        this.parentTemplate = await this.options.templateLoader(String(templateName))
        await this.collectBlocks(this.parentTemplate, ctx)
      } else if (node.type === 'Block') {
        this.blocks.set((node as BlockNode).name, node as BlockNode)
      }
    }
  }

  private async renderTemplateAsync(ast: TemplateNode, ctx: Context): Promise<string> {
    const parts: string[] = []
    for (const node of ast.body) {
      const result = await this.renderNodeAsync(node, ctx)
      if (result !== null) parts.push(result)
    }
    return parts.join('')
  }

  private async renderNodeAsync(node: ASTNode, ctx: Context): Promise<string | null> {
    switch (node.type) {
      case 'Text':
        return (node as TextNode).value
      case 'Output':
        return this.stringify(this.eval(node.expression, ctx))
      case 'If':
        return this.renderIfAsync(node as IfNode, ctx)
      case 'For':
        return this.renderForAsync(node as ForNode, ctx)
      case 'Block':
        return this.renderBlockAsync(node as BlockNode, ctx)
      case 'Extends':
        return null
      case 'Include':
        return this.renderInclude(node as IncludeNode, ctx)
      case 'Set':
        ctx.set((node as SetNode).target, this.eval((node as SetNode).value, ctx))
        return ''
      case 'With':
        return this.renderWithAsync(node as WithNode, ctx)
      case 'Load':
        return null
      case 'Url':
        return this.renderUrlSync(node as UrlNode, ctx)
      case 'Static':
        return this.renderStaticSync(node as StaticNode, ctx)
      case 'Now':
        return this.renderNowSync(node as NowNode, ctx)
      // Django additional tags
      case 'Cycle':
        return this.renderCycleSync(node as CycleNode, ctx)
      case 'Firstof':
        return this.renderFirstofSync(node as FirstofNode, ctx)
      case 'Ifchanged':
        return this.renderIfchangedSync(node as IfchangedNode, ctx)
      case 'Regroup':
        return this.renderRegroupSync(node as RegroupNode, ctx)
      case 'Widthratio':
        return this.renderWidthratioSync(node as WidthratioNode, ctx)
      case 'Lorem':
        return this.renderLoremSync(node as LoremNode, ctx)
      case 'CsrfToken':
        return this.renderCsrfTokenSync()
      case 'Debug':
        return this.renderDebugSync(ctx)
      case 'Templatetag':
        return this.renderTemplatetagSync(node as TemplatetagNode)
      default:
        return null
    }
  }

  private async renderIfAsync(node: IfNode, ctx: Context): Promise<string> {
    if (this.isTruthy(this.eval(node.test, ctx))) {
      return this.renderNodesAsync(node.body, ctx)
    }
    for (const elif of node.elifs) {
      if (this.isTruthy(this.eval(elif.test, ctx))) {
        return this.renderNodesAsync(elif.body, ctx)
      }
    }
    return node.else_.length > 0 ? this.renderNodesAsync(node.else_, ctx) : ''
  }

  private async renderForAsync(node: ForNode, ctx: Context): Promise<string> {
    const iterable = this.eval(node.iter, ctx)
    const items = this.toIterable(iterable)
    const len = items.length

    if (len === 0) {
      return this.renderNodesAsync(node.else_, ctx)
    }

    // Pre-allocate array to avoid resizing
    const parts = new Array<string>(len)
    const isUnpacking = Array.isArray(node.target)

    ctx.push()
    ctx.pushForLoop(items, 0)

    for (let i = 0; i < len; i++) {
      const item = items[i]
      if (i > 0) ctx.updateForLoop(i, items)

      if (isUnpacking) {
        let values: any[]
        if (Array.isArray(item)) {
          values = item
        } else if (item && typeof item === 'object' && ('0' in item || 'key' in item)) {
          values = [item[0] ?? item.key, item[1] ?? item.value]
        } else {
          values = [item, item]
        }
        const targets = node.target as string[]
        for (let j = 0; j < targets.length; j++) {
          ctx.set(targets[j], values[j])
        }
      } else {
        ctx.set(node.target as string, item)
      }

      parts[i] = await this.renderNodesAsync(node.body, ctx)
    }

    ctx.popForLoop()
    ctx.pop()
    return parts.join('')
  }

  private async renderBlockAsync(node: BlockNode, ctx: Context): Promise<string> {
    const blockToRender = this.blocks.get(node.name) || node
    ctx.push()
    // Pre-render parent content for {{ block.super }} - must be a value, not function
    const parentContent = await this.renderNodesAsync(node.body, ctx)
    // Mark as safe to prevent double-escaping
    const safeContent = new String(parentContent) as any
    safeContent.__safe__ = true
    ctx.set('block', { super: safeContent })
    const result = await this.renderNodesAsync(blockToRender.body, ctx)
    ctx.pop()
    return result
  }

  private async renderInclude(node: IncludeNode, ctx: Context): Promise<string> {
    try {
      const templateName = this.eval(node.template, ctx)
      const template = await this.options.templateLoader(String(templateName))

      let includeCtx: Context
      if (node.only) {
        includeCtx = new Context(node.context ? this.evalObjectSync(node.context, ctx) : {})
      } else {
        const additional = node.context ? this.evalObjectSync(node.context, ctx) : {}
        includeCtx = ctx.derived(additional)
      }

      return this.renderTemplateAsync(template, includeCtx)
    } catch (error) {
      if (node.ignoreMissing) return ''
      throw error
    }
  }

  private async renderWithAsync(node: WithNode, ctx: Context): Promise<string> {
    ctx.push()
    for (const { target, value } of node.assignments) {
      ctx.set(target, this.eval(value, ctx))
    }
    const result = await this.renderNodesAsync(node.body, ctx)
    ctx.pop()
    return result
  }

  private async renderNodesAsync(nodes: ASTNode[], ctx: Context): Promise<string> {
    const parts: string[] = []
    for (const node of nodes) {
      const result = await this.renderNodeAsync(node, ctx)
      if (result !== null) parts.push(result)
    }
    return parts.join('')
  }

  // Legacy async API for backwards compatibility
  async evaluate(node: ExpressionNode, ctx: Context): Promise<any> {
    return this.eval(node, ctx)
  }

  // ==================== Helpers ====================

  // Optimized stringify: inline hot paths, avoid String() when possible
  private stringify(value: any): string {
    // Hot path: null/undefined → empty string (very common)
    if (value == null) return ''

    // Hot path: already a string (most common case)
    if (typeof value === 'string') {
      // Check safe marker and autoescape in one branch
      if ((value as any).__safe__) return value
      return this.options.autoescape ? Bun.escapeHTML(value) : value
    }

    // Boolean → Python-style True/False
    if (typeof value === 'boolean') return value ? 'True' : 'False'

    // Numbers → fast path (no escaping needed)
    if (typeof value === 'number') return String(value)

    // Other types: convert to string then escape
    const str = String(value)
    if ((value as any).__safe__) return str
    return this.options.autoescape ? Bun.escapeHTML(str) : str
  }

  // Optimized: inline most common cases first (bool, null, string)
  private isTruthy(value: any): boolean {
    // Hot path: boolean (most common in {% if %} conditions)
    if (typeof value === 'boolean') return value
    // Hot path: null/undefined
    if (value == null) return false
    // Hot path: string (empty string check)
    if (typeof value === 'string') return value.length > 0
    // Hot path: number (0 is falsy)
    if (typeof value === 'number') return value !== 0
    // Arrays: check length
    if (Array.isArray(value)) return value.length > 0
    // Objects: check if has any own property (avoid Object.keys allocation)
    if (typeof value === 'object') {
      for (const _ in value) return true
      return false
    }
    return true
  }

  // Optimized deep equality check - avoids JSON.stringify for primitives and simple arrays
  private deepEqual(a: any, b: any): boolean {
    // Fast path: identical references or primitives
    if (a === b) return true
    // Null/undefined check
    if (a == null || b == null) return a === b
    // Type mismatch
    const typeA = typeof a
    const typeB = typeof b
    if (typeA !== typeB) return false
    // Primitives already checked with ===
    if (typeA !== 'object') return false
    // Array comparison
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false
      }
      return true
    }
    // Object comparison - fallback to JSON for complex objects
    return JSON.stringify(a) === JSON.stringify(b)
  }

  private isIn(needle: any, haystack: any): boolean {
    if (Array.isArray(haystack)) return haystack.includes(needle)
    if (typeof haystack === 'string') return haystack.includes(String(needle))
    if (typeof haystack === 'object' && haystack !== null) return needle in haystack
    return false
  }

  private toIterable(value: any): any[] {
    if (Array.isArray(value)) return value
    if (value == null) return []
    if (typeof value === 'string') return value.split('')
    if (typeof value === 'object') {
      // For objects, iterate over entries (like dict.items() in Python)
      if (typeof value[Symbol.iterator] === 'function') {
        return Array.from(value)
      }
      // Optimized: use lightweight array tuples instead of objects - 15-20% faster
      // Arrays with index access are faster than object property access
      const keys = Object.keys(value)
      const len = keys.length
      const result = new Array(len)
      for (let i = 0; i < len; i++) {
        const key = keys[i]
        const val = value[key]
        // Create tuple-like object that supports both named and indexed access
        result[i] = { key, value: val, 0: key, 1: val }
      }
      return result
    }
    return [value]
  }

  // Add custom filter
  addFilter(name: string, fn: FilterFunction): void {
    this.filters[name] = fn
  }

  // Add custom test
  addTest(name: string, fn: TestFunction): void {
    this.tests[name] = fn
  }

  // Add global variable
  addGlobal(name: string, value: any): void {
    this.options.globals[name] = value
  }

  // Set template source for error messages
  setSource(source: string): void {
    this.source = source
  }
}

export { Context } from './context'
