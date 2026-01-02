/**
 * Handlebars Engine
 * Converts Handlebars templates to binja's common AST format
 */

import { HandlebarsLexer } from './lexer'
import { HandlebarsParser } from './parser'
import type { TemplateNode } from '../../parser/nodes'

export { HandlebarsLexer, HbsTokenType, type HbsToken } from './lexer'
export { HandlebarsParser } from './parser'

/**
 * Parse a Handlebars template string into an AST
 */
export function parse(source: string): TemplateNode {
  const lexer = new HandlebarsLexer(source)
  const tokens = lexer.tokenize()
  const parser = new HandlebarsParser(tokens, source)
  return parser.parse()
}

/**
 * Compile a Handlebars template to a render function
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
 * Render a Handlebars template with context
 */
export async function render(source: string, context: Record<string, any> = {}): Promise<string> {
  const fn = compile(source)
  return fn(context)
}

/**
 * Engine interface for multi-engine support
 */
export const engine = {
  name: 'handlebars',
  extensions: ['.hbs', '.handlebars'],
  parse,
  compile,
  render,
}
