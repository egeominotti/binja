/**
 * AST Node definitions for Jinja2/DTL templates
 */

export type NodeType =
  | 'Template'
  | 'Text'
  | 'Output'
  | 'If'
  | 'For'
  | 'Block'
  | 'Extends'
  | 'Include'
  | 'Set'
  | 'With'
  | 'Macro'
  | 'Call'
  | 'Filter'
  | 'Comment'
  | 'Load'
  | 'Url'
  | 'Static'
  | 'Cache'
  | 'Now'
  // Django additional tags
  | 'Cycle'
  | 'Firstof'
  | 'Ifchanged'
  | 'Regroup'
  | 'Widthratio'
  | 'Lorem'
  | 'CsrfToken'
  | 'Debug'
  | 'Templatetag'
  // Expressions
  | 'Name'
  | 'Literal'
  | 'Array'
  | 'Object'
  | 'BinaryOp'
  | 'UnaryOp'
  | 'Compare'
  | 'GetAttr'
  | 'GetItem'
  | 'FilterExpr'
  | 'TestExpr'
  | 'Conditional'
  | 'FunctionCall'

export interface BaseNode {
  type: NodeType
  line: number
  column: number
}

// ==================== Template Structure ====================

export interface TemplateNode extends BaseNode {
  type: 'Template'
  body: ASTNode[]
}

export interface TextNode extends BaseNode {
  type: 'Text'
  value: string
}

export interface OutputNode extends BaseNode {
  type: 'Output'
  expression: ExpressionNode
}

// ==================== Control Flow ====================

export interface IfNode extends BaseNode {
  type: 'If'
  test: ExpressionNode
  body: ASTNode[]
  elifs: Array<{ test: ExpressionNode; body: ASTNode[] }>
  else_: ASTNode[]
}

export interface ForNode extends BaseNode {
  type: 'For'
  target: string | string[] // loop variable(s)
  iter: ExpressionNode // iterable
  body: ASTNode[]
  else_: ASTNode[] // {% empty %} or {% else %}
  recursive: boolean
}

// ==================== Template Inheritance ====================

export interface BlockNode extends BaseNode {
  type: 'Block'
  name: string
  body: ASTNode[]
  scoped: boolean
}

export interface ExtendsNode extends BaseNode {
  type: 'Extends'
  template: ExpressionNode
}

export interface IncludeNode extends BaseNode {
  type: 'Include'
  template: ExpressionNode
  context: Record<string, ExpressionNode> | null // {% include ... with x=y %}
  only: boolean // {% include ... only %}
  ignoreMissing: boolean
}

// ==================== Variables ====================

export interface SetNode extends BaseNode {
  type: 'Set'
  target: string
  value: ExpressionNode
}

export interface WithNode extends BaseNode {
  type: 'With'
  assignments: Array<{ target: string; value: ExpressionNode }>
  body: ASTNode[]
}

// ==================== Django-specific Tags ====================

export interface LoadNode extends BaseNode {
  type: 'Load'
  names: string[] // {% load static humanize %}
}

export interface UrlNode extends BaseNode {
  type: 'Url'
  name: ExpressionNode
  args: ExpressionNode[]
  kwargs: Record<string, ExpressionNode>
  asVar: string | null // {% url 'name' as var %}
}

export interface StaticNode extends BaseNode {
  type: 'Static'
  path: ExpressionNode
  asVar: string | null
}

export interface CacheNode extends BaseNode {
  type: 'Cache'
  timeout: ExpressionNode
  fragment: ExpressionNode
  varyOn: ExpressionNode[]
  body: ASTNode[]
}

export interface NowNode extends BaseNode {
  type: 'Now'
  format: ExpressionNode
  asVar: string | null
}

// ==================== Django Additional Tags ====================

export interface CycleNode extends BaseNode {
  type: 'Cycle'
  values: ExpressionNode[]
  asVar: string | null
  silent: boolean
}

export interface FirstofNode extends BaseNode {
  type: 'Firstof'
  values: ExpressionNode[]
  fallback: ExpressionNode | null
  asVar: string | null
}

export interface IfchangedNode extends BaseNode {
  type: 'Ifchanged'
  values: ExpressionNode[]
  body: ASTNode[]
  else_: ASTNode[]
}

export interface RegroupNode extends BaseNode {
  type: 'Regroup'
  target: ExpressionNode
  key: string
  asVar: string
}

export interface WidthratioNode extends BaseNode {
  type: 'Widthratio'
  value: ExpressionNode
  maxValue: ExpressionNode
  maxWidth: ExpressionNode
  asVar: string | null
}

export interface LoremNode extends BaseNode {
  type: 'Lorem'
  count: ExpressionNode | null
  method: 'w' | 'p' | 'b' // words, paragraphs, or plain/blocked
  random: boolean
}

export interface CsrfTokenNode extends BaseNode {
  type: 'CsrfToken'
}

export interface DebugNode extends BaseNode {
  type: 'Debug'
}

export interface TemplatetagNode extends BaseNode {
  type: 'Templatetag'
  tagType:
    | 'openblock'
    | 'closeblock'
    | 'openvariable'
    | 'closevariable'
    | 'openbrace'
    | 'closebrace'
    | 'opencomment'
    | 'closecomment'
}

// ==================== Expressions ====================

export interface NameNode extends BaseNode {
  type: 'Name'
  name: string
}

export interface LiteralNode extends BaseNode {
  type: 'Literal'
  value: string | number | boolean | null
}

export interface ArrayNode extends BaseNode {
  type: 'Array'
  elements: ExpressionNode[]
}

export interface ObjectNode extends BaseNode {
  type: 'Object'
  pairs: Array<{ key: ExpressionNode; value: ExpressionNode }>
}

export interface BinaryOpNode extends BaseNode {
  type: 'BinaryOp'
  operator: string
  left: ExpressionNode
  right: ExpressionNode
}

export interface UnaryOpNode extends BaseNode {
  type: 'UnaryOp'
  operator: string
  operand: ExpressionNode
}

export interface CompareNode extends BaseNode {
  type: 'Compare'
  left: ExpressionNode
  ops: Array<{ operator: string; right: ExpressionNode }>
}

export interface GetAttrNode extends BaseNode {
  type: 'GetAttr'
  object: ExpressionNode
  attribute: string
}

export interface GetItemNode extends BaseNode {
  type: 'GetItem'
  object: ExpressionNode
  index: ExpressionNode
}

export interface FilterExprNode extends BaseNode {
  type: 'FilterExpr'
  node: ExpressionNode
  filter: string
  args: ExpressionNode[]
  kwargs: Record<string, ExpressionNode>
}

export interface TestExprNode extends BaseNode {
  type: 'TestExpr'
  node: ExpressionNode
  test: string
  args: ExpressionNode[]
  negated: boolean
}

export interface ConditionalNode extends BaseNode {
  type: 'Conditional'
  test: ExpressionNode
  trueExpr: ExpressionNode
  falseExpr: ExpressionNode
}

export interface FunctionCallNode extends BaseNode {
  type: 'FunctionCall'
  callee: ExpressionNode
  args: ExpressionNode[]
  kwargs: Record<string, ExpressionNode>
}

export interface CommentNode extends BaseNode {
  type: 'Comment'
  value: string
}

export interface MacroNode extends BaseNode {
  type: 'Macro'
  name: string
  args: string[]
  defaults: Record<string, ExpressionNode>
  body: ASTNode[]
}

export interface CallNode extends BaseNode {
  type: 'Call'
  call: ExpressionNode
  args: ExpressionNode[]
  kwargs: Record<string, ExpressionNode>
  body: ASTNode[]
}

export interface FilterNode extends BaseNode {
  type: 'Filter'
  filter: string
  body: ASTNode[]
}

// ==================== Type Unions ====================

export type ExpressionNode =
  | NameNode
  | LiteralNode
  | ArrayNode
  | ObjectNode
  | BinaryOpNode
  | UnaryOpNode
  | CompareNode
  | GetAttrNode
  | GetItemNode
  | FilterExprNode
  | TestExprNode
  | ConditionalNode
  | FunctionCallNode

export type StatementNode =
  | TextNode
  | OutputNode
  | IfNode
  | ForNode
  | BlockNode
  | ExtendsNode
  | IncludeNode
  | SetNode
  | WithNode
  | LoadNode
  | UrlNode
  | StaticNode
  | CacheNode
  | NowNode
  | CommentNode
  | MacroNode
  | CallNode
  | FilterNode
  // Django additional tags
  | CycleNode
  | FirstofNode
  | IfchangedNode
  | RegroupNode
  | WidthratioNode
  | LoremNode
  | CsrfTokenNode
  | DebugNode
  | TemplatetagNode

export type ASTNode = StatementNode | ExpressionNode | TemplateNode
