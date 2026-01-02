/**
 * Token types for Jinja2/DTL template lexer
 */
export enum TokenType {
  // Basic tokens
  TEXT = 'TEXT',
  EOF = 'EOF',

  // Delimiters
  VARIABLE_START = 'VARIABLE_START',     // {{
  VARIABLE_END = 'VARIABLE_END',         // }}
  BLOCK_START = 'BLOCK_START',           // {%
  BLOCK_END = 'BLOCK_END',               // %}
  COMMENT_START = 'COMMENT_START',       // {#
  COMMENT_END = 'COMMENT_END',           // #}

  // Literals
  NAME = 'NAME',                         // identifiers
  STRING = 'STRING',                     // "string" or 'string'
  NUMBER = 'NUMBER',                     // 123, 123.45

  // Operators
  DOT = 'DOT',                           // .
  COMMA = 'COMMA',                       // ,
  COLON = 'COLON',                       // :
  PIPE = 'PIPE',                         // |
  LPAREN = 'LPAREN',                     // (
  RPAREN = 'RPAREN',                     // )
  LBRACKET = 'LBRACKET',                 // [
  RBRACKET = 'RBRACKET',                 // ]
  LBRACE = 'LBRACE',                     // {
  RBRACE = 'RBRACE',                     // }

  // Comparison operators
  EQ = 'EQ',                             // ==
  NE = 'NE',                             // !=
  LT = 'LT',                             // <
  GT = 'GT',                             // >
  LE = 'LE',                             // <=
  GE = 'GE',                             // >=

  // Arithmetic operators
  ADD = 'ADD',                           // +
  SUB = 'SUB',                           // -
  MUL = 'MUL',                           // *
  DIV = 'DIV',                           // /
  MOD = 'MOD',                           // %

  // Logical operators
  AND = 'AND',                           // and
  OR = 'OR',                             // or
  NOT = 'NOT',                           // not

  // Special
  ASSIGN = 'ASSIGN',                     // =
  TILDE = 'TILDE',                       // ~
  QUESTION = 'QUESTION',                 // ?
  NULLCOALESCE = 'NULLCOALESCE',         // ??
}

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

export interface LexerState {
  source: string
  pos: number
  line: number
  column: number
  tokens: Token[]
}

// Keywords mapping
export const KEYWORDS: Record<string, TokenType> = {
  'and': TokenType.AND,
  'or': TokenType.OR,
  'not': TokenType.NOT,
  'true': TokenType.NAME,
  'false': TokenType.NAME,
  'True': TokenType.NAME,
  'False': TokenType.NAME,
  'None': TokenType.NAME,
  'none': TokenType.NAME,
  'is': TokenType.NAME,
  'in': TokenType.NAME,
}
