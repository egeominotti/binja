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

  private renderNodeSync(node: ASTNode, ctx: Context): string | null {
    switch (node.type) {
      case 'Text':
        return (node as TextNode).value
      case 'Output':
        return this.stringify(this.eval(node.expression, ctx))
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

      parts[i] = this.renderNodesSync(node.body, ctx)
    }

    ctx.popForLoop()
    ctx.pop()
    return parts.join('')
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
    const args = node.args.map((arg) => this.eval(arg, ctx))
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

  private renderNodesSync(nodes: ASTNode[], ctx: Context): string {
    const parts: string[] = []
    for (const node of nodes) {
      const result = this.renderNodeSync(node, ctx)
      if (result !== null) parts.push(result)
    }
    return parts.join('')
  }

  // SYNC expression evaluation (no async overhead!)
  private eval(node: ExpressionNode, ctx: Context): any {
    switch (node.type) {
      case 'Literal':
        return (node as LiteralNode).value
      case 'Name':
        return ctx.get((node as NameNode).name)
      case 'GetAttr':
        return this.evalGetAttr(node as GetAttrNode, ctx)
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
      case 'Array':
        return (node as ArrayNode).elements.map((el) => this.eval(el, ctx))
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

  private evalGetAttr(node: GetAttrNode, ctx: Context): any {
    const obj = this.eval(node.object, ctx)
    if (obj == null) return undefined
    const numIndex = parseInt(node.attribute, 10)
    if (!isNaN(numIndex) && Array.isArray(obj)) return obj[numIndex]
    if (typeof obj === 'object' && node.attribute in obj) {
      const value = obj[node.attribute]
      return typeof value === 'function' ? value.call(obj) : value
    }
    if (typeof obj[node.attribute] === 'function') {
      return obj[node.attribute].bind(obj)
    }
    return undefined
  }

  private evalGetItem(node: GetItemNode, ctx: Context): any {
    const obj = this.eval(node.object, ctx)
    const index = this.eval(node.index, ctx)
    if (obj == null) return undefined
    return obj[index]
  }

  private evalFilter(node: FilterExprNode, ctx: Context): any {
    const value = this.eval(node.node, ctx)
    const args = node.args.map((arg) => this.eval(arg, ctx))
    const kwargs = this.evalObjectSync(node.kwargs, ctx)
    const filter = this.filters[node.filter]
    if (!filter) throw new Error(`Unknown filter: ${node.filter}`)
    return filter(value, ...args, ...Object.values(kwargs))
  }

  private evalBinaryOp(node: BinaryOpNode, ctx: Context): any {
    const left = this.eval(node.left, ctx)
    if (node.operator === 'and') return this.isTruthy(left) ? this.eval(node.right, ctx) : left
    if (node.operator === 'or') return this.isTruthy(left) ? left : this.eval(node.right, ctx)
    const right = this.eval(node.right, ctx)
    switch (node.operator) {
      case '+':
        return typeof left === 'string' || typeof right === 'string'
          ? String(left) + String(right)
          : Number(left) + Number(right)
      case '-': return Number(left) - Number(right)
      case '*': return Number(left) * Number(right)
      case '/': return Number(left) / Number(right) // Returns Infinity/-Infinity/NaN for division by zero
      case '%': return Number(right) === 0 ? NaN : Number(left) % Number(right)
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

  private evalCompare(node: CompareNode, ctx: Context): boolean {
    let left = this.eval(node.left, ctx)
    for (const { operator, right: rightNode } of node.ops) {
      const right = this.eval(rightNode, ctx)
      let result: boolean
      switch (operator) {
        case '==': result = left === right; break
        case '!=': result = left !== right; break
        case '<': result = left < right; break
        case '>': result = left > right; break
        case '<=': result = left <= right; break
        case '>=': result = left >= right; break
        case 'in': result = this.isIn(left, right); break
        case 'not in': result = !this.isIn(left, right); break
        case 'is': result = left === right; break
        case 'is not': result = left !== right; break
        default: result = false
      }
      if (!result) return false
      left = right
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
    const args = node.args.map((arg) => this.eval(arg, ctx))
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
    const args = node.args.map((arg) => this.eval(arg, ctx))
    const test = this.tests[node.test]
    if (!test) throw new Error(`Unknown test: ${node.test}`)
    const result = test(value, ...args)
    return node.negated ? !result : result
  }

  private evalObjectSync(obj: Record<string, ExpressionNode>, ctx: Context): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.eval(value, ctx)
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

  private stringify(value: any): string {
    if (value == null) return ''
    if (typeof value === 'boolean') return value ? 'True' : 'False'

    const str = String(value)

    // Check if already marked safe
    if ((value as any).__safe__) return str

    // Auto-escape if enabled - use Bun's native escapeHTML for maximum performance
    if (this.options.autoescape) {
      return Bun.escapeHTML(str)
    }

    return str
  }

  private isTruthy(value: any): boolean {
    if (value == null) return false
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') return value.length > 0
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') {
      // Avoid Object.keys() allocation - return early on first key
      for (const _ in value) return true
      return false
    }
    return true
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
      return Object.entries(value).map(([k, v]) => ({ key: k, value: v, 0: k, 1: v }))
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
}

export { Context } from './context'
