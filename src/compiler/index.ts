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
  AutoescapeNode,
  SpacelessNode,
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
  FunctionCallNode,
} from '../parser/nodes'
import { builtinFilters } from '../filters'
import { builtinTests } from '../tests'
import { safeGet, safeResolve } from '../security'

export interface CompileOptions {
  /** Function name (default: 'render') */
  functionName?: string
  /** @deprecated Reserved for compatibility; code-source output requires an external helper scope. */
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
  const functionName = options.functionName ?? 'render'
  // Create function with runtime helpers in scope
  const fn = new Function(
    '__ctx',
    '__helpers',
    `
    const { escape, stringify, isTruthy, toArray, applyFilter, applyTest, resolveName, getProperty } = __helpers;
    ${code}
    return ${functionName}(__ctx);
  `
  )

  return (ctx: Record<string, any>) => fn(ctx, runtimeHelpers)
}

// Runtime helpers available to compiled functions
const runtimeHelpers = {
  escape: (value: any): any => {
    if (value == null) return ''
    // Support both object format { __safe: true, value: "..." } and String.__safe__ format
    if (typeof value === 'object' && value.__safe) return value
    if ((value as any)?.__safe__) return value
    const escaped = new String(Bun.escapeHTML(String(value))) as any
    escaped.__safe__ = true
    return escaped
  },

  stringify: (value: any, autoescape: boolean): string => {
    if (value == null) return ''
    if (typeof value === 'object' && value.__safe) return String(value.value ?? '')
    if ((value as any)?.__safe__) return String(value)
    if (typeof value === 'boolean') return value ? 'True' : 'False'
    const stringValue = String(value)
    return autoescape ? Bun.escapeHTML(stringValue) : stringValue
  },

  isTruthy: (value: any): boolean => {
    if (value == null) return false
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') return value.length > 0
    if (Array.isArray(value)) return value.length > 0
    if (value instanceof Map || value instanceof Set) return value.size > 0
    if (typeof value === 'object') {
      for (const _ of Object.keys(value)) return true
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

  resolveName: (context: Record<string, any>, name: string): any => safeResolve(context, name),

  getProperty: (object: any, key: PropertyKey): any => safeGet(object, key),

  applyFilter: (name: string, value: any, ...args: any[]): any => {
    const filter = Object.hasOwn(builtinFilters, name) ? builtinFilters[name] : undefined
    if (!filter) throw new Error(`Unknown filter: ${name}`)
    return filter(value, ...args)
  },

  applyTest: (name: string, value: any, ...args: any[]): boolean => {
    const test = Object.hasOwn(builtinTests, name) ? builtinTests[name] : undefined
    if (!test) throw new Error(`Unknown test: ${name}`)
    return test(value, ...args)
  },
}

// JS reserved words / globals that cannot be used verbatim as a local binding
// name. Template targets (set/with/for) that collide are emitted under a safe
// alias so `new Function` does not throw at compile time.
const RESERVED_JS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'let',
  'static',
  'await',
  'async',
  'implements',
  'interface',
  'package',
  'private',
  'protected',
  'public',
  'arguments',
  'eval',
  'undefined',
  'NaN',
  'Infinity',
])

function assertValidFunctionName(name: string): void {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) || RESERVED_JS.has(name)) {
    throw new TypeError(`Invalid JavaScript function name: ${JSON.stringify(name)}`)
  }
}

class Compiler {
  private options: Required<CompileOptions>
  private varCounter = 0
  private loopStack: string[] = [] // Track nested loop variable names for parentloop
  private autoescapeStack: boolean[] = []
  // Stack of local-variable scopes. Each scope maps a template variable name to
  // the JS identifier it is emitted as (usually identical, aliased when the name
  // is a reserved word).
  private localVars: Map<string, string>[] = []
  private setDeclarations: Set<string>[] = []

  constructor(options: CompileOptions = {}) {
    this.options = {
      functionName: options.functionName ?? 'render',
      inlineHelpers: options.inlineHelpers ?? false,
      minify: options.minify ?? false,
      autoescape: options.autoescape ?? true,
    }
    assertValidFunctionName(this.options.functionName)
    this.autoescapeStack.push(this.options.autoescape)
  }

  private pushScope(): void {
    this.localVars.push(new Map())
    this.setDeclarations.push(new Set())
  }

  private popScope(): void {
    this.localVars.pop()
    this.setDeclarations.pop()
  }

  private currentSetDeclarations(): string[] {
    return [...this.setDeclarations[this.setDeclarations.length - 1]]
  }

  // Declare a local in the current scope. Returns the JS identifier to emit and
  // whether this is a fresh declaration in the current scope (vs a re-assignment
  // of an already-declared local, which must not re-emit `let`).
  private declareLocal(name: string): { id: string; isNew: boolean } {
    const scope = this.localVars[this.localVars.length - 1]
    const existing = scope.get(name)
    if (existing !== undefined) return { id: existing, isNew: false }
    const id =
      RESERVED_JS.has(name) || name === 'loop' || name === 'forloop' ? `__loc_${name}` : name
    scope.set(name, id)
    return { id, isNew: true }
  }

  private isLocalVar(name: string): boolean {
    for (let i = this.localVars.length - 1; i >= 0; i--) {
      if (this.localVars[i].has(name)) return true
    }
    return false
  }

  // Resolve the JS identifier for a local, searching inner scopes first.
  private getLocalVar(name: string): string {
    for (let i = this.localVars.length - 1; i >= 0; i--) {
      const id = this.localVars[i].get(name)
      if (id !== undefined) return id
    }
    return name
  }

  compile(ast: TemplateNode): string {
    // Root scope so top-level {% set %} variables register as locals.
    this.pushScope()
    const body = this.compileNodes(ast.body)
    const declarations = this.currentSetDeclarations()
    this.popScope()
    const nl = this.options.minify ? '' : '\n'

    return (
      `function ${this.options.functionName}(__ctx) {${nl}` +
      `  let __out = '';${nl}` +
      (declarations.length > 0 ? `  let ${declarations.join(', ')};${nl}` : '') +
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
      case 'Autoescape':
        return this.compileAutoescape(node as AutoescapeNode)
      case 'Spaceless':
        return this.compileSpaceless(node as SpacelessNode)
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

    const autoescape = this.autoescapeStack.at(-1) ?? this.options.autoescape
    return `  __out += stringify(${expr}, ${autoescape});${this.nl()}`
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

    const hasModifiers =
      node.offset !== undefined || node.limit !== undefined || node.reversed === true
    code += `  ${hasModifiers ? 'let' : 'const'} ${iterVar} = toArray(${iter});${this.nl()}`
    if (hasModifiers) {
      const startVar = this.genVar('start')
      const start = node.offset !== undefined ? this.compileExpr(node.offset) : '0'
      code += `  const ${startVar} = Math.max(0, Math.trunc(Number(${start}) || 0));${this.nl()}`
      if (node.limit !== undefined) {
        const limitVar = this.genVar('limit')
        const limit = this.compileExpr(node.limit)
        code += `  const ${limitVar} = Math.max(0, Math.trunc(Number(${limit}) || 0));${this.nl()}`
        code += `  ${iterVar} = ${iterVar}.slice(${startVar}, ${startVar} + ${limitVar});${this.nl()}`
      } else {
        code += `  ${iterVar} = ${iterVar}.slice(${startVar});${this.nl()}`
      }
      if (node.reversed) {
        code += `  ${iterVar}.reverse();${this.nl()}`
      }
    }
    code += `  const ${lenVar} = ${iterVar}.length;${this.nl()}`

    // Handle empty case
    if (node.else_.length > 0) {
      code += `  if (${lenVar} === 0) {${this.nl()}`
      code += this.compileNodes(node.else_)
      code += `  } else {${this.nl()}`
    }

    code += `  for (let ${indexVar} = 0; ${indexVar} < ${lenVar}; ${indexVar}++) {${this.nl()}`

    // Open a scope and register the loop target(s) as locals so references in
    // the body compile directly to these identifiers (no fragile source
    // rewrite) and reserved-word targets get a safe alias.
    this.pushScope()
    const itemId = this.declareLocal(itemVar).id
    const valueId = valueVar ? this.declareLocal(valueVar).id : null

    // Set loop variables
    if (valueId) {
      // Tuple unpacking: {% for key, value in dict.items() %}
      code += `    let ${itemId} = ${iterVar}[${indexVar}][0];${this.nl()}`
      code += `    let ${valueId} = ${iterVar}[${indexVar}][1];${this.nl()}`
    } else {
      code += `    let ${itemId} = ${iterVar}[${indexVar}];${this.nl()}`
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

    // Compile body with the loop target(s) in scope (resolved via compileName).
    const body = this.compileNodes(node.body)
    const declarations = this.currentSetDeclarations()
    if (declarations.length > 0) {
      code += `    let ${declarations.join(', ')};${this.nl()}`
    }
    code += body

    // Pop from stack/scope after compiling body
    this.loopStack.pop()
    this.popScope()

    code += `  }${this.nl()}`

    if (node.else_.length > 0) {
      code += `  }${this.nl()}`
    }

    return code
  }

  private compileSet(node: SetNode): string {
    // Compile the value BEFORE declaring the target so a self-reference
    // ({% set x = x %}) resolves to the previous binding, and register the
    // target as a local so later references resolve to it (not __ctx).
    const value = this.compileExpr(node.value)
    const { id, isNew } = this.declareLocal(node.target)
    if (isNew) this.setDeclarations[this.setDeclarations.length - 1].add(id)
    return `  ${id} = ${value};${this.nl()}`
  }

  private compileWith(node: WithNode): string {
    this.pushScope()
    let assignments = ''
    for (const { target, value } of node.assignments) {
      // Compile value before declaring target (same-name reference uses outer).
      const valueExpr = this.compileExpr(value)
      const { id } = this.declareLocal(target)
      assignments += `    let ${id} = ${valueExpr};${this.nl()}`
    }

    const body = this.compileNodes(node.body)
    const declarations = this.currentSetDeclarations()
    let code = `  {${this.nl()}`
    if (declarations.length > 0) {
      code += `    let ${declarations.join(', ')};${this.nl()}`
    }
    code += assignments
    code += body
    code += `  }${this.nl()}`
    this.popScope()

    return code
  }

  private compileAutoescape(node: AutoescapeNode): string {
    this.autoescapeStack.push(node.enabled)
    try {
      return this.compileNodes(node.body)
    } finally {
      this.autoescapeStack.pop()
    }
  }

  private compileSpaceless(node: SpacelessNode): string {
    const parentOut = this.genVar('parentOut')
    const captured = this.genVar('captured')
    const body = this.compileNodes(node.body)
    return (
      `  {${this.nl()}` +
      `    const ${parentOut} = __out;${this.nl()}` +
      `    __out = '';${this.nl()}` +
      body +
      `    const ${captured} = __out;${this.nl()}` +
      `    __out = ${parentOut} + ${captured}.replace(/>\\s+</g, '><');${this.nl()}` +
      `  }${this.nl()}`
    )
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
      case 'FunctionCall':
        return this.compileFunctionCall(node as FunctionCallNode)
      default:
        // Fail loudly rather than silently emitting `undefined` (which masked
        // unsupported expressions and produced wrong output). The runtime
        // interpreter supports these; use Environment.render() instead.
        throw new Error(
          `AOT compilation does not support expression type '${(node as ExpressionNode).type}' - use Environment.render()`
        )
    }
  }

  private compileFunctionCall(node: FunctionCallNode): string {
    const callee = this.compileExpr(node.callee)
    const args = node.args.map((arg) => this.compileExpr(arg))
    // Mirror the runtime: kwargs are always passed as a trailing object arg.
    const kwargsPairs = Object.entries(node.kwargs)
      .map(([k, v]) => `${JSON.stringify(k)}: ${this.compileExpr(v)}`)
      .join(', ')
    const callArgs = [...args, `{${kwargsPairs}}`].join(', ')
    // Evaluate the callee once via an IIFE; call only if it is callable,
    // otherwise undefined (matches evalFunctionCall).
    return `((__fn) => typeof __fn === 'function' ? __fn(${callArgs}) : undefined)(${callee})`
  }

  private compileName(node: NameNode): string {
    // Check for special names
    if (node.name === 'true' || node.name === 'True') return 'true'
    if (node.name === 'false' || node.name === 'False') return 'false'
    if (node.name === 'none' || node.name === 'None' || node.name === 'null') return 'null'
    if (node.name === 'forloop' || node.name === 'loop') {
      return this.loopStack.length > 0 ? node.name : 'null'
    }

    // Check if it's a local variable (from with/set/for) and resolve to its
    // emitted JS identifier (aliased for reserved words).
    if (this.isLocalVar(node.name)) {
      return this.getLocalVar(node.name)
    }

    return `resolveName(__ctx, ${JSON.stringify(node.name)})`
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
        return `((__value) => isTruthy(__value) ? ${right} : __value)(${left})`
      case 'or':
        return `((__value) => isTruthy(__value) ? __value : ${right})(${left})`
      case '??':
        return `(${left} ?? ${right})`
      case '~':
        return `(String(${left}) + String(${right}))`
      case 'in':
        return this.compileIn(left, right, false)
      case 'not in':
        return this.compileIn(left, right, true)
      default:
        return `(${left} ${node.operator} ${right})`
    }
  }

  // Membership test mirroring the runtime `isIn`: array.includes, string
  // substring, `key in object` for plain objects, else false. An IIFE evaluates
  // each operand once and keeps the generated code self-contained (no new
  // helper, so compileToCode output stays compatible).
  private compileIn(left: string, right: string, negate: boolean): string {
    const expr =
      `((__n, __h) => Array.isArray(__h) ? __h.includes(__n)` +
      ` : typeof __h === 'string' ? __h.includes(String(__n))` +
      ` : (__h != null && typeof __h === 'object') ? Object.hasOwn(__h, __n) : false)(${left}, ${right})`
    return negate ? `!${expr}` : expr
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
    const build = (index: number, left: string): string => {
      const operation = node.ops[index]
      const right = this.compileExpr(operation.right)
      const leftVar = this.genVar('cmpLeft')
      const rightVar = this.genVar('cmpRight')
      const check = this.compileComparison(leftVar, rightVar, operation.operator)
      const continuation =
        index === node.ops.length - 1 ? check : `${check} && ${build(index + 1, rightVar)}`
      return `((${leftVar}, ${rightVar}) => ${continuation})(${left}, ${right})`
    }

    return build(0, this.compileExpr(node.left))
  }

  private compileComparison(left: string, right: string, operator: string): string {
    switch (operator) {
      case '==':
      case '===':
      case 'is':
        return `(${left} === ${right})`
      case '!=':
      case '!==':
      case 'is not':
        return `(${left} !== ${right})`
      case 'in':
        return this.compileIn(left, right, false)
      case 'not in':
        return this.compileIn(left, right, true)
      default:
        return `(${left} ${operator} ${right})`
    }
  }

  private compileGetAttr(node: GetAttrNode): string {
    const obj = this.compileExpr(node.object)
    return `getProperty(${obj}, ${JSON.stringify(node.attribute)})`
  }

  private compileGetItem(node: GetItemNode): string {
    const obj = this.compileExpr(node.object)
    const index = this.compileExpr(node.index)
    return `getProperty(${obj}, ${index})`
  }

  private compileFilter(node: FilterExprNode): string {
    const value = this.compileExpr(node.node)
    const args = node.args.map((arg) => this.compileExpr(arg))
    const kwargs = Object.values(node.kwargs).map((arg) => this.compileExpr(arg))
    const allArgs = [...args, ...kwargs]

    // Inline common filters for performance
    switch (node.filter) {
      case 'upper':
        return `String(${value} ?? '').toUpperCase()`
      case 'lower':
        return `String(${value} ?? '').toLowerCase()`
      case 'title':
        return `String(${value} ?? '').replace(/\\b\\w/g, c => c.toUpperCase())`
      case 'trim':
        return `String(${value} ?? '').trim()`
      case 'first':
        return `(${value})?.[0]`
      case 'safe':
        return `{ __safe: true, value: String(${value} ?? '') }`
      case 'escape':
      case 'e':
        return `escape(${value})`
      case 'join':
        return `(${value} ?? []).join(${args[0] ?? '""'})`
      case 'abs':
        return `Math.abs(Number(${value}))`
      case 'int':
        return `(parseInt(String(${value}), 10) || 0)`
      case 'float':
        return `(parseFloat(String(${value})) || 0)`
      // length / last / default / round / floatformat / filesizeformat are
      // delegated to the filter registry (default case) to guarantee parity with
      // the runtime interpreter: the previous inline copies diverged (returned a
      // string for round, ignored falsy values for default, double-evaluated the
      // subexpression for last/length, mishandled negative precision).
      default:
        // Fall back to runtime filter application
        const argsStr = allArgs.length ? `, ${allArgs.join(', ')}` : ''
        return `applyFilter('${node.filter}', ${value}${argsStr})`
    }
  }

  private compileTest(node: TestExprNode): string {
    const value = this.compileExpr(node.node)
    const args = node.args.map((arg) => this.compileExpr(arg))
    const negation = node.negated ? '!' : ''

    const argsStr = args.length ? `, ${args.join(', ')}` : ''
    return `${negation}applyTest('${node.test}', ${value}${argsStr})`
  }

  private compileConditional(node: ConditionalNode): string {
    const test = this.compileExpr(node.test)
    const trueExpr = this.compileExpr(node.trueExpr)
    const falseExpr = this.compileExpr(node.falseExpr)
    return `(isTruthy(${test}) ? ${trueExpr} : ${falseExpr})`
  }

  private genVar(prefix: string): string {
    return `__${prefix}${this.varCounter++}`
  }

  private nl(): string {
    return this.options.minify ? '' : '\n'
  }
}

export { runtimeHelpers }
