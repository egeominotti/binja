/**
 * Liquid Engine
 * Converts Liquid (Shopify) templates to binja's common AST format
 */

import { LiquidLexer } from './lexer'
import { LiquidParser } from './parser'
import type { TemplateNode } from '../../parser/nodes'

export { LiquidLexer, LiquidTokenType, type LiquidToken } from './lexer'
export { LiquidParser } from './parser'

/**
 * Parse a Liquid template string into an AST
 */
export function parse(source: string): TemplateNode {
  const lexer = new LiquidLexer(source)
  const tokens = lexer.tokenize()
  const parser = new LiquidParser(tokens, source)
  return parser.parse()
}

/**
 * Compile a Liquid template to a render function
 */
export function compile(source: string): (context: Record<string, any>) => Promise<string> {
  const ast = parse(source)

  // Import Runtime lazily to avoid circular deps
  const { Runtime } = require('../../runtime')
  const runtime = new Runtime()

  return async (context: Record<string, any>) => {
    return runtime.render(ast, context, source)
  }
}

/**
 * Render a Liquid template with context
 */
export async function render(source: string, context: Record<string, any> = {}): Promise<string> {
  const fn = compile(source)
  return fn(context)
}

/**
 * Engine interface for multi-engine support
 */
export const engine = {
  name: 'liquid',
  extensions: ['.liquid'],
  parse,
  compile,
  render,
}
