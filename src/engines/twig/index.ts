/**
 * Twig Engine
 * PHP/Symfony compatible template engine
 *
 * Twig is nearly identical to Jinja2 with a few syntax differences:
 * - Ternary: cond ? x : y (instead of x if cond else y)
 * - Null coalesce: x ?? y
 * - Some filter name differences (e -> escape, raw -> safe)
 */

import { TwigLexer } from './lexer'
import { TwigParser, TWIG_FILTER_MAP } from './parser'
import { Runtime } from '../../runtime'
import type { TemplateNode } from '../../parser/nodes'

export { TwigLexer } from './lexer'
export { TwigParser, TWIG_FILTER_MAP } from './parser'

/**
 * Parse a Twig template string into an AST
 */
export function parse(source: string): TemplateNode {
  const lexer = new TwigLexer(source)
  const tokens = lexer.tokenize()
  const parser = new TwigParser(tokens, source)
  return parser.parse()
}

/**
 * Compile a Twig template to a render function
 */
export function compile(source: string): (context: Record<string, any>) => Promise<string> {
  const ast = parse(source)
  const runtime = new Runtime()
  return async (context: Record<string, any>) => runtime.render(ast, context)
}

/**
 * Render a Twig template with the given context
 */
export async function render(source: string, context: Record<string, any> = {}): Promise<string> {
  const ast = parse(source)
  const runtime = new Runtime()
  return runtime.render(ast, context)
}

/**
 * Engine descriptor for MultiEngine
 */
export const engine = {
  name: 'twig',
  extensions: ['.twig', '.html.twig'],
  parse,
  compile,
  render,
}
