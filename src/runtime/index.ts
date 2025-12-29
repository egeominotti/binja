/**
 * Jinja2/DTL Runtime - Executes AST and produces output
 * Compatible with both Jinja2 and Django Template Language
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
}

export class Runtime {
  private options: Required<RuntimeOptions>
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
    }

    // Merge builtin and custom filters
    this.filters = { ...builtinFilters, ...this.options.filters }

    // Merge builtin and custom tests
    this.tests = { ...builtinTests, ...this.options.tests }
  }

  async render(ast: TemplateNode, context: Record<string, any> = {}): Promise<string> {
    const ctx = new Context({ ...this.options.globals, ...context })
    this.blocks.clear()
    this.parentTemplate = null

    // First pass: collect blocks and check for extends
    await this.collectBlocks(ast, ctx)

    // If there's a parent template, render that instead
    if (this.parentTemplate) {
      return this.renderTemplate(this.parentTemplate, ctx)
    }

    return this.renderTemplate(ast, ctx)
  }

  private async collectBlocks(ast: TemplateNode, ctx: Context): Promise<void> {
    for (const node of ast.body) {
      if (node.type === 'Extends') {
        const templateName = await this.evaluate(node.template, ctx)
        this.parentTemplate = await this.options.templateLoader(String(templateName))
        await this.collectBlocks(this.parentTemplate, ctx)
      } else if (node.type === 'Block') {
        // Child blocks override parent blocks
        this.blocks.set(node.name, node)
      }
    }
  }

  private async renderTemplate(ast: TemplateNode, ctx: Context): Promise<string> {
    const parts: string[] = []

    for (const node of ast.body) {
      const result = await this.renderNode(node, ctx)
      if (result !== null) parts.push(result)
    }

    return parts.join('')
  }

  private async renderNode(node: ASTNode, ctx: Context): Promise<string | null> {
    switch (node.type) {
      case 'Text':
        return (node as TextNode).value

      case 'Output':
        return this.renderOutput(node as OutputNode, ctx)

      case 'If':
        return this.renderIf(node as IfNode, ctx)

      case 'For':
        return this.renderFor(node as ForNode, ctx)

      case 'Block':
        return this.renderBlock(node as BlockNode, ctx)

      case 'Extends':
        // Already handled in collectBlocks
        return null

      case 'Include':
        return this.renderInclude(node as IncludeNode, ctx)

      case 'Set':
        return this.renderSet(node as SetNode, ctx)

      case 'With':
        return this.renderWith(node as WithNode, ctx)

      case 'Load':
        // Load is handled at compile time, no runtime action needed
        return null

      case 'Url':
        return this.renderUrl(node as UrlNode, ctx)

      case 'Static':
        return this.renderStatic(node as StaticNode, ctx)

      default:
        return null
    }
  }

  private async renderOutput(node: OutputNode, ctx: Context): Promise<string> {
    const value = await this.evaluate(node.expression, ctx)
    return this.stringify(value)
  }

  private async renderIf(node: IfNode, ctx: Context): Promise<string> {
    // Test main condition
    if (this.isTruthy(await this.evaluate(node.test, ctx))) {
      return this.renderNodes(node.body, ctx)
    }

    // Test elif conditions
    for (const elif of node.elifs) {
      if (this.isTruthy(await this.evaluate(elif.test, ctx))) {
        return this.renderNodes(elif.body, ctx)
      }
    }

    // Render else block
    if (node.else_.length > 0) {
      return this.renderNodes(node.else_, ctx)
    }

    return ''
  }

  private async renderFor(node: ForNode, ctx: Context): Promise<string> {
    const iterable = await this.evaluate(node.iter, ctx)
    const items = this.toIterable(iterable)

    if (items.length === 0) {
      // Render empty/else block
      return this.renderNodes(node.else_, ctx)
    }

    const parts: string[] = []
    ctx.push()

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // Set loop variable(s)
      if (Array.isArray(node.target)) {
        // Unpacking: {% for key, value in dict.items %}
        // item could be: [k, v] array, or {key, value, 0, 1} object from toIterable
        let values: any[]
        if (Array.isArray(item)) {
          values = item
        } else if (item && typeof item === 'object' && ('0' in item || 'key' in item)) {
          // Object from toIterable with indexed or named properties
          values = [item[0] ?? item.key, item[1] ?? item.value]
        } else {
          values = [item, item]
        }
        node.target.forEach((name, idx) => {
          ctx.set(name, values[idx])
        })
      } else {
        ctx.set(node.target, item)
      }

      // Set forloop/loop variable
      ctx.pushForLoop(items, i)

      // Render body
      const result = await this.renderNodes(node.body, ctx)
      parts.push(result)

      ctx.popForLoop()
    }

    ctx.pop()
    return parts.join('')
  }

  private async renderBlock(node: BlockNode, ctx: Context): Promise<string> {
    // Use overridden block if available
    const blockToRender = this.blocks.get(node.name) || node

    ctx.push()
    // Provide block.super functionality
    ctx.set('block', {
      super: async () => {
        // Render parent block content
        return this.renderNodes(node.body, ctx)
      },
    })

    const result = await this.renderNodes(blockToRender.body, ctx)
    ctx.pop()

    return result
  }

  private async renderInclude(node: IncludeNode, ctx: Context): Promise<string> {
    try {
      const templateName = await this.evaluate(node.template, ctx)
      const template = await this.options.templateLoader(String(templateName))

      // Create include context
      let includeCtx: Context
      if (node.only) {
        // Only pass explicitly provided context
        includeCtx = new Context(node.context ? await this.evaluateObject(node.context, ctx) : {})
      } else {
        // Pass current context plus any additional
        const additional = node.context ? await this.evaluateObject(node.context, ctx) : {}
        includeCtx = ctx.derived(additional)
      }

      return this.renderTemplate(template, includeCtx)
    } catch (error) {
      if (node.ignoreMissing) return ''
      throw error
    }
  }

  private async renderSet(node: SetNode, ctx: Context): Promise<string> {
    const value = await this.evaluate(node.value, ctx)
    ctx.set(node.target, value)
    return ''
  }

  private async renderWith(node: WithNode, ctx: Context): Promise<string> {
    ctx.push()

    for (const { target, value } of node.assignments) {
      ctx.set(target, await this.evaluate(value, ctx))
    }

    const result = await this.renderNodes(node.body, ctx)
    ctx.pop()

    return result
  }

  private async renderUrl(node: UrlNode, ctx: Context): Promise<string> {
    const name = await this.evaluate(node.name, ctx)
    const args = await Promise.all(node.args.map((arg) => this.evaluate(arg, ctx)))
    const kwargs = await this.evaluateObject(node.kwargs, ctx)

    const url = this.options.urlResolver(String(name), args, kwargs)

    if (node.asVar) {
      ctx.set(node.asVar, url)
      return ''
    }

    return url
  }

  private async renderStatic(node: StaticNode, ctx: Context): Promise<string> {
    const path = await this.evaluate(node.path, ctx)
    const url = this.options.staticResolver(String(path))

    if (node.asVar) {
      ctx.set(node.asVar, url)
      return ''
    }

    return url
  }

  private async renderNodes(nodes: ASTNode[], ctx: Context): Promise<string> {
    const parts: string[] = []
    for (const node of nodes) {
      const result = await this.renderNode(node, ctx)
      if (result !== null) parts.push(result)
    }
    return parts.join('')
  }

  // ==================== Expression Evaluation ====================

  async evaluate(node: ExpressionNode, ctx: Context): Promise<any> {
    switch (node.type) {
      case 'Literal':
        return (node as LiteralNode).value

      case 'Name':
        return ctx.get((node as NameNode).name)

      case 'GetAttr':
        return this.evaluateGetAttr(node as GetAttrNode, ctx)

      case 'GetItem':
        return this.evaluateGetItem(node as GetItemNode, ctx)

      case 'FilterExpr':
        return this.evaluateFilter(node as FilterExprNode, ctx)

      case 'BinaryOp':
        return this.evaluateBinaryOp(node as BinaryOpNode, ctx)

      case 'UnaryOp':
        return this.evaluateUnaryOp(node as UnaryOpNode, ctx)

      case 'Compare':
        return this.evaluateCompare(node as CompareNode, ctx)

      case 'Conditional':
        return this.evaluateConditional(node as ConditionalNode, ctx)

      case 'Array':
        return Promise.all((node as ArrayNode).elements.map((el) => this.evaluate(el, ctx)))

      case 'Object':
        return this.evaluateObjectLiteral(node as ObjectNode, ctx)

      case 'FunctionCall':
        return this.evaluateFunctionCall(node as FunctionCallNode, ctx)

      case 'TestExpr':
        return this.evaluateTest(node as TestExprNode, ctx)

      default:
        return undefined
    }
  }

  private async evaluateTest(node: TestExprNode, ctx: Context): Promise<boolean> {
    // Special handling for 'defined' and 'undefined' tests
    // These need to check if the variable exists in context, not just its value
    if (node.test === 'defined' || node.test === 'undefined') {
      let isDefined = false
      if (node.node.type === 'Name') {
        // Check if variable exists in context
        isDefined = ctx.has((node.node as NameNode).name)
      } else {
        // For expressions, evaluate and check if not undefined
        const value = await this.evaluate(node.node, ctx)
        isDefined = value !== undefined
      }

      const result = node.test === 'defined' ? isDefined : !isDefined
      return node.negated ? !result : result
    }

    const value = await this.evaluate(node.node, ctx)
    const args = await Promise.all(node.args.map((arg) => this.evaluate(arg, ctx)))

    const test = this.tests[node.test]
    if (!test) {
      throw new Error(`Unknown test: ${node.test}`)
    }

    const result = test(value, ...args)
    return node.negated ? !result : result
  }

  private async evaluateGetAttr(node: GetAttrNode, ctx: Context): Promise<any> {
    const obj = await this.evaluate(node.object, ctx)
    if (obj == null) return undefined

    // Handle numeric index for arrays (DTL style: items.0)
    const numIndex = parseInt(node.attribute, 10)
    if (!isNaN(numIndex) && Array.isArray(obj)) {
      return obj[numIndex]
    }

    // Try attribute access
    if (typeof obj === 'object' && node.attribute in obj) {
      const value = obj[node.attribute]
      // If it's a method, call it (Django model methods)
      if (typeof value === 'function') {
        return value.call(obj)
      }
      return value
    }

    // Try method access (for things like .items(), .values(), etc.)
    if (typeof obj[node.attribute] === 'function') {
      return obj[node.attribute].bind(obj)
    }

    return undefined
  }

  private async evaluateGetItem(node: GetItemNode, ctx: Context): Promise<any> {
    const obj = await this.evaluate(node.object, ctx)
    const index = await this.evaluate(node.index, ctx)

    if (obj == null) return undefined
    return obj[index]
  }

  private async evaluateFilter(node: FilterExprNode, ctx: Context): Promise<any> {
    const value = await this.evaluate(node.node, ctx)
    const args = await Promise.all(node.args.map((arg) => this.evaluate(arg, ctx)))
    const kwargs = await this.evaluateObject(node.kwargs, ctx)

    const filter = this.filters[node.filter]
    if (!filter) {
      throw new Error(`Unknown filter: ${node.filter}`)
    }

    // Merge args and kwargs for filter call
    return filter(value, ...args, ...Object.values(kwargs))
  }

  private async evaluateBinaryOp(node: BinaryOpNode, ctx: Context): Promise<any> {
    const left = await this.evaluate(node.left, ctx)

    // Short-circuit evaluation for and/or
    if (node.operator === 'and') {
      return this.isTruthy(left) ? await this.evaluate(node.right, ctx) : left
    }
    if (node.operator === 'or') {
      return this.isTruthy(left) ? left : await this.evaluate(node.right, ctx)
    }

    const right = await this.evaluate(node.right, ctx)

    switch (node.operator) {
      case '+':
        return typeof left === 'string' || typeof right === 'string'
          ? String(left) + String(right)
          : Number(left) + Number(right)
      case '-':
        return Number(left) - Number(right)
      case '*':
        return Number(left) * Number(right)
      case '/':
        const divisor = Number(right)
        if (divisor === 0) return 0
        return Number(left) / divisor
      case '%':
        return Number(left) % Number(right)
      case '~':
        return String(left) + String(right) // String concatenation
      default:
        return undefined
    }
  }

  private async evaluateUnaryOp(node: UnaryOpNode, ctx: Context): Promise<any> {
    const operand = await this.evaluate(node.operand, ctx)

    switch (node.operator) {
      case 'not':
        return !this.isTruthy(operand)
      case '-':
        return -Number(operand)
      case '+':
        return +Number(operand)
      default:
        return operand
    }
  }

  private async evaluateCompare(node: CompareNode, ctx: Context): Promise<boolean> {
    let left = await this.evaluate(node.left, ctx)

    for (const { operator, right: rightNode } of node.ops) {
      const right = await this.evaluate(rightNode, ctx)
      let result: boolean

      switch (operator) {
        case '==':
          result = left === right
          break
        case '!=':
          result = left !== right
          break
        case '<':
          result = left < right
          break
        case '>':
          result = left > right
          break
        case '<=':
          result = left <= right
          break
        case '>=':
          result = left >= right
          break
        case 'in':
          result = this.isIn(left, right)
          break
        case 'not in':
          result = !this.isIn(left, right)
          break
        case 'is':
          result = left === right
          break
        case 'is not':
          result = left !== right
          break
        default:
          result = false
      }

      if (!result) return false
      left = right
    }

    return true
  }

  private async evaluateConditional(node: ConditionalNode, ctx: Context): Promise<any> {
    const test = await this.evaluate(node.test, ctx)
    return this.isTruthy(test)
      ? await this.evaluate(node.trueExpr, ctx)
      : await this.evaluate(node.falseExpr, ctx)
  }

  private async evaluateObjectLiteral(node: ObjectNode, ctx: Context): Promise<Record<string, any>> {
    const result: Record<string, any> = {}
    for (const { key, value } of node.pairs) {
      const k = await this.evaluate(key, ctx)
      result[String(k)] = await this.evaluate(value, ctx)
    }
    return result
  }

  private async evaluateFunctionCall(node: FunctionCallNode, ctx: Context): Promise<any> {
    const callee = await this.evaluate(node.callee, ctx)
    const args = await Promise.all(node.args.map((arg) => this.evaluate(arg, ctx)))
    const kwargs = await this.evaluateObject(node.kwargs, ctx)

    if (typeof callee === 'function') {
      return callee(...args, kwargs)
    }

    return undefined
  }

  private async evaluateObject(
    obj: Record<string, ExpressionNode>,
    ctx: Context
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = await this.evaluate(value, ctx)
    }
    return result
  }

  // ==================== Helpers ====================

  private stringify(value: any): string {
    if (value == null) return ''
    if (typeof value === 'boolean') return value ? 'True' : 'False'

    const str = String(value)

    // Check if already marked safe
    if ((value as any).__safe__) return str

    // Auto-escape if enabled
    if (this.options.autoescape) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
    }

    return str
  }

  private isTruthy(value: any): boolean {
    if (value == null) return false
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') return value.length > 0
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
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
