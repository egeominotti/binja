/**
 * Twig Parser
 * Extends the Jinja2 parser with Twig-specific syntax
 *
 * Key differences from Jinja2:
 * - Ternary: cond ? x : y (instead of x if cond else y)
 * - Null coalesce: x ?? y
 * - Some filter name differences
 */

import { Parser } from '../../parser'
import type { Token } from '../../lexer/tokens'
import type { TemplateNode } from '../../parser/nodes'

// Twig filter name mappings to Jinja2 equivalents
export const TWIG_FILTER_MAP: Record<string, string> = {
  e: 'escape',
  raw: 'safe',
  nl2br: 'linebreaksbr',
  number_format: 'floatformat',
  striptags: 'striptags',
  json_encode: 'json',
  merge: 'merge',
  keys: 'keys',
  column: 'map',
}

export class TwigParser extends Parser {
  constructor(tokens: Token[], source: string = '') {
    super(tokens, source)
  }

  parse(): TemplateNode {
    // Use base parser, then transform AST for Twig specifics
    const ast = super.parse()
    return this.transformTwigAST(ast)
  }

  private transformTwigAST(node: TemplateNode): TemplateNode {
    // Transform the AST to handle Twig-specific constructs
    return {
      ...node,
      body: node.body.map((n) => this.transformNode(n)),
    }
  }

  private transformNode(node: any): any {
    if (!node || typeof node !== 'object') return node

    // Handle ternary expressions from ? : tokens
    if (node.type === 'Conditional') {
      return {
        ...node,
        test: this.transformNode(node.test),
        trueExpr: this.transformNode(node.trueExpr),
        falseExpr: this.transformNode(node.falseExpr),
      }
    }

    // Map Twig filter names to Jinja2 equivalents
    if (node.type === 'FilterExpr') {
      const mappedFilter = TWIG_FILTER_MAP[node.filter] || node.filter
      return {
        ...node,
        filter: mappedFilter,
        node: this.transformNode(node.node),
        args: node.args?.map((a: any) => this.transformNode(a)) || [],
      }
    }

    // Recursively transform child nodes
    if (node.body) {
      node.body = Array.isArray(node.body)
        ? node.body.map((n: any) => this.transformNode(n))
        : this.transformNode(node.body)
    }
    if (node.else_) {
      node.else_ = Array.isArray(node.else_)
        ? node.else_.map((n: any) => this.transformNode(n))
        : this.transformNode(node.else_)
    }
    if (node.expression) {
      node.expression = this.transformNode(node.expression)
    }
    if (node.test) {
      node.test = this.transformNode(node.test)
    }
    if (node.elifs) {
      node.elifs = node.elifs.map((elif: any) => ({
        ...elif,
        test: this.transformNode(elif.test),
        body: elif.body.map((n: any) => this.transformNode(n)),
      }))
    }
    if (node.iter) {
      node.iter = this.transformNode(node.iter)
    }
    if (node.left) {
      node.left = this.transformNode(node.left)
    }
    if (node.right) {
      node.right = this.transformNode(node.right)
    }
    if (node.object) {
      node.object = this.transformNode(node.object)
    }
    if (node.operand) {
      node.operand = this.transformNode(node.operand)
    }
    if (node.args) {
      node.args = node.args.map((a: any) => this.transformNode(a))
    }

    return node
  }
}
