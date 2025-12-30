/**
 * Template Flattener - Resolves template inheritance at compile-time
 *
 * This module flattens template inheritance chains (extends/include/block)
 * into a single AST that can be compiled to AOT JavaScript.
 *
 * Requirements:
 * - extends/include must use static string literals (not variables)
 * - Template loader must be provided to resolve template names
 */

import type {
  ASTNode,
  TemplateNode,
  BlockNode,
  ExtendsNode,
  IncludeNode,
  ExpressionNode,
  LiteralNode,
  IfNode,
  ForNode,
  WithNode,
} from '../parser/nodes'

export interface TemplateLoader {
  /** Load template source by name (sync for compile-time resolution) */
  load(name: string): string
  /** Parse template source to AST */
  parse(source: string): TemplateNode
}

export interface FlattenOptions {
  /** Template loader for resolving extends/include */
  loader: TemplateLoader
  /** Maximum inheritance depth (default: 10) */
  maxDepth?: number
}

/**
 * Flatten a template AST by resolving all extends/include/block tags
 * Returns a new AST with no inheritance - ready for AOT compilation
 */
export function flattenTemplate(ast: TemplateNode, options: FlattenOptions): TemplateNode {
  const flattener = new TemplateFlattener(options)
  return flattener.flatten(ast)
}

/**
 * Check if a template can be flattened (all extends/include are static)
 */
export function canFlatten(ast: TemplateNode): { canFlatten: boolean; reason?: string } {
  const checker = new StaticChecker()
  return checker.check(ast)
}

class TemplateFlattener {
  private loader: TemplateLoader
  private maxDepth: number
  private blocks: Map<string, BlockNode> = new Map()
  private depth = 0

  constructor(options: FlattenOptions) {
    this.loader = options.loader
    this.maxDepth = options.maxDepth ?? 10
  }

  flatten(ast: TemplateNode): TemplateNode {
    this.blocks.clear()
    this.depth = 0
    return this.processTemplate(ast)
  }

  private processTemplate(ast: TemplateNode, isChild = true): TemplateNode {
    if (this.depth > this.maxDepth) {
      throw new Error(`Maximum template inheritance depth (${this.maxDepth}) exceeded`)
    }

    // First pass: collect blocks from this template
    // Child blocks (override=true) take precedence over parent blocks (override=false)
    this.collectBlocks(ast.body, isChild)

    // Check for extends
    const extendsNode = this.findExtends(ast.body)

    if (extendsNode) {
      // Load and process parent template
      const parentName = this.getStaticTemplateName(extendsNode.template)
      const parentSource = this.loader.load(parentName)
      const parentAst = this.loader.parse(parentSource)

      this.depth++
      // Process parent with isChild=false so its blocks don't override child blocks
      const flattenedParent = this.processTemplate(parentAst, false)
      this.depth--

      // Replace blocks in parent with child blocks
      return {
        type: 'Template',
        body: this.replaceBlocks(flattenedParent.body),
        line: ast.line,
        column: ast.column,
      }
    }

    // No extends - process includes and blocks in place
    return {
      type: 'Template',
      body: this.processNodes(ast.body),
      line: ast.line,
      column: ast.column,
    }
  }

  private collectBlocks(nodes: ASTNode[], override = true): void {
    for (const node of nodes) {
      if (node.type === 'Block') {
        const block = node as BlockNode
        // Only set if override=true OR block doesn't exist yet
        // Child blocks (collected first) should NOT be overwritten by parent
        if (override || !this.blocks.has(block.name)) {
          this.blocks.set(block.name, block)
        }
      }
      // Also collect from nested structures
      this.collectBlocksFromNode(node, override)
    }
  }

  private collectBlocksFromNode(node: ASTNode, override = true): void {
    switch (node.type) {
      case 'If': {
        const ifNode = node as IfNode
        this.collectBlocks(ifNode.body, override)
        for (const elif of ifNode.elifs) {
          this.collectBlocks(elif.body, override)
        }
        this.collectBlocks(ifNode.else_, override)
        break
      }
      case 'For': {
        const forNode = node as ForNode
        this.collectBlocks(forNode.body, override)
        this.collectBlocks(forNode.else_, override)
        break
      }
      case 'With': {
        const withNode = node as WithNode
        this.collectBlocks(withNode.body, override)
        break
      }
      case 'Block': {
        const blockNode = node as BlockNode
        this.collectBlocks(blockNode.body, override)
        break
      }
    }
  }

  private findExtends(nodes: ASTNode[]): ExtendsNode | null {
    for (const node of nodes) {
      if (node.type === 'Extends') {
        return node as ExtendsNode
      }
    }
    return null
  }

  private processNodes(nodes: ASTNode[]): ASTNode[] {
    const result: ASTNode[] = []

    for (const node of nodes) {
      if (node.type === 'Extends') {
        // Skip extends in output (already processed)
        continue
      }

      if (node.type === 'Include') {
        // Inline the included template
        const includeNode = node as IncludeNode
        const inlined = this.inlineInclude(includeNode)
        result.push(...inlined)
        continue
      }

      if (node.type === 'Block') {
        // Use child block if available, otherwise use this block's content
        const block = node as BlockNode
        const childBlock = this.blocks.get(block.name)
        if (childBlock && childBlock !== block) {
          // Child block overrides parent - process its body
          result.push(...this.processNodes(childBlock.body))
        } else {
          // Use this block's content
          result.push(...this.processNodes(block.body))
        }
        continue
      }

      // Process nested nodes
      const processed = this.processNode(node)
      if (processed) {
        result.push(processed)
      }
    }

    return result
  }

  private processNode(node: ASTNode): ASTNode | null {
    switch (node.type) {
      case 'If': {
        const ifNode = node as IfNode
        return {
          ...ifNode,
          body: this.processNodes(ifNode.body),
          elifs: ifNode.elifs.map(elif => ({
            test: elif.test,
            body: this.processNodes(elif.body),
          })),
          else_: this.processNodes(ifNode.else_),
        }
      }
      case 'For': {
        const forNode = node as ForNode
        return {
          ...forNode,
          body: this.processNodes(forNode.body),
          else_: this.processNodes(forNode.else_),
        }
      }
      case 'With': {
        const withNode = node as WithNode
        return {
          ...withNode,
          body: this.processNodes(withNode.body),
        }
      }
      default:
        return node
    }
  }

  private replaceBlocks(nodes: ASTNode[]): ASTNode[] {
    return this.processNodes(nodes)
  }

  private inlineInclude(node: IncludeNode): ASTNode[] {
    const templateName = this.getStaticTemplateName(node.template)

    try {
      const source = this.loader.load(templateName)
      const ast = this.loader.parse(source)

      this.depth++
      const flattened = this.processTemplate(ast)
      this.depth--

      // If include has context variables, wrap in With node
      if (node.context && Object.keys(node.context).length > 0) {
        const withNode: WithNode = {
          type: 'With',
          assignments: Object.entries(node.context).map(([target, value]) => ({
            target,
            value,
          })),
          body: flattened.body,
          line: node.line,
          column: node.column,
        }
        return [withNode]
      }

      return flattened.body
    } catch (error) {
      if (node.ignoreMissing) {
        return []
      }
      throw error
    }
  }

  private getStaticTemplateName(expr: ExpressionNode): string {
    if (expr.type === 'Literal') {
      const literal = expr as LiteralNode
      if (typeof literal.value === 'string') {
        return literal.value
      }
    }
    throw new Error(
      `AOT compilation requires static template names. ` +
      `Found dynamic expression at line ${expr.line}. ` +
      `Use Environment.render() for dynamic template names.`
    )
  }
}

class StaticChecker {
  check(ast: TemplateNode): { canFlatten: boolean; reason?: string } {
    return this.checkNodes(ast.body)
  }

  private checkNodes(nodes: ASTNode[]): { canFlatten: boolean; reason?: string } {
    for (const node of nodes) {
      const result = this.checkNode(node)
      if (!result.canFlatten) {
        return result
      }
    }
    return { canFlatten: true }
  }

  private checkNode(node: ASTNode): { canFlatten: boolean; reason?: string } {
    switch (node.type) {
      case 'Extends': {
        const extendsNode = node as ExtendsNode
        if (!this.isStaticName(extendsNode.template)) {
          return {
            canFlatten: false,
            reason: `Dynamic extends at line ${node.line} - use static string literal`,
          }
        }
        break
      }
      case 'Include': {
        const includeNode = node as IncludeNode
        if (!this.isStaticName(includeNode.template)) {
          return {
            canFlatten: false,
            reason: `Dynamic include at line ${node.line} - use static string literal`,
          }
        }
        break
      }
      case 'If': {
        const ifNode = node as IfNode
        let result = this.checkNodes(ifNode.body)
        if (!result.canFlatten) return result
        for (const elif of ifNode.elifs) {
          result = this.checkNodes(elif.body)
          if (!result.canFlatten) return result
        }
        result = this.checkNodes(ifNode.else_)
        if (!result.canFlatten) return result
        break
      }
      case 'For': {
        const forNode = node as ForNode
        let result = this.checkNodes(forNode.body)
        if (!result.canFlatten) return result
        result = this.checkNodes(forNode.else_)
        if (!result.canFlatten) return result
        break
      }
      case 'With': {
        const withNode = node as WithNode
        const result = this.checkNodes(withNode.body)
        if (!result.canFlatten) return result
        break
      }
      case 'Block': {
        const blockNode = node as BlockNode
        const result = this.checkNodes(blockNode.body)
        if (!result.canFlatten) return result
        break
      }
    }
    return { canFlatten: true }
  }

  private isStaticName(expr: ExpressionNode): boolean {
    return expr.type === 'Literal' && typeof (expr as LiteralNode).value === 'string'
  }
}
