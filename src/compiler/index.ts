/**
 * AOT Compiler for binja templates
 * Generates optimized JavaScript functions from AST
 */

import type {
  ASTNode,
  TemplateNode,
  TextNode,
  OutputNode,
  IfNode,
  ForNode,
  SetNode,
  WithNode,
  ExpressionNode,
  NameNode,
  LiteralNode,
  ArrayNode,
  ObjectNode,
  BinaryOpNode,
  UnaryOpNode,
  CompareNode,
  GetAttrNode,
  GetItemNode,
  FilterExprNode,
  TestExprNode,
  ConditionalNode,
  CommentNode,
} from '../parser/nodes'
import { builtinFilters } from '../filters'
import { builtinTests } from '../tests'

export interface CompileOptions {
  /** Function name (default: 'render') */
  functionName?: string
  /** Include runtime helpers inline (default: true) */
  inlineHelpers?: boolean
  /** Minify output (default: false) */
  minify?: boolean
  /** Auto-escape HTML (default: true) */
  autoescape?: boolean
}

/**
 * Compile AST to JavaScript code string
 */
export function compileToString(ast: TemplateNode, options: CompileOptions = {}): string {
  const compiler = new Compiler(options)
  return compiler.compile(ast)
}

/**
 * Compile AST to executable function
 */
export function compileToFunction(
  ast: TemplateNode,
  options: CompileOptions = {}
): (ctx: Record<string, any>) => string {
  const code = compileToString(ast, options)
  // Create function with runtime helpers in scope
  const fn = new Function(
    '__ctx',
    '__helpers',
    `
    const { escape, isTruthy, toArray, applyFilter, applyTest } = __helpers;
    ${code}
    return render(__ctx);
  `
  )

  return (ctx: Record<string, any>) => fn(ctx, runtimeHelpers)
}

// Runtime helpers available to compiled functions
const runtimeHelpers = {
  escape: (value: any): string => {
    if (value == null) return ''
    // Support both object format { __safe: true, value: "..." } and String.__safe__ format
    if (typeof value === 'object' && value.__safe) return String(value.value ?? '')
    if ((value as any)?.__safe__) return String(value)
    return Bun.escapeHTML(String(value))
  },

  isTruthy: (value: any): boolean => {
    if (value == null) return false
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') return value.length > 0
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') {
      for (const _ in value) return true
      return false
    }
    return true
  },

  toArray: (value: any): any[] => {
    if (value == null) return []
    if (Array.isArray(value)) return value
    if (typeof value === 'string') return value.split('')
    if (typeof value === 'object') {
      if (typeof value[Symbol.iterator] === 'function') return [...value]
      return Object.entries(value)
    }
    return []
  },

  applyFilter: (name: string, value: any, ...args: any[]): any => {
    const filter = builtinFilters[name]
    if (!filter) throw new Error(`Unknown filter: ${name}`)
    return filter(value, ...args)
  },

  applyTest: (name: string, value: any, ...args: any[]): boolean => {
    const test = builtinTests[name]
    if (!test) throw new Error(`Unknown test: ${name}`)
    return test(value, ...args)
  },
}

class Compiler {
  private options: Required<CompileOptions>
  private indent = 0
  private varCounter = 0
  private loopStack: string[] = [] // Track nested loop variable names for parentloop
  private localVars: Set<string>[] = [] // Stack of local variable scopes

  constructor(options: CompileOptions = {}) {
    this.options = {
      functionName: options.functionName ?? 'render',
      inlineHelpers: options.inlineHelpers ?? true,
      minify: options.minify ?? false,
      autoescape: options.autoescape ?? true,
    }
  }

  private pushScope(): void {
    this.localVars.push(new Set())
  }

  private popScope(): void {
    this.localVars.pop()
  }

  private addLocalVar(name: string): void {
    if (this.localVars.length > 0) {
      this.localVars[this.localVars.length - 1].add(name)
    }
  }

  private isLocalVar(name: string): boolean {
    for (let i = this.localVars.length - 1; i >= 0; i--) {
      if (this.localVars[i].has(name)) return true
    }
    return false
  }

  compile(ast: TemplateNode): string {
    const body = this.compileNodes(ast.body)
    const nl = this.options.minify ? '' : '\n'

    return (
      `function ${this.options.functionName}(__ctx) {${nl}` +
      `  let __out = '';${nl}` +
      body +
      `  return __out;${nl}` +
      `}`
    )
  }

  private compileNodes(nodes: ASTNode[]): string {
    return nodes.map((node) => this.compileNode(node)).join('')
  }

  private compileNode(node: ASTNode): string {
    switch (node.type) {
      case 'Text':
        return this.compileText(node as TextNode)
      case 'Output':
        return this.compileOutput(node as OutputNode)
      case 'If':
        return this.compileIf(node as IfNode)
      case 'For':
        return this.compileFor(node as ForNode)
      case 'Set':
        return this.compileSet(node as SetNode)
      case 'With':
        return this.compileWith(node as WithNode)
      case 'Comment':
        return '' // Skip comments
      case 'Extends':
      case 'Block':
      case 'Include':
        throw new Error(
          `AOT compilation does not support '${node.type}' - use Environment.render() for templates with inheritance`
        )
      case 'Url':
      case 'Static':
        throw new Error(
          `AOT compilation does not support '${node.type}' tag - use Environment.render() with urlResolver/staticResolver`
        )
      default:
        throw new Error(`Unknown node type in AOT compiler: ${node.type}`)
    }
  }

  private compileText(node: TextNode): string {
    const escaped = JSON.stringify(node.value)
    return `  __out += ${escaped};${this.nl()}`
  }

  private compileOutput(node: OutputNode): string {
    const expr = this.compileExpr(node.expression)

    // Check if expression needs escaping
    if (this.options.autoescape && !this.isMarkedSafe(node.expression)) {
      return `  __out += escape(${expr});${this.nl()}`
    }
    return `  __out += (${expr}) ?? '';${this.nl()}`
  }

  private compileIf(node: IfNode): string {
    let code = ''
    const test = this.compileExpr(node.test)

    code += `  if (isTruthy(${test})) {${this.nl()}`
    code += this.compileNodes(node.body)
    code += `  }`

    // Handle elifs
    for (const elif of node.elifs) {
      const elifTest = this.compileExpr(elif.test)
      code += ` else if (isTruthy(${elifTest})) {${this.nl()}`
      code += this.compileNodes(elif.body)
      code += `  }`
    }

    // Handle else
    if (node.else_.length > 0) {
      code += ` else {${this.nl()}`
      code += this.compileNodes(node.else_)
      code += `  }`
    }

    code += this.nl()
    return code
  }

  private compileFor(node: ForNode): string {
    const iterVar = this.genVar('iter')
    const indexVar = this.genVar('i')
    const lenVar = this.genVar('len')
    const loopVar = this.genVar('loop')
    const itemVar = Array.isArray(node.target) ? node.target[0] : node.target
    const valueVar = Array.isArray(node.target) && node.target[1] ? node.target[1] : null

    // Get parent loop variable name if nested
    const parentLoopVar =
      this.loopStack.length > 0 ? this.loopStack[this.loopStack.length - 1] : null

    const iter = this.compileExpr(node.iter)
    let code = ''

    code += `  const ${iterVar} = toArray(${iter});${this.nl()}`
    code += `  const ${lenVar} = ${iterVar}.length;${this.nl()}`

    // Handle empty case
    if (node.else_.length > 0) {
      code += `  if (${lenVar} === 0) {${this.nl()}`
      code += this.compileNodes(node.else_)
      code += `  } else {${this.nl()}`
    }

    code += `  for (let ${indexVar} = 0; ${indexVar} < ${lenVar}; ${indexVar}++) {${this.nl()}`

    // Set loop variables
    if (valueVar) {
      // Tuple unpacking: {% for key, value in dict.items() %}
      code += `    const ${itemVar} = ${iterVar}[${indexVar}][0];${this.nl()}`
      code += `    const ${valueVar} = ${iterVar}[${indexVar}][1];${this.nl()}`
    } else {
      code += `    const ${itemVar} = ${iterVar}[${indexVar}];${this.nl()}`
    }

    // Create forloop/loop object with parentloop support
    code += `    const ${loopVar} = {${this.nl()}`
    code += `      counter: ${indexVar} + 1,${this.nl()}`
    code += `      counter0: ${indexVar},${this.nl()}`
    code += `      revcounter: ${lenVar} - ${indexVar},${this.nl()}`
    code += `      revcounter0: ${lenVar} - ${indexVar} - 1,${this.nl()}`
    code += `      first: ${indexVar} === 0,${this.nl()}`
    code += `      last: ${indexVar} === ${lenVar} - 1,${this.nl()}`
    code += `      length: ${lenVar},${this.nl()}`
    code += `      index: ${indexVar} + 1,${this.nl()}`
    code += `      index0: ${indexVar},${this.nl()}`
    // Add parentloop/parent reference for nested loops
    if (parentLoopVar) {
      code += `      parentloop: ${parentLoopVar},${this.nl()}`
      code += `      parent: ${parentLoopVar}${this.nl()}`
    } else {
      code += `      parentloop: null,${this.nl()}`
      code += `      parent: null${this.nl()}`
    }
    code += `    };${this.nl()}`
    code += `    const forloop = ${loopVar};${this.nl()}`
    code += `    const loop = ${loopVar};${this.nl()}`

    // Push current loop to stack before compiling body
    this.loopStack.push(loopVar)

    // Compile body with item in scope
    const bodyCode = this.compileNodes(node.body)
    // Replace references to loop variable with local var
    code += bodyCode.replace(new RegExp(`__ctx\\.${itemVar}`, 'g'), itemVar)

    // Pop from stack after compiling body
    this.loopStack.pop()

    code += `  }${this.nl()}`

    if (node.else_.length > 0) {
      code += `  }${this.nl()}`
    }

    return code
  }

  private compileSet(node: SetNode): string {
    const value = this.compileExpr(node.value)
    return `  const ${node.target} = ${value};${this.nl()}`
  }

  private compileWith(node: WithNode): string {
    let code = `  {${this.nl()}`

    this.pushScope()
    for (const { target, value } of node.assignments) {
      const valueExpr = this.compileExpr(value)
      code += `    const ${target} = ${valueExpr};${this.nl()}`
      this.addLocalVar(target)
    }

    code += this.compileNodes(node.body)
    code += `  }${this.nl()}`
    this.popScope()

    return code
  }

  private compileExpr(node: ExpressionNode): string {
    switch (node.type) {
      case 'Name':
        return this.compileName(node as NameNode)
      case 'Literal':
        return this.compileLiteral(node as LiteralNode)
      case 'Array':
        return this.compileArray(node as ArrayNode)
      case 'Object':
        return this.compileObject(node as ObjectNode)
      case 'BinaryOp':
        return this.compileBinaryOp(node as BinaryOpNode)
      case 'UnaryOp':
        return this.compileUnaryOp(node as UnaryOpNode)
      case 'Compare':
        return this.compileCompare(node as CompareNode)
      case 'GetAttr':
        return this.compileGetAttr(node as GetAttrNode)
      case 'GetItem':
        return this.compileGetItem(node as GetItemNode)
      case 'FilterExpr':
        return this.compileFilter(node as FilterExprNode)
      case 'TestExpr':
        return this.compileTest(node as TestExprNode)
      case 'Conditional':
        return this.compileConditional(node as ConditionalNode)
      default:
        return 'undefined'
    }
  }

  private compileName(node: NameNode): string {
    // Check for special names
    if (node.name === 'true' || node.name === 'True') return 'true'
    if (node.name === 'false' || node.name === 'False') return 'false'
    if (node.name === 'none' || node.name === 'None' || node.name === 'null') return 'null'
    if (node.name === 'forloop' || node.name === 'loop') return node.name

    // Check if it's a local variable (from with/set)
    if (this.isLocalVar(node.name)) {
      return node.name
    }

    return `__ctx.${node.name}`
  }

  private compileLiteral(node: LiteralNode): string {
    if (typeof node.value === 'string') {
      return JSON.stringify(node.value)
    }
    return String(node.value)
  }

  private compileArray(node: ArrayNode): string {
    const elements = node.elements.map((el) => this.compileExpr(el)).join(', ')
    return `[${elements}]`
  }

  private compileObject(node: ObjectNode): string {
    const pairs = node.pairs
      .map(({ key, value }) => {
        const k = this.compileExpr(key)
        const v = this.compileExpr(value)
        return `[${k}]: ${v}`
      })
      .join(', ')
    return `{${pairs}}`
  }

  private compileBinaryOp(node: BinaryOpNode): string {
    const left = this.compileExpr(node.left)
    const right = this.compileExpr(node.right)

    switch (node.operator) {
      case 'and':
        return `(${left} && ${right})`
      case 'or':
        return `(${left} || ${right})`
      case '~':
        return `(String(${left}) + String(${right}))`
      case 'in':
        return `(Array.isArray(${right}) ? ${right}.includes(${left}) : String(${right}).includes(String(${left})))`
      case 'not in':
        return `!(Array.isArray(${right}) ? ${right}.includes(${left}) : String(${right}).includes(String(${left})))`
      default:
        return `(${left} ${node.operator} ${right})`
    }
  }

  private compileUnaryOp(node: UnaryOpNode): string {
    const operand = this.compileExpr(node.operand)

    switch (node.operator) {
      case 'not':
        return `!isTruthy(${operand})`
      case '-':
        return `-(${operand})`
      case '+':
        return `+(${operand})`
      default:
        return operand
    }
  }

  private compileCompare(node: CompareNode): string {
    let result = this.compileExpr(node.left)

    for (const { operator, right } of node.ops) {
      const rightExpr = this.compileExpr(right)

      switch (operator) {
        case '==':
        case '===':
          result = `(${result} === ${rightExpr})`
          break
        case '!=':
        case '!==':
          result = `(${result} !== ${rightExpr})`
          break
        default:
          result = `(${result} ${operator} ${rightExpr})`
      }
    }

    return result
  }

  private compileGetAttr(node: GetAttrNode): string {
    const obj = this.compileExpr(node.object)
    return `${obj}?.${node.attribute}`
  }

  private compileGetItem(node: GetItemNode): string {
    const obj = this.compileExpr(node.object)
    const index = this.compileExpr(node.index)
    return `${obj}?.[${index}]`
  }

  private compileFilter(node: FilterExprNode): string {
    const value = this.compileExpr(node.node)
    const args = node.args.map((arg) => this.compileExpr(arg))

    // Inline common filters for performance
    switch (node.filter) {
      case 'upper':
        return `String(${value}).toUpperCase()`
      case 'lower':
        return `String(${value}).toLowerCase()`
      case 'title':
        return `String(${value}).replace(/\\b\\w/g, c => c.toUpperCase())`
      case 'trim':
        return `String(${value}).trim()`
      case 'length':
        return `(${value}?.length ?? Object.keys(${value} ?? {}).length)`
      case 'first':
        return `(${value})?.[0]`
      case 'last':
        return `(${value})?.[(${value})?.length - 1]`
      case 'default':
        return `((${value}) ?? ${args[0] ?? '""'})`
      case 'safe':
        return `{ __safe: true, value: String(${value}) }`
      case 'escape':
      case 'e':
        return `escape(${value})`
      case 'join':
        return `(${value} ?? []).join(${args[0] ?? '""'})`
      case 'abs':
        return `Math.abs(${value})`
      case 'round':
        return args.length ? `Number(${value}).toFixed(${args[0]})` : `Math.round(${value})`
      case 'int':
        return `parseInt(${value}, 10)`
      case 'float':
        return `parseFloat(${value})`
      case 'floatformat':
        return `Number(${value}).toFixed(${args[0] ?? 1})`
      case 'filesizeformat':
        return `applyFilter('filesizeformat', ${value})`
      default:
        // Fall back to runtime filter application
        const argsStr = args.length ? ', ' + args.join(', ') : ''
        return `applyFilter('${node.filter}', ${value}${argsStr})`
    }
  }

  private compileTest(node: TestExprNode): string {
    const value = this.compileExpr(node.node)
    const args = node.args.map((arg) => this.compileExpr(arg))
    const negation = node.negated ? '!' : ''

    // Inline common tests
    switch (node.test) {
      case 'defined':
        return `${negation}(${value} !== undefined)`
      case 'undefined':
        return `${negation}(${value} === undefined)`
      case 'none':
        return `${negation}(${value} === null)`
      case 'even':
        return `${negation}(${value} % 2 === 0)`
      case 'odd':
        return `${negation}(${value} % 2 !== 0)`
      case 'divisibleby':
        return `${negation}(${value} % ${args[0]} === 0)`
      case 'empty':
        return `${negation}((${value} == null) || (${value}.length === 0) || (Object.keys(${value}).length === 0))`
      case 'iterable':
        return `${negation}(Array.isArray(${value}) || typeof ${value} === 'string')`
      case 'number':
        return `${negation}(typeof ${value} === 'number' && !isNaN(${value}))`
      case 'string':
        return `${negation}(typeof ${value} === 'string')`
      default:
        const argsStr = args.length ? ', ' + args.join(', ') : ''
        return `${negation}applyTest('${node.test}', ${value}${argsStr})`
    }
  }

  private compileConditional(node: ConditionalNode): string {
    const test = this.compileExpr(node.test)
    const trueExpr = this.compileExpr(node.trueExpr)
    const falseExpr = this.compileExpr(node.falseExpr)
    return `(isTruthy(${test}) ? ${trueExpr} : ${falseExpr})`
  }

  private isMarkedSafe(node: ExpressionNode): boolean {
    if (node.type === 'FilterExpr') {
      const filter = node as FilterExprNode
      return filter.filter === 'safe'
    }
    return false
  }

  private genVar(prefix: string): string {
    return `__${prefix}${this.varCounter++}`
  }

  private nl(): string {
    return this.options.minify ? '' : '\n'
  }
}

export { runtimeHelpers }
