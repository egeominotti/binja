/**
 * Jinja2/DTL Parser - Parses tokens into AST
 * Compatible with both Jinja2 and Django Template Language
 */
import { TokenType } from '../lexer'
import type { Token } from '../lexer'
import { TemplateSyntaxError } from '../errors'
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
} from './nodes'

export class Parser {
  private tokens: Token[]
  private current: number = 0
  private source?: string

  constructor(tokens: Token[], source?: string) {
    this.tokens = tokens
    this.source = source
  }

  parse(): TemplateNode {
    const body: ASTNode[] = []

    while (!this.isAtEnd()) {
      const node = this.parseStatement()
      if (node) body.push(node)
    }

    return {
      type: 'Template',
      body,
      line: 1,
      column: 1,
    }
  }

  private parseStatement(): ASTNode | null {
    const token = this.peek()

    switch (token.type) {
      case TokenType.TEXT:
        return this.parseText()

      case TokenType.VARIABLE_START:
        return this.parseOutput()

      case TokenType.BLOCK_START:
        return this.parseBlock()

      case TokenType.EOF:
        return null

      default:
        this.advance()
        return null
    }
  }

  private parseText(): TextNode {
    const token = this.advance()
    return {
      type: 'Text',
      value: token.value,
      line: token.line,
      column: token.column,
    }
  }

  private parseOutput(): OutputNode {
    const start = this.advance() // consume {{
    const expression = this.parseExpression()
    this.expect(TokenType.VARIABLE_END)

    return {
      type: 'Output',
      expression,
      line: start.line,
      column: start.column,
    }
  }

  private parseBlock(): ASTNode | null {
    const start = this.advance() // consume {%
    const tagName = this.expect(TokenType.NAME)

    switch (tagName.value) {
      case 'if':
        return this.parseIf(start)
      case 'for':
        return this.parseFor(start)
      case 'block':
        return this.parseBlockTag(start)
      case 'extends':
        return this.parseExtends(start)
      case 'include':
        return this.parseInclude(start)
      case 'set':
        return this.parseSet(start)
      case 'with':
        return this.parseWith(start)
      case 'load':
        return this.parseLoad(start)
      case 'url':
        return this.parseUrl(start)
      case 'static':
        return this.parseStatic(start)
      case 'now':
        return this.parseNow(start)
      case 'comment':
        return this.parseComment(start)
      case 'spaceless':
      case 'autoescape':
      case 'verbatim':
        return this.parseSimpleBlock(start, tagName.value)
      // Django additional tags
      case 'cycle':
        return this.parseCycle(start)
      case 'firstof':
        return this.parseFirstof(start)
      case 'ifchanged':
        return this.parseIfchanged(start)
      case 'regroup':
        return this.parseRegroup(start)
      case 'widthratio':
        return this.parseWidthratio(start)
      case 'lorem':
        return this.parseLorem(start)
      case 'csrf_token':
        return this.parseCsrfToken(start)
      case 'debug':
        return this.parseDebug(start)
      case 'templatetag':
        return this.parseTemplatetag(start)
      // Deprecated but supported for compatibility
      case 'ifequal':
        return this.parseIfequal(start, false)
      case 'ifnotequal':
        return this.parseIfequal(start, true)
      default:
        // Unknown tag - skip to end
        this.skipToBlockEnd()
        return null
    }
  }

  // ==================== Control Flow Parsing ====================

  private parseIf(start: Token): IfNode {
    const test = this.parseExpression()
    this.expect(TokenType.BLOCK_END)

    const body: ASTNode[] = []
    const elifs: Array<{ test: ExpressionNode; body: ASTNode[] }> = []
    let else_: ASTNode[] = []

    // Parse body until elif/else/endif
    while (!this.isAtEnd()) {
      if (this.checkBlockTag('elif') || this.checkBlockTag('else') || this.checkBlockTag('endif')) {
        break
      }
      const node = this.parseStatement()
      if (node) body.push(node)
    }

    // Parse elif chains
    while (this.checkBlockTag('elif')) {
      this.advance() // {%
      this.advance() // elif
      const elifTest = this.parseExpression()
      this.expect(TokenType.BLOCK_END)

      const elifBody: ASTNode[] = []
      while (!this.isAtEnd()) {
        if (this.checkBlockTag('elif') || this.checkBlockTag('else') || this.checkBlockTag('endif')) {
          break
        }
        const node = this.parseStatement()
        if (node) elifBody.push(node)
      }

      elifs.push({ test: elifTest, body: elifBody })
    }

    // Parse else
    if (this.checkBlockTag('else')) {
      this.advance() // {%
      this.advance() // else
      this.expect(TokenType.BLOCK_END)

      while (!this.isAtEnd()) {
        if (this.checkBlockTag('endif')) break
        const node = this.parseStatement()
        if (node) else_.push(node)
      }
    }

    // Consume endif
    this.expectBlockTag('endif')

    return {
      type: 'If',
      test,
      body,
      elifs,
      else_,
      line: start.line,
      column: start.column,
    }
  }

  private parseFor(start: Token): ForNode {
    // Parse loop variable(s)
    let target: string | string[]
    const firstName = this.expect(TokenType.NAME).value

    if (this.check(TokenType.COMMA)) {
      // Multiple loop variables: {% for key, value in dict.items %}
      const targets = [firstName]
      while (this.match(TokenType.COMMA)) {
        targets.push(this.expect(TokenType.NAME).value)
      }
      target = targets
    } else {
      target = firstName
    }

    // Expect 'in'
    const inToken = this.expect(TokenType.NAME)
    if (inToken.value !== 'in') {
      throw this.error(`Expected 'in' in for loop, got '${inToken.value}'`)
    }

    // Parse iterable
    const iter = this.parseExpression()
    const recursive = this.check(TokenType.NAME) && this.peek().value === 'recursive'
    if (recursive) this.advance()

    this.expect(TokenType.BLOCK_END)

    // Parse body
    const body: ASTNode[] = []
    let else_: ASTNode[] = []

    while (!this.isAtEnd()) {
      // DTL uses {% empty %}, Jinja uses {% else %}
      if (this.checkBlockTag('empty') || this.checkBlockTag('else') || this.checkBlockTag('endfor')) {
        break
      }
      const node = this.parseStatement()
      if (node) body.push(node)
    }

    // Parse else/empty block
    if (this.checkBlockTag('empty') || this.checkBlockTag('else')) {
      this.advance() // {%
      this.advance() // empty/else
      this.expect(TokenType.BLOCK_END)

      while (!this.isAtEnd()) {
        if (this.checkBlockTag('endfor')) break
        const node = this.parseStatement()
        if (node) else_.push(node)
      }
    }

    this.expectBlockTag('endfor')

    return {
      type: 'For',
      target,
      iter,
      body,
      else_,
      recursive,
      line: start.line,
      column: start.column,
    }
  }

  // ==================== Template Inheritance ====================

  private parseBlockTag(start: Token): BlockNode {
    const name = this.expect(TokenType.NAME).value
    const scoped = this.check(TokenType.NAME) && this.peek().value === 'scoped'
    if (scoped) this.advance()

    this.expect(TokenType.BLOCK_END)

    const body: ASTNode[] = []
    while (!this.isAtEnd()) {
      if (this.checkBlockTag('endblock')) break
      const node = this.parseStatement()
      if (node) body.push(node)
    }

    // Consume endblock
    this.advance() // {%
    this.advance() // endblock
    // Optional block name after endblock
    if (this.check(TokenType.NAME)) this.advance()
    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Block',
      name,
      body,
      scoped,
      line: start.line,
      column: start.column,
    }
  }

  private parseExtends(start: Token): ExtendsNode {
    const template = this.parseExpression()
    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Extends',
      template,
      line: start.line,
      column: start.column,
    }
  }

  private parseInclude(start: Token): IncludeNode {
    const template = this.parseExpression()
    let context: Record<string, ExpressionNode> | null = null
    let only = false
    let ignoreMissing = false

    // Parse optional modifiers
    while (this.check(TokenType.NAME)) {
      const modifier = this.peek().value

      if (modifier === 'ignore' && this.peekNext()?.value === 'missing') {
        this.advance() // ignore
        this.advance() // missing
        ignoreMissing = true
      } else if (modifier === 'with') {
        this.advance() // with
        context = this.parseKeywordArgs()
      } else if (modifier === 'only') {
        this.advance()
        only = true
      } else if (modifier === 'without') {
        this.advance() // without
        if (this.check(TokenType.NAME) && this.peek().value === 'context') {
          this.advance()
          only = true
        }
      } else {
        break
      }
    }

    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Include',
      template,
      context,
      only,
      ignoreMissing,
      line: start.line,
      column: start.column,
    }
  }

  // ==================== Variables ====================

  private parseSet(start: Token): SetNode {
    const target = this.expect(TokenType.NAME).value
    this.expect(TokenType.ASSIGN)
    const value = this.parseExpression()
    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Set',
      target,
      value,
      line: start.line,
      column: start.column,
    }
  }

  private parseWith(start: Token): WithNode {
    const assignments: Array<{ target: string; value: ExpressionNode }> = []

    // Parse assignments (DTL style or Jinja style)
    do {
      const target = this.expect(TokenType.NAME).value
      this.expect(TokenType.ASSIGN)
      const value = this.parseExpression()
      assignments.push({ target, value })
    } while (this.match(TokenType.COMMA) || (this.check(TokenType.NAME) && this.peekNext()?.type === TokenType.ASSIGN))

    this.expect(TokenType.BLOCK_END)

    const body: ASTNode[] = []
    while (!this.isAtEnd()) {
      if (this.checkBlockTag('endwith')) break
      const node = this.parseStatement()
      if (node) body.push(node)
    }

    this.expectBlockTag('endwith')

    return {
      type: 'With',
      assignments,
      body,
      line: start.line,
      column: start.column,
    }
  }

  // ==================== Django-specific Tags ====================

  private parseLoad(start: Token): LoadNode {
    const names: string[] = []

    while (this.check(TokenType.NAME)) {
      names.push(this.advance().value)
    }

    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Load',
      names,
      line: start.line,
      column: start.column,
    }
  }

  private parseUrl(start: Token): UrlNode {
    const name = this.parseExpression()
    const args: ExpressionNode[] = []
    const kwargs: Record<string, ExpressionNode> = {}
    let asVar: string | null = null

    // Parse positional and keyword args
    while (!this.check(TokenType.BLOCK_END)) {
      if (this.check(TokenType.NAME) && this.peek().value === 'as') {
        this.advance() // as
        asVar = this.expect(TokenType.NAME).value
        break
      }

      // Check for keyword argument
      if (this.check(TokenType.NAME) && this.peekNext()?.type === TokenType.ASSIGN) {
        const key = this.advance().value
        this.advance() // =
        kwargs[key] = this.parseExpression()
      } else {
        args.push(this.parseExpression())
      }
    }

    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Url',
      name,
      args,
      kwargs,
      asVar,
      line: start.line,
      column: start.column,
    }
  }

  private parseStatic(start: Token): StaticNode {
    const path = this.parseExpression()
    let asVar: string | null = null

    if (this.check(TokenType.NAME) && this.peek().value === 'as') {
      this.advance()
      asVar = this.expect(TokenType.NAME).value
    }

    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Static',
      path,
      asVar,
      line: start.line,
      column: start.column,
    }
  }

  private parseNow(start: Token): NowNode {
    const format = this.parseExpression()
    let asVar: string | null = null

    if (this.check(TokenType.NAME) && this.peek().value === 'as') {
      this.advance()
      asVar = this.expect(TokenType.NAME).value
    }

    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Now',
      format,
      asVar,
      line: start.line,
      column: start.column,
    }
  }

  private parseComment(_start: Token): ASTNode | null {
    this.expect(TokenType.BLOCK_END)

    // Skip until endcomment
    while (!this.isAtEnd()) {
      if (this.checkBlockTag('endcomment')) break
      this.advance()
    }

    this.expectBlockTag('endcomment')
    return null
  }

  private parseSimpleBlock(_start: Token, tagName: string): ASTNode | null {
    this.skipToBlockEnd()

    // Skip until end tag
    const endTag = `end${tagName}`
    while (!this.isAtEnd()) {
      if (this.checkBlockTag(endTag)) break
      this.advance()
    }

    if (this.checkBlockTag(endTag)) {
      this.advance() // {%
      this.advance() // endtag
      this.expect(TokenType.BLOCK_END)
    }

    return null
  }

  // ==================== Django Additional Tags ====================

  private parseCycle(start: Token): CycleNode {
    const values: ExpressionNode[] = []
    let asVar: string | null = null
    let silent = false

    // Parse values
    while (!this.check(TokenType.BLOCK_END)) {
      if (this.check(TokenType.NAME) && this.peek().value === 'as') {
        this.advance() // as
        asVar = this.expect(TokenType.NAME).value
        // Check for silent
        if (this.check(TokenType.NAME) && this.peek().value === 'silent') {
          this.advance()
          silent = true
        }
        break
      }
      values.push(this.parseExpression())
    }

    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Cycle',
      values,
      asVar,
      silent,
      line: start.line,
      column: start.column,
    }
  }

  private parseFirstof(start: Token): FirstofNode {
    const values: ExpressionNode[] = []
    let fallback: ExpressionNode | null = null
    let asVar: string | null = null

    while (!this.check(TokenType.BLOCK_END)) {
      if (this.check(TokenType.NAME) && this.peek().value === 'as') {
        this.advance() // as
        asVar = this.expect(TokenType.NAME).value
        break
      }
      values.push(this.parseExpression())
    }

    // Last value can be a fallback string
    if (values.length > 0) {
      const last = values[values.length - 1]
      if (last.type === 'Literal' && typeof (last as LiteralNode).value === 'string') {
        fallback = values.pop()!
      }
    }

    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Firstof',
      values,
      fallback,
      asVar,
      line: start.line,
      column: start.column,
    }
  }

  private parseIfchanged(start: Token): IfchangedNode {
    const values: ExpressionNode[] = []

    // Parse optional expressions to check
    while (!this.check(TokenType.BLOCK_END)) {
      values.push(this.parseExpression())
    }

    this.expect(TokenType.BLOCK_END)

    const body: ASTNode[] = []
    let else_: ASTNode[] = []

    while (!this.isAtEnd()) {
      if (this.checkBlockTag('else') || this.checkBlockTag('endifchanged')) break
      const node = this.parseStatement()
      if (node) body.push(node)
    }

    if (this.checkBlockTag('else')) {
      this.advance() // {%
      this.advance() // else
      this.expect(TokenType.BLOCK_END)

      while (!this.isAtEnd()) {
        if (this.checkBlockTag('endifchanged')) break
        const node = this.parseStatement()
        if (node) else_.push(node)
      }
    }

    this.expectBlockTag('endifchanged')

    return {
      type: 'Ifchanged',
      values,
      body,
      else_,
      line: start.line,
      column: start.column,
    }
  }

  private parseRegroup(start: Token): RegroupNode {
    const target = this.parseExpression()
    this.expectName('by')
    const key = this.expect(TokenType.NAME).value
    this.expectName('as')
    const asVar = this.expect(TokenType.NAME).value

    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Regroup',
      target,
      key,
      asVar,
      line: start.line,
      column: start.column,
    }
  }

  private parseWidthratio(start: Token): WidthratioNode {
    const value = this.parseExpression()
    const maxValue = this.parseExpression()
    const maxWidth = this.parseExpression()
    let asVar: string | null = null

    if (this.check(TokenType.NAME) && this.peek().value === 'as') {
      this.advance()
      asVar = this.expect(TokenType.NAME).value
    }

    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Widthratio',
      value,
      maxValue,
      maxWidth,
      asVar,
      line: start.line,
      column: start.column,
    }
  }

  private parseLorem(start: Token): LoremNode {
    let count: ExpressionNode | null = null
    let method: 'w' | 'p' | 'b' = 'p'
    let random = false

    // Parse optional count
    if (this.check(TokenType.NUMBER)) {
      count = {
        type: 'Literal',
        value: parseInt(this.advance().value, 10),
        line: start.line,
        column: start.column,
      }
    }

    // Parse optional method (w, p, b)
    if (this.check(TokenType.NAME)) {
      const m = this.peek().value.toLowerCase()
      if (m === 'w' || m === 'p' || m === 'b') {
        method = m as 'w' | 'p' | 'b'
        this.advance()
      }
    }

    // Parse optional 'random'
    if (this.check(TokenType.NAME) && this.peek().value === 'random') {
      random = true
      this.advance()
    }

    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Lorem',
      count,
      method,
      random,
      line: start.line,
      column: start.column,
    }
  }

  private parseCsrfToken(start: Token): CsrfTokenNode {
    this.expect(TokenType.BLOCK_END)

    return {
      type: 'CsrfToken',
      line: start.line,
      column: start.column,
    }
  }

  private parseDebug(start: Token): DebugNode {
    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Debug',
      line: start.line,
      column: start.column,
    }
  }

  private parseTemplatetag(start: Token): TemplatetagNode {
    const tagType = this.expect(TokenType.NAME).value as TemplatetagNode['tagType']
    this.expect(TokenType.BLOCK_END)

    return {
      type: 'Templatetag',
      tagType,
      line: start.line,
      column: start.column,
    }
  }

  private parseIfequal(start: Token, negated: boolean): IfNode {
    // {% ifequal a b %} is equivalent to {% if a == b %}
    const left = this.parseExpression()
    const right = this.parseExpression()
    this.expect(TokenType.BLOCK_END)

    const test: CompareNode = {
      type: 'Compare',
      left,
      ops: [{ operator: negated ? '!=' : '==', right }],
      line: start.line,
      column: start.column,
    }

    const body: ASTNode[] = []
    let else_: ASTNode[] = []
    const endTag = negated ? 'endifnotequal' : 'endifequal'

    while (!this.isAtEnd()) {
      if (this.checkBlockTag('else') || this.checkBlockTag(endTag)) break
      const node = this.parseStatement()
      if (node) body.push(node)
    }

    if (this.checkBlockTag('else')) {
      this.advance() // {%
      this.advance() // else
      this.expect(TokenType.BLOCK_END)

      while (!this.isAtEnd()) {
        if (this.checkBlockTag(endTag)) break
        const node = this.parseStatement()
        if (node) else_.push(node)
      }
    }

    this.expectBlockTag(endTag)

    return {
      type: 'If',
      test,
      body,
      elifs: [],
      else_,
      line: start.line,
      column: start.column,
    }
  }

  // ==================== Expression Parsing ====================

  private parseExpression(): ExpressionNode {
    return this.parseConditional()
  }

  private parseConditional(): ExpressionNode {
    let expr = this.parseOr()

    // Ternary: expr if test else other
    if (this.check(TokenType.NAME) && this.peek().value === 'if') {
      this.advance() // if
      const test = this.parseOr()

      this.expectName('else')
      const falseExpr = this.parseConditional()

      expr = {
        type: 'Conditional',
        test,
        trueExpr: expr,
        falseExpr,
        line: expr.line,
        column: expr.column,
      } as ConditionalNode
    }

    return expr
  }

  private parseOr(): ExpressionNode {
    let left = this.parseAnd()

    while (this.check(TokenType.OR) || (this.check(TokenType.NAME) && this.peek().value === 'or')) {
      this.advance()
      const right = this.parseAnd()
      left = {
        type: 'BinaryOp',
        operator: 'or',
        left,
        right,
        line: left.line,
        column: left.column,
      } as BinaryOpNode
    }

    return left
  }

  private parseAnd(): ExpressionNode {
    let left = this.parseNot()

    while (this.check(TokenType.AND) || (this.check(TokenType.NAME) && this.peek().value === 'and')) {
      this.advance()
      const right = this.parseNot()
      left = {
        type: 'BinaryOp',
        operator: 'and',
        left,
        right,
        line: left.line,
        column: left.column,
      } as BinaryOpNode
    }

    return left
  }

  private parseNot(): ExpressionNode {
    if (this.check(TokenType.NOT) || (this.check(TokenType.NAME) && this.peek().value === 'not')) {
      const op = this.advance()
      const operand = this.parseNot()
      return {
        type: 'UnaryOp',
        operator: 'not',
        operand,
        line: op.line,
        column: op.column,
      } as UnaryOpNode
    }

    return this.parseCompare()
  }

  private parseCompare(): ExpressionNode {
    let left = this.parseAddSub()
    const ops: Array<{ operator: string; right: ExpressionNode }> = []

    while (true) {
      let operator: string | null = null

      if (this.match(TokenType.EQ)) operator = '=='
      else if (this.match(TokenType.NE)) operator = '!='
      else if (this.match(TokenType.LT)) operator = '<'
      else if (this.match(TokenType.GT)) operator = '>'
      else if (this.match(TokenType.LE)) operator = '<='
      else if (this.match(TokenType.GE)) operator = '>='
      else if (this.check(TokenType.NAME)) {
        const name = this.peek().value
        if (name === 'in') {
          this.advance()
          operator = 'in'
        } else if (name === 'not' && this.peekNext()?.value === 'in') {
          this.advance() // not
          this.advance() // in
          operator = 'not in'
        } else if (name === 'is') {
          // Handle Jinja2 test expressions: x is testname or x is testname(args)
          this.advance() // consume 'is'

          // Check for 'is not' (NOT is a separate token type)
          const negated = this.check(TokenType.NOT)
          if (negated) {
            this.advance() // consume 'not'
          }

          // Parse test name
          const testToken = this.expect(TokenType.NAME)
          const testName = testToken.value
          const args: ExpressionNode[] = []

          // Parse optional arguments: is testname(arg1, arg2)
          if (this.match(TokenType.LPAREN)) {
            while (!this.check(TokenType.RPAREN)) {
              args.push(this.parseExpression())
              if (!this.check(TokenType.RPAREN)) {
                this.expect(TokenType.COMMA)
              }
            }
            this.expect(TokenType.RPAREN)
          }

          // Return a TestExprNode
          left = {
            type: 'TestExpr',
            node: left,
            test: testName,
            args,
            negated,
            line: left.line,
            column: left.column,
          } as TestExprNode

          continue // Continue to check for more comparisons
        }
      }

      if (!operator) break

      const right = this.parseAddSub()
      ops.push({ operator, right })
    }

    if (ops.length === 0) return left

    return {
      type: 'Compare',
      left,
      ops,
      line: left.line,
      column: left.column,
    } as CompareNode
  }

  private parseAddSub(): ExpressionNode {
    let left = this.parseMulDiv()

    while (this.check(TokenType.ADD) || this.check(TokenType.SUB) || this.check(TokenType.TILDE)) {
      const op = this.advance()
      const right = this.parseMulDiv()
      left = {
        type: 'BinaryOp',
        operator: op.value,
        left,
        right,
        line: left.line,
        column: left.column,
      } as BinaryOpNode
    }

    return left
  }

  private parseMulDiv(): ExpressionNode {
    let left = this.parseUnary()

    while (this.check(TokenType.MUL) || this.check(TokenType.DIV) || this.check(TokenType.MOD)) {
      const op = this.advance()
      const right = this.parseUnary()
      left = {
        type: 'BinaryOp',
        operator: op.value,
        left,
        right,
        line: left.line,
        column: left.column,
      } as BinaryOpNode
    }

    return left
  }

  private parseUnary(): ExpressionNode {
    if (this.check(TokenType.SUB) || this.check(TokenType.ADD)) {
      const op = this.advance()
      const operand = this.parseUnary()
      return {
        type: 'UnaryOp',
        operator: op.value,
        operand,
        line: op.line,
        column: op.column,
      } as UnaryOpNode
    }

    return this.parseFilter()
  }

  private parseFilter(): ExpressionNode {
    let node = this.parsePostfix()

    while (this.match(TokenType.PIPE)) {
      const filterName = this.expect(TokenType.NAME).value
      const args: ExpressionNode[] = []
      const kwargs: Record<string, ExpressionNode> = {}

      // Parse filter arguments
      // DTL style: |filter:arg or |filter:"arg" or |filter:-2 or |filter:obj.prop
      if (this.match(TokenType.COLON)) {
        // Handle unary minus/plus for negative numbers
        if (this.check(TokenType.SUB) || this.check(TokenType.ADD)) {
          const op = this.advance()
          const operand = this.parsePostfix()
          args.push({
            type: 'UnaryOp',
            operator: op.value,
            operand,
            line: op.line,
            column: op.column,
          } as UnaryOpNode)
        } else {
          // Use parsePostfix to support property access like obj.prop
          args.push(this.parsePostfix())
        }
      }
      // Jinja style: |filter(arg1, arg2, key=value)
      else if (this.match(TokenType.LPAREN)) {
        while (!this.check(TokenType.RPAREN)) {
          if (this.check(TokenType.NAME) && this.peekNext()?.type === TokenType.ASSIGN) {
            const key = this.advance().value
            this.advance() // =
            kwargs[key] = this.parseExpression()
          } else {
            args.push(this.parseExpression())
          }

          if (!this.check(TokenType.RPAREN)) {
            this.expect(TokenType.COMMA)
          }
        }
        this.expect(TokenType.RPAREN)
      }

      node = {
        type: 'FilterExpr',
        node,
        filter: filterName,
        args,
        kwargs,
        line: node.line,
        column: node.column,
      } as FilterExprNode
    }

    return node
  }

  private parsePostfix(): ExpressionNode {
    let node = this.parsePrimary()

    while (true) {
      if (this.match(TokenType.DOT)) {
        // Support both .name and .0 (array index like DTL)
        let attr: string
        if (this.check(TokenType.NUMBER)) {
          attr = this.advance().value
        } else {
          attr = this.expect(TokenType.NAME).value
        }
        node = {
          type: 'GetAttr',
          object: node,
          attribute: attr,
          line: node.line,
          column: node.column,
        } as GetAttrNode
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression()
        this.expect(TokenType.RBRACKET)
        node = {
          type: 'GetItem',
          object: node,
          index,
          line: node.line,
          column: node.column,
        } as GetItemNode
      } else if (this.match(TokenType.LPAREN)) {
        // Function call
        const args: ExpressionNode[] = []
        const kwargs: Record<string, ExpressionNode> = {}

        while (!this.check(TokenType.RPAREN)) {
          if (this.check(TokenType.NAME) && this.peekNext()?.type === TokenType.ASSIGN) {
            const key = this.advance().value
            this.advance() // =
            kwargs[key] = this.parseExpression()
          } else {
            args.push(this.parseExpression())
          }

          if (!this.check(TokenType.RPAREN)) {
            this.expect(TokenType.COMMA)
          }
        }
        this.expect(TokenType.RPAREN)

        node = {
          type: 'FunctionCall',
          callee: node,
          args,
          kwargs,
          line: node.line,
          column: node.column,
        } as FunctionCallNode
      } else {
        break
      }
    }

    return node
  }

  private parsePrimary(): ExpressionNode {
    const token = this.peek()

    // Literals
    if (this.match(TokenType.STRING)) {
      return {
        type: 'Literal',
        value: token.value,
        line: token.line,
        column: token.column,
      } as LiteralNode
    }

    if (this.match(TokenType.NUMBER)) {
      const value = token.value.includes('.') ? parseFloat(token.value) : parseInt(token.value, 10)
      return {
        type: 'Literal',
        value,
        line: token.line,
        column: token.column,
      } as LiteralNode
    }

    // Names and keywords
    if (this.check(TokenType.NAME)) {
      const name = this.advance().value

      // Boolean/null literals
      if (name === 'true' || name === 'True') {
        return { type: 'Literal', value: true, line: token.line, column: token.column } as LiteralNode
      }
      if (name === 'false' || name === 'False') {
        return { type: 'Literal', value: false, line: token.line, column: token.column } as LiteralNode
      }
      if (name === 'none' || name === 'None' || name === 'null') {
        return { type: 'Literal', value: null, line: token.line, column: token.column } as LiteralNode
      }

      return { type: 'Name', name, line: token.line, column: token.column } as NameNode
    }

    // Grouped expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression()
      this.expect(TokenType.RPAREN)
      return expr
    }

    // Array literal
    if (this.match(TokenType.LBRACKET)) {
      const elements: ExpressionNode[] = []
      while (!this.check(TokenType.RBRACKET)) {
        elements.push(this.parseExpression())
        if (!this.check(TokenType.RBRACKET)) {
          this.expect(TokenType.COMMA)
        }
      }
      this.expect(TokenType.RBRACKET)
      return { type: 'Array', elements, line: token.line, column: token.column } as ArrayNode
    }

    // Object literal
    if (this.match(TokenType.LBRACE)) {
      const pairs: Array<{ key: ExpressionNode; value: ExpressionNode }> = []
      while (!this.check(TokenType.RBRACE)) {
        const key = this.parseExpression()
        this.expect(TokenType.COLON)
        const value = this.parseExpression()
        pairs.push({ key, value })
        if (!this.check(TokenType.RBRACE)) {
          this.expect(TokenType.COMMA)
        }
      }
      this.expect(TokenType.RBRACE)
      return { type: 'Object', pairs, line: token.line, column: token.column } as ObjectNode
    }

    throw this.error(`Unexpected token: ${token.type} (${token.value})`)
  }

  // ==================== Helpers ====================

  private parseKeywordArgs(): Record<string, ExpressionNode> {
    const kwargs: Record<string, ExpressionNode> = {}

    while (this.check(TokenType.NAME) && this.peekNext()?.type === TokenType.ASSIGN) {
      const key = this.advance().value
      this.advance() // =
      kwargs[key] = this.parseExpression()
    }

    return kwargs
  }

  private checkBlockTag(name: string): boolean {
    if (this.peek().type !== TokenType.BLOCK_START) return false
    const saved = this.current
    this.advance() // {%
    const isMatch = this.check(TokenType.NAME) && this.peek().value === name
    this.current = saved
    return isMatch
  }

  private expectBlockTag(name: string): void {
    this.advance() // {%
    const tag = this.expect(TokenType.NAME)
    if (tag.value !== name) {
      throw this.error(`Expected '${name}', got '${tag.value}'`)
    }
    this.expect(TokenType.BLOCK_END)
  }

  private expectName(name: string): void {
    const token = this.expect(TokenType.NAME)
    if (token.value !== name) {
      throw this.error(`Expected '${name}', got '${token.value}'`)
    }
  }

  private skipToBlockEnd(): void {
    while (!this.isAtEnd() && !this.check(TokenType.BLOCK_END)) {
      this.advance()
    }
    if (this.check(TokenType.BLOCK_END)) {
      this.advance()
    }
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF
  }

  private peek(): Token {
    return this.tokens[this.current]
  }

  private peekNext(): Token | null {
    if (this.current + 1 >= this.tokens.length) return null
    return this.tokens[this.current + 1]
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++
    return this.tokens[this.current - 1]
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false
    return this.peek().type === type
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance()
      return true
    }
    return false
  }

  private expect(type: TokenType): Token {
    if (this.check(type)) return this.advance()
    const token = this.peek()
    throw this.error(`Expected ${type}, got ${token.type} (${token.value})`)
  }

  private error(message: string): TemplateSyntaxError {
    const token = this.peek()
    return new TemplateSyntaxError(message, {
      line: token.line,
      column: token.column,
      source: this.source,
    })
  }
}

export * from './nodes'
