/**
 * Twig Lexer
 * Tokenizes Twig template syntax (very similar to Jinja2)
 * PHP/Symfony compatible implementation
 *
 * Twig is nearly identical to Jinja2, so we extend the base lexer
 * and add Twig-specific token handling.
 */

import { Lexer, TokenType } from '../../lexer'
import type { Token } from '../../lexer/tokens'

export { TokenType }
export type { Token }

export class TwigLexer extends Lexer {
  constructor(source: string) {
    super(source)
  }

  // Twig uses the same tokenization as Jinja2
  // The ? and ?? operators are already handled by the base lexer
}
