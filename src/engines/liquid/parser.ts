/**
 * Liquid Parser
 * Converts Liquid tokens to a common AST format
 * Shopify-compatible implementation
 */

import { LiquidToken, LiquidTokenType } from './lexer'
import type { TemplateNode, ASTNode, ExpressionNode } from '../../parser/nodes'

export class LiquidParser {
  private tokens: LiquidToken[]
  private current: number = 0
  private source: string

  constructor(tokens: LiquidToken[], source: string = '') {
    this.tokens = tokens
    this.source = source
  }

  parse(): TemplateNode {
    const body = this.parseNodes()
    return {
      type: 'Template',
      body,
      line: 1,
      column: 1,
    }
  }

  private parseNodes(endTags: string[] = []): ASTNode[] {
    const nodes: ASTNode[] = []

    while (!this.isAtEnd()) {
      const token = this.peek()

      // Check for end tag
      if (token.type === LiquidTokenType.TAG_START) {
        const nextToken = this.tokens[this.current + 1]
        if (nextToken && endTags.includes(nextToken.value)) {
          break
        }
      }

      const node = this.parseNode()
      if (node) nodes.push(node)
    }

    return nodes
  }

  private parseNode(): ASTNode | null {
    const token = this.peek()

    switch (token.type) {
      case LiquidTokenType.TEXT:
        return this.parseText()

      case LiquidTokenType.VAR_START:
        return this.parseOutput()

      case LiquidTokenType.TAG_START:
        return this.parseTag()

      default:
        this.advance()
        return null
    }
  }

  private parseText(): ASTNode {
    const token = this.advance()
    return {
      type: 'Text',
      value: token.value,
      line: token.line,
      column: token.column,
    } as any
  }

  private parseOutput(): ASTNode {
    const openToken = this.advance() // {{
    const expression = this.parseExpression()
    this.expect(LiquidTokenType.VAR_END)

    return {
      type: 'Output',
      expression,
      line: openToken.line,
      column: openToken.column,
    } as any
  }

  private parseTag(): ASTNode | null {
    this.advance() // {%
    const tagToken = this.expect(LiquidTokenType.ID)
    const tagName = tagToken.value
    const line = tagToken.line
    const column = tagToken.column

    switch (tagName) {
      case 'if':
        return this.parseIfTag(line, column)

      case 'unless':
        return this.parseUnlessTag(line, column)

      case 'case':
        return this.parseCaseTag(line, column)

      case 'for':
        return this.parseForTag(line, column)

      case 'assign':
        return this.parseAssignTag(line, column)

      case 'capture':
        return this.parseCaptureTag(line, column)

      case 'increment':
      case 'decrement':
        return this.parseIncrementTag(tagName, line, column)

      case 'include':
      case 'render':
        return this.parseIncludeTag(line, column)

      case 'comment':
        return this.parseCommentTag()

      case 'raw':
        return this.parseRawTag(line, column)

      case 'break':
        this.expect(LiquidTokenType.TAG_END)
        return { type: 'Break', line, column } as any

      case 'continue':
        this.expect(LiquidTokenType.TAG_END)
        return { type: 'Continue', line, column } as any

      case 'endif':
      case 'endunless':
      case 'endcase':
      case 'endfor':
      case 'endcapture':
      case 'endcomment':
      case 'endraw':
      case 'elsif':
      case 'else':
      case 'when':
        // These are handled by parent blocks
        // Put tokens back and return null
        this.current -= 2 // Back to TAG_START
        return null

      default:
        // Unknown tag - skip it
        while (!this.check(LiquidTokenType.TAG_END) && !this.isAtEnd()) {
          this.advance()
        }
        if (this.check(LiquidTokenType.TAG_END)) this.advance()
        return null
    }
  }

  private parseIfTag(line: number, column: number): ASTNode {
    const condition = this.parseCondition()
    this.expect(LiquidTokenType.TAG_END)

    const body = this.parseNodes(['elsif', 'else', 'endif'])
    const elifs: Array<{ test: ExpressionNode; body: ASTNode[] }> = []
    let else_: ASTNode[] = []

    // Handle elsif chains
    while (this.checkTag('elsif')) {
      this.consumeTag('elsif')
      const elifCondition = this.parseCondition()
      this.expect(LiquidTokenType.TAG_END)
      const elifBody = this.parseNodes(['elsif', 'else', 'endif'])
      elifs.push({ test: elifCondition, body: elifBody })
    }

    // Handle else
    if (this.checkTag('else')) {
      this.consumeTag('else')
      this.expect(LiquidTokenType.TAG_END)
      else_ = this.parseNodes(['endif'])
    }

    // Consume endif
    this.consumeTag('endif')
    this.expect(LiquidTokenType.TAG_END)

    return {
      type: 'If',
      test: condition,
      body,
      elifs,
      else_,
      line,
      column,
    } as any
  }

  private parseUnlessTag(line: number, column: number): ASTNode {
    const condition = this.parseCondition()
    this.expect(LiquidTokenType.TAG_END)

    const body = this.parseNodes(['else', 'endunless'])
    let else_: ASTNode[] = []

    if (this.checkTag('else')) {
      this.consumeTag('else')
      this.expect(LiquidTokenType.TAG_END)
      else_ = this.parseNodes(['endunless'])
    }

    this.consumeTag('endunless')
    this.expect(LiquidTokenType.TAG_END)

    // Unless is if with negated condition
    return {
      type: 'If',
      test: {
        type: 'UnaryOp',
        operator: 'not',
        operand: condition,
        line,
        column,
      },
      body,
      elifs: [],
      else_,
      line,
      column,
    } as any
  }

  private parseCaseTag(line: number, column: number): ASTNode {
    const target = this.parseExpressionAtom()
    this.expect(LiquidTokenType.TAG_END)

    // Skip whitespace text between case and first when
    this.parseNodes(['when', 'else', 'endcase'])

    const cases: Array<{ value: ExpressionNode; body: ASTNode[] }> = []
    let else_: ASTNode[] = []

    while (this.checkTag('when')) {
      this.consumeTag('when')
      const value = this.parseExpressionAtom()
      this.expect(LiquidTokenType.TAG_END)
      const body = this.parseNodes(['when', 'else', 'endcase'])
      cases.push({ value, body })
    }

    if (this.checkTag('else')) {
      this.consumeTag('else')
      this.expect(LiquidTokenType.TAG_END)
      else_ = this.parseNodes(['endcase'])
    }

    this.consumeTag('endcase')
    this.expect(LiquidTokenType.TAG_END)

    // Convert case to if-elif chain
    if (cases.length === 0) {
      return { type: 'Text', value: '', line, column } as any
    }

    const first = cases[0]
    const elifs = cases.slice(1).map((c) => ({
      test: {
        type: 'Compare',
        left: target,
        ops: [{ operator: '==', right: c.value }],
        line,
        column,
      } as ExpressionNode,
      body: c.body,
    }))

    return {
      type: 'If',
      test: {
        type: 'Compare',
        left: target,
        ops: [{ operator: '==', right: first.value }],
        line,
        column,
      },
      body: first.body,
      elifs,
      else_,
      line,
      column,
    } as any
  }

  private parseForTag(line: number, column: number): ASTNode {
    const target = this.expect(LiquidTokenType.ID).value
    this.expectKeyword('in')
    const iterable = this.parseForIterable()

    // Parse optional parameters: limit, offset, reversed
    let limit: ExpressionNode | undefined
    let offset: ExpressionNode | undefined
    let reversed = false

    while (!this.check(LiquidTokenType.TAG_END)) {
      if (this.checkKeyword('limit')) {
        this.advance()
        this.expect(LiquidTokenType.COLON)
        limit = this.parseExpressionAtom()
      } else if (this.checkKeyword('offset')) {
        this.advance()
        this.expect(LiquidTokenType.COLON)
        offset = this.parseExpressionAtom()
      } else if (this.checkKeyword('reversed')) {
        this.advance()
        reversed = true
      } else {
        break
      }
    }

    this.expect(LiquidTokenType.TAG_END)

    const body = this.parseNodes(['else', 'endfor'])
    let else_: ASTNode[] = []

    if (this.checkTag('else')) {
      this.consumeTag('else')
      this.expect(LiquidTokenType.TAG_END)
      else_ = this.parseNodes(['endfor'])
    }

    this.consumeTag('endfor')
    this.expect(LiquidTokenType.TAG_END)

    return {
      type: 'For',
      target,
      iter: iterable,
      body,
      else_,
      line,
      column,
    } as any
  }

  private parseForIterable(): ExpressionNode {
    // Check for range: (1..5)
    if (
      this.check(LiquidTokenType.LBRACKET) ||
      (this.peek().type === LiquidTokenType.ID && this.peek().value === '(')
    ) {
      // Skip opening paren if present
      if (this.peek().value === '(') this.advance()
      if (this.check(LiquidTokenType.LBRACKET)) this.advance()

      const start = this.parseExpressionAtom()

      if (this.check(LiquidTokenType.RANGE)) {
        this.advance()
        const end = this.parseExpressionAtom()

        // Skip closing
        if (this.peek().value === ')') this.advance()
        if (this.check(LiquidTokenType.RBRACKET)) this.advance()

        return {
          type: 'FunctionCall',
          callee: {
            type: 'Name',
            name: 'range',
            line: (start as any).line,
            column: (start as any).column,
          },
          args: [start, end],
          kwargs: {},
          line: (start as any).line,
          column: (start as any).column,
        } as any
      }
    }

    return this.parseExpressionAtom()
  }

  private parseAssignTag(line: number, column: number): ASTNode {
    const name = this.expect(LiquidTokenType.ID).value
    this.expect(LiquidTokenType.EQUALS)
    const value = this.parseExpression()
    this.expect(LiquidTokenType.TAG_END)

    return {
      type: 'Set',
      target: name,
      value,
      line,
      column,
    } as any
  }

  private parseCaptureTag(line: number, column: number): ASTNode {
    const name = this.expect(LiquidTokenType.ID).value
    this.expect(LiquidTokenType.TAG_END)

    const body = this.parseNodes(['endcapture'])
    this.consumeTag('endcapture')
    this.expect(LiquidTokenType.TAG_END)

    // Capture is like set but with body content
    return {
      type: 'Set',
      targets: [name],
      value: {
        type: 'Capture',
        body,
        line,
        column,
      },
      line,
      column,
    } as any
  }

  private parseIncrementTag(tagName: string, line: number, column: number): ASTNode {
    const name = this.expect(LiquidTokenType.ID).value
    this.expect(LiquidTokenType.TAG_END)

    // Output the current value and increment/decrement
    return {
      type: 'Output',
      expression: {
        type: 'FunctionCall',
        callee: { type: 'Name', name: tagName, line, column },
        args: [{ type: 'Name', name, line, column }],
        kwargs: {},
        line,
        column,
      },
      line,
      column,
    } as any
  }

  private parseIncludeTag(line: number, column: number): ASTNode {
    const template = this.parseExpressionAtom()

    // Parse optional 'with' or variables
    const context: Record<string, ExpressionNode> = {}

    if (this.checkKeyword('with')) {
      this.advance()
      const value = this.parseExpressionAtom()
      // with value becomes the context
      context['_'] = value
    }

    // Parse var: value pairs
    while (this.check(LiquidTokenType.ID) || this.check(LiquidTokenType.COMMA)) {
      if (this.check(LiquidTokenType.COMMA)) this.advance()
      if (!this.check(LiquidTokenType.ID)) break

      const key = this.advance().value
      if (this.check(LiquidTokenType.COLON)) {
        this.advance()
        context[key] = this.parseExpressionAtom()
      }
    }

    this.expect(LiquidTokenType.TAG_END)

    return {
      type: 'Include',
      template,
      context: Object.keys(context).length > 0 ? context : undefined,
      line,
      column,
    } as any
  }

  private parseCommentTag(): ASTNode | null {
    // Skip until endcomment
    while (!this.isAtEnd()) {
      if (this.checkTag('endcomment')) {
        this.consumeTag('endcomment')
        this.expect(LiquidTokenType.TAG_END)
        break
      }
      this.advance()
    }
    return null
  }

  private parseRawTag(line: number, column: number): ASTNode {
    this.expect(LiquidTokenType.TAG_END)

    // Collect all text until {% endraw %}
    let content = ''
    while (!this.isAtEnd()) {
      if (this.checkTag('endraw')) {
        this.consumeTag('endraw')
        this.expect(LiquidTokenType.TAG_END)
        break
      }
      const token = this.advance()
      content += token.value
    }

    return {
      type: 'Text',
      value: content,
      line,
      column,
    } as any
  }

  private parseCondition(): ExpressionNode {
    return this.parseOr()
  }

  private parseOr(): ExpressionNode {
    let left = this.parseAnd()

    while (this.check(LiquidTokenType.OR)) {
      this.advance()
      const right = this.parseAnd()
      left = {
        type: 'BinaryOp',
        operator: 'or',
        left,
        right,
        line: (left as any).line,
        column: (left as any).column,
      } as any
    }

    return left
  }

  private parseAnd(): ExpressionNode {
    let left = this.parseComparison()

    while (this.check(LiquidTokenType.AND)) {
      this.advance()
      const right = this.parseComparison()
      left = {
        type: 'BinaryOp',
        operator: 'and',
        left,
        right,
        line: (left as any).line,
        column: (left as any).column,
      } as any
    }

    return left
  }

  private parseComparison(): ExpressionNode {
    const left = this.parseExpressionAtom()

    const opMap: Record<string, string> = {
      [LiquidTokenType.EQ]: '==',
      [LiquidTokenType.NE]: '!=',
      [LiquidTokenType.LT]: '<',
      [LiquidTokenType.LE]: '<=',
      [LiquidTokenType.GT]: '>',
      [LiquidTokenType.GE]: '>=',
    }

    const token = this.peek()
    if (opMap[token.type]) {
      this.advance()
      const right = this.parseExpressionAtom()
      return {
        type: 'Compare',
        left,
        ops: [{ operator: opMap[token.type], right }],
        line: (left as any).line,
        column: (left as any).column,
      } as any
    }

    if (this.check(LiquidTokenType.CONTAINS)) {
      this.advance()
      const right = this.parseExpressionAtom()
      return {
        type: 'Test',
        node: left,
        test: 'in',
        args: [right],
        line: (left as any).line,
        column: (left as any).column,
      } as any
    }

    return left
  }

  private parseExpression(): ExpressionNode {
    let expr = this.parseExpressionAtom()

    // Handle filters
    while (this.check(LiquidTokenType.PIPE)) {
      this.advance()
      const filterName = this.expect(LiquidTokenType.ID).value
      const args: ExpressionNode[] = []

      if (this.check(LiquidTokenType.COLON)) {
        this.advance()
        args.push(this.parseExpressionAtom())

        while (this.check(LiquidTokenType.COMMA)) {
          this.advance()
          args.push(this.parseExpressionAtom())
        }
      }

      expr = {
        type: 'FilterExpr',
        node: expr,
        filter: filterName,
        args,
        kwargs: {},
        line: (expr as any).line,
        column: (expr as any).column,
      } as any
    }

    return expr
  }

  private parseExpressionAtom(): ExpressionNode {
    const token = this.peek()

    switch (token.type) {
      case LiquidTokenType.STRING:
        this.advance()
        return {
          type: 'Literal',
          value: token.value,
          line: token.line,
          column: token.column,
        } as any

      case LiquidTokenType.NUMBER:
        this.advance()
        return {
          type: 'Literal',
          value: parseFloat(token.value),
          line: token.line,
          column: token.column,
        } as any

      case LiquidTokenType.ID:
        if (token.value === 'true' || token.value === 'false') {
          this.advance()
          return {
            type: 'Literal',
            value: token.value === 'true',
            line: token.line,
            column: token.column,
          } as any
        }
        if (token.value === 'nil' || token.value === 'null') {
          this.advance()
          return { type: 'Literal', value: null, line: token.line, column: token.column } as any
        }
        if (token.value === 'empty' || token.value === 'blank') {
          this.advance()
          return { type: 'Literal', value: '', line: token.line, column: token.column } as any
        }
        return this.parsePath()

      default:
        this.advance()
        return { type: 'Literal', value: null, line: token.line, column: token.column } as any
    }
  }

  private parsePath(): ExpressionNode {
    const first = this.advance()
    let expr: ExpressionNode = {
      type: 'Name',
      name: first.value,
      line: first.line,
      column: first.column,
    } as any

    // Handle forloop special variables
    if (first.value === 'forloop') {
      if (this.check(LiquidTokenType.DOT)) {
        this.advance()
        if (this.check(LiquidTokenType.ID)) {
          const attr = this.advance()
          // Map Liquid's forloop to common format
          const mapping: Record<string, string> = {
            index: 'counter', // 1-indexed
            index0: 'counter0', // 0-indexed
            first: 'first',
            last: 'last',
            length: 'length',
            rindex: 'revcounter', // reverse 1-indexed
            rindex0: 'revcounter0', // reverse 0-indexed
          }
          const mappedAttr = mapping[attr.value] || attr.value
          expr = {
            type: 'GetAttr',
            object: expr,
            attribute: mappedAttr,
            line: attr.line,
            column: attr.column,
          } as any
        }
      }
      return expr
    }

    // Handle path segments: foo.bar or foo["bar"] or foo[0]
    while (this.check(LiquidTokenType.DOT) || this.check(LiquidTokenType.LBRACKET)) {
      if (this.check(LiquidTokenType.DOT)) {
        this.advance()
        if (this.check(LiquidTokenType.ID)) {
          const attr = this.advance()
          expr = {
            type: 'GetAttr',
            object: expr,
            attribute: attr.value,
            line: attr.line,
            column: attr.column,
          } as any
        }
      } else if (this.check(LiquidTokenType.LBRACKET)) {
        this.advance()
        const index = this.parseExpressionAtom()
        this.expect(LiquidTokenType.RBRACKET)
        expr = {
          type: 'GetItem',
          object: expr,
          index,
          line: (index as any).line,
          column: (index as any).column,
        } as any
      }
    }

    return expr
  }

  // Helpers
  private checkTag(name: string): boolean {
    if (!this.check(LiquidTokenType.TAG_START)) return false
    const next = this.tokens[this.current + 1]
    return next?.type === LiquidTokenType.ID && next.value === name
  }

  private consumeTag(name: string): void {
    this.expect(LiquidTokenType.TAG_START)
    this.expect(LiquidTokenType.ID) // tag name
  }

  private checkKeyword(name: string): boolean {
    return this.check(LiquidTokenType.ID) && this.peek().value === name
  }

  private expectKeyword(name: string): void {
    if (!this.checkKeyword(name)) {
      throw new Error(`Expected keyword '${name}' but got '${this.peek().value}'`)
    }
    this.advance()
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === LiquidTokenType.EOF
  }

  private peek(): LiquidToken {
    return this.tokens[this.current] || { type: LiquidTokenType.EOF, value: '', line: 1, column: 1 }
  }

  private advance(): LiquidToken {
    if (!this.isAtEnd()) this.current++
    return this.tokens[this.current - 1]
  }

  private check(type: LiquidTokenType): boolean {
    return this.peek().type === type
  }

  private expect(type: LiquidTokenType): LiquidToken {
    if (this.check(type)) return this.advance()
    throw new Error(`Expected ${type} but got ${this.peek().type}`)
  }
}
