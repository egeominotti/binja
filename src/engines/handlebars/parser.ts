/**
 * Handlebars Parser
 * Converts Handlebars tokens to a common AST format
 */

import { HbsToken, HbsTokenType } from './lexer'
import type { TemplateNode, ASTNode, ExpressionNode } from '../../parser/nodes'

export class HandlebarsParser {
  private tokens: HbsToken[]
  private current: number = 0
  private source: string

  constructor(tokens: HbsToken[], source: string = '') {
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

      // Check for end block {{/tag}}
      if (token.type === HbsTokenType.OPEN_END) {
        const nextToken = this.tokens[this.current + 1]
        if (nextToken && endTags.includes(nextToken.value)) {
          break
        }
      }

      // Check for {{else}} - stop if 'else' is in endTags
      if (token.type === HbsTokenType.OPEN && endTags.includes('else')) {
        const nextToken = this.tokens[this.current + 1]
        if (nextToken?.value === 'else') {
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
      case HbsTokenType.TEXT:
        return this.parseText()

      case HbsTokenType.OPEN:
      case HbsTokenType.OPEN_UNESCAPED:
        return this.parseOutput()

      case HbsTokenType.OPEN_BLOCK:
        return this.parseBlock()

      case HbsTokenType.OPEN_END:
        // End block - consume and return null
        this.consumeEndBlock()
        return null

      case HbsTokenType.OPEN_COMMENT:
        this.skipComment()
        return null

      case HbsTokenType.OPEN_PARTIAL:
        return this.parsePartial()

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
    const openToken = this.advance()
    const isUnescaped = openToken.type === HbsTokenType.OPEN_UNESCAPED

    const expression = this.parseExpression()

    // Consume close
    if (isUnescaped) {
      this.expect(HbsTokenType.CLOSE_UNESCAPED)
    } else {
      this.expect(HbsTokenType.CLOSE)
    }

    // If unescaped, wrap with safe filter
    if (isUnescaped) {
      return {
        type: 'Output',
        expression: {
          type: 'FilterExpr',
          node: expression,
          filter: 'safe',
          args: [],
          kwargs: {},
          line: openToken.line,
          column: openToken.column,
        },
        line: openToken.line,
        column: openToken.column,
      } as any
    }

    return {
      type: 'Output',
      expression,
      line: openToken.line,
      column: openToken.column,
    } as any
  }

  private parseBlock(): ASTNode {
    const openToken = this.advance() // {{#
    const helperName = this.expect(HbsTokenType.ID).value
    const line = openToken.line
    const column = openToken.column

    // Parse arguments
    const args: ExpressionNode[] = []
    const hash: Record<string, ExpressionNode> = {}

    while (!this.check(HbsTokenType.CLOSE)) {
      if (
        this.check(HbsTokenType.ID) &&
        this.tokens[this.current + 1]?.type === HbsTokenType.EQUALS
      ) {
        // Hash argument: key=value
        const key = this.advance().value
        this.advance() // =
        hash[key] = this.parseExpressionAtom()
      } else {
        args.push(this.parseExpressionAtom())
      }
    }

    this.expect(HbsTokenType.CLOSE)

    // Handle different block types
    switch (helperName) {
      case 'if':
        return this.parseIfBlock(args[0], line, column)

      case 'unless':
        return this.parseUnlessBlock(args[0], line, column)

      case 'each':
        return this.parseEachBlock(args[0], line, column)

      case 'with':
        return this.parseWithBlock(args[0], line, column)

      default:
        // Generic block helper - treat as custom block
        return this.parseCustomBlock(helperName, args, hash, line, column)
    }
  }

  private parseIfBlock(condition: ExpressionNode, line: number, column: number): ASTNode {
    const body = this.parseNodes(['if', 'else'])

    let else_: ASTNode[] = []

    // Check for {{else}}
    if (this.checkOpenBlock('else')) {
      this.consumeElse()
      else_ = this.parseNodes(['if'])
    }

    // Consume {{/if}}
    this.consumeEndBlock()

    return {
      type: 'If',
      test: condition,
      body,
      elifs: [],
      else_,
      line,
      column,
    } as any
  }

  private parseUnlessBlock(condition: ExpressionNode, line: number, column: number): ASTNode {
    const body = this.parseNodes(['unless'])
    this.consumeEndBlock()

    // Unless is just if with negated condition
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
      else_: [],
      line,
      column,
    } as any
  }

  private parseEachBlock(iterable: ExpressionNode, line: number, column: number): ASTNode {
    const body = this.parseNodes(['each', 'else'])

    let else_: ASTNode[] = []

    if (this.checkOpenBlock('else')) {
      this.consumeElse()
      else_ = this.parseNodes(['each'])
    }

    this.consumeEndBlock()

    return {
      type: 'For',
      target: 'this', // Handlebars uses 'this' for current item
      iter: iterable,
      body,
      else_,
      line,
      column,
    } as any
  }

  private parseWithBlock(context: ExpressionNode, line: number, column: number): ASTNode {
    const body = this.parseNodes(['with'])
    this.consumeEndBlock()

    return {
      type: 'With',
      assignments: [{ target: 'this', value: context }],
      body,
      line,
      column,
    } as any
  }

  private parseCustomBlock(
    name: string,
    args: ExpressionNode[],
    hash: Record<string, ExpressionNode>,
    line: number,
    column: number
  ): ASTNode {
    const body = this.parseNodes([name])
    this.consumeEndBlock()

    // Store as a macro call
    return {
      type: 'Output',
      expression: {
        type: 'FunctionCall',
        callee: { type: 'Name', name, line, column },
        args,
        kwargs: hash,
        line,
        column,
      },
      line,
      column,
    } as any
  }

  private parsePartial(): ASTNode {
    const token = this.advance() // {{>
    const name = this.expect(HbsTokenType.ID).value

    // Parse optional context
    let context: ExpressionNode | undefined
    if (!this.check(HbsTokenType.CLOSE)) {
      context = this.parseExpressionAtom()
    }

    this.expect(HbsTokenType.CLOSE)

    return {
      type: 'Include',
      template: { type: 'Literal', value: name, line: token.line, column: token.column },
      context: context ? ({ _: context } as any) : undefined,
      line: token.line,
      column: token.column,
    } as any
  }

  private parseExpression(): ExpressionNode {
    let expr = this.parseExpressionAtom()

    // Handle helpers (function calls)
    while (
      this.check(HbsTokenType.ID) ||
      this.check(HbsTokenType.STRING) ||
      this.check(HbsTokenType.NUMBER)
    ) {
      // This is a helper call with arguments
      const args: ExpressionNode[] = [expr]
      while (
        !this.check(HbsTokenType.CLOSE) &&
        !this.check(HbsTokenType.CLOSE_UNESCAPED) &&
        !this.check(HbsTokenType.PIPE)
      ) {
        args.push(this.parseExpressionAtom())
      }

      // If we have args, first one is the helper name
      if (args.length > 1) {
        const helperExpr = args.shift()!
        expr = {
          type: 'FunctionCall',
          callee: helperExpr,
          args,
          kwargs: {},
          line: (helperExpr as any).line,
          column: (helperExpr as any).column,
        } as any
      }
    }

    return expr
  }

  private parseExpressionAtom(): ExpressionNode {
    const token = this.peek()

    switch (token.type) {
      case HbsTokenType.STRING:
        this.advance()
        return {
          type: 'Literal',
          value: token.value,
          line: token.line,
          column: token.column,
        } as any

      case HbsTokenType.NUMBER:
        this.advance()
        return {
          type: 'Literal',
          value: parseFloat(token.value),
          line: token.line,
          column: token.column,
        } as any

      case HbsTokenType.BOOLEAN:
        this.advance()
        return {
          type: 'Literal',
          value: token.value === 'true',
          line: token.line,
          column: token.column,
        } as any

      case HbsTokenType.ID:
        return this.parsePath()

      case HbsTokenType.DOTDOT:
        this.advance()
        return { type: 'Name', name: '__parent__', line: token.line, column: token.column } as any

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

    // Handle @index, @key, @first, @last -> forloop equivalents
    if (first.value.startsWith('@')) {
      const loopVar = first.value.slice(1)
      const mapping: Record<string, string> = {
        index: 'forloop.counter0',
        key: 'forloop.key',
        first: 'forloop.first',
        last: 'forloop.last',
      }
      if (mapping[loopVar]) {
        const parts = mapping[loopVar].split('.')
        expr = { type: 'Name', name: parts[0], line: first.line, column: first.column } as any
        for (let i = 1; i < parts.length; i++) {
          expr = {
            type: 'GetAttr',
            object: expr,
            attribute: parts[i],
            line: first.line,
            column: first.column,
          } as any
        }
      }
    }

    // Handle path segments: foo.bar.baz or foo/bar/baz
    while (this.check(HbsTokenType.DOT) || this.check(HbsTokenType.SLASH)) {
      this.advance()
      if (this.check(HbsTokenType.ID)) {
        const attr = this.advance()
        expr = {
          type: 'GetAttr',
          object: expr,
          attribute: attr.value,
          line: attr.line,
          column: attr.column,
        } as any
      }
    }

    return expr
  }

  private checkOpenBlock(name: string): boolean {
    if (!this.check(HbsTokenType.OPEN)) return false
    const next = this.tokens[this.current + 1]
    return next?.type === HbsTokenType.ID && next.value === name
  }

  private consumeElse(): void {
    this.expect(HbsTokenType.OPEN)
    this.expect(HbsTokenType.ID) // 'else'
    this.expect(HbsTokenType.CLOSE)
  }

  private consumeEndBlock(): void {
    if (this.check(HbsTokenType.OPEN_END)) {
      this.advance()
      if (this.check(HbsTokenType.ID)) this.advance()
      if (this.check(HbsTokenType.CLOSE)) this.advance()
    }
  }

  private skipComment(): void {
    this.advance() // {{!
    while (!this.isAtEnd() && !this.check(HbsTokenType.CLOSE)) {
      this.advance()
    }
    if (this.check(HbsTokenType.CLOSE)) this.advance()
  }

  // Helpers
  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === HbsTokenType.EOF
  }

  private peek(): HbsToken {
    return this.tokens[this.current] || { type: HbsTokenType.EOF, value: '', line: 1, column: 1 }
  }

  private advance(): HbsToken {
    if (!this.isAtEnd()) this.current++
    return this.tokens[this.current - 1]
  }

  private check(type: HbsTokenType): boolean {
    return this.peek().type === type
  }

  private expect(type: HbsTokenType): HbsToken {
    if (this.check(type)) return this.advance()
    throw new Error(`Expected ${type} but got ${this.peek().type}`)
  }
}
