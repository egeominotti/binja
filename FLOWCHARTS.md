# Binja Template Engine - Architecture Flowcharts

This document describes the architecture and processing flows of the binja template engine.

## Table of Contents

1. [Main Processing Pipeline](#1-main-template-processing-pipeline)
2. [Lexer Flow](#2-lexer-flow-tokenization)
3. [Token Types](#3-token-types)
4. [Parser Flow](#4-parser-flow-ast-generation)
5. [AST Node Structure](#5-ast-node-structure)
6. [Runtime Flow](#6-runtime-flow-execution)
7. [Context and ForLoop](#7-context-and-forloop)
8. [Compiler Flow](#8-compiler-flow-aot)
9. [Multi-Engine Architecture](#9-multi-engine-architecture)
10. [AI Linting Flow](#10-ai-linting-flow)
11. [Debug Panel Flow](#11-debug-panel-flow)
12. [Component Connections Overview](#12-component-connections-overview)

---

## 1. Main Template Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BINJA TEMPLATE ENGINE                            │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐    ┌────────┐
│   Template   │───▶│  LEXER   │───▶│  PARSER  │───▶│ RUNTIME │───▶│ Output │
│   String     │    │          │    │          │    │         │    │ String │
└──────────────┘    └──────────┘    └──────────┘    └─────────┘    └────────┘
                         │               │               │
                         ▼               ▼               ▼
                    ┌─────────┐    ┌─────────┐    ┌──────────┐
                    │ Token[] │    │   AST   │    │ Context  │
                    └─────────┘    └─────────┘    └──────────┘
```

**Description**: The template engine processes template strings through three main phases:
- **Lexer**: Tokenizes the string into individual tokens
- **Parser**: Builds an Abstract Syntax Tree (AST) from tokens
- **Runtime**: Executes the AST with a context to produce the final output

---

## 2. Lexer Flow (Tokenization)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            LEXER FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────┐
                        │ Template String │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  scanToken()    │◀──────────────────┐
                        └────────┬────────┘                   │
                                 │                            │
            ┌────────────────────┼────────────────────┐       │
            ▼                    ▼                    ▼       │
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐ │
    │ Text Content  │   │   {{ ... }}   │   │   {% ... %}   │ │
    │ (no delims)   │   │  (Variable)   │   │   (Block)     │ │
    └───────┬───────┘   └───────┬───────┘   └───────┬───────┘ │
            │                   │                   │         │
            ▼                   ▼                   ▼         │
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐ │
    │  scanText()   │   │scanExpression │   │scanExpression │ │
    └───────┬───────┘   └───────┬───────┘   └───────┬───────┘ │
            │                   │                   │         │
            │     ┌─────────────┴─────────────┐     │         │
            │     ▼                           ▼     │         │
            │ ┌─────────┐ ┌─────────┐ ┌──────────┐  │         │
            │ │scanName │ │scanNum  │ │scanString│  │         │
            │ └────┬────┘ └────┬────┘ └────┬─────┘  │         │
            │      │           │           │        │         │
            ▼      ▼           ▼           ▼        ▼         │
        ┌──────────────────────────────────────────────┐      │
        │                 Token                        │      │
        │  { type, value, line, column }               │──────┘
        └──────────────────────────────────────────────┘
                                 │
                          (loop until EOF)
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    Token[]      │
                        └─────────────────┘
```

**Main Scanner Methods**:
- `scanToken()` - Dispatcher that detects delimiter type
- `scanText()` - Captures literal text until next delimiter
- `scanExpression()` - Processes content between delimiters
- `scanRawBlock()` - Special handler for `{% raw %}...{% endraw %}`
- `scanString()` - Processes quoted strings with escape handling
- `scanNumber()` - Parses integers and decimals
- `scanIdentifier()` - Captures NAME tokens, checks KEYWORDS

---

## 3. Token Types

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TOKEN TYPES                                    │
└─────────────────────────────────────────────────────────────────────────┘

  DELIMITERS              LITERALS             OPERATORS
  ────────────            ─────────            ──────────
  ├─ VARIABLE_START {{    ├─ NAME              ├─ PIPE     |
  ├─ VARIABLE_END   }}    ├─ STRING            ├─ DOT      .
  ├─ BLOCK_START    {%    ├─ NUMBER            ├─ COMMA    ,
  ├─ BLOCK_END      %}                         ├─ COLON    :
  ├─ COMMENT_START  {#    COMPARISON           ├─ ADD      +
  └─ COMMENT_END    #}    ──────────           ├─ SUB      -
                          ├─ EQ  ==            ├─ MUL      *
  PUNCTUATION             ├─ NE  !=            ├─ DIV      /
  ────────────            ├─ LT  <             └─ MOD      %
  ├─ LPAREN  (            ├─ GT  >
  ├─ RPAREN  )            ├─ LE  <=            LOGICAL
  ├─ LBRACKET [           └─ GE  >=            ───────
  ├─ RBRACKET ]                                ├─ AND
  ├─ LBRACE  {            SPECIAL              ├─ OR
  └─ RBRACE  }            ───────              └─ NOT
                          ├─ ASSIGN  =
                          ├─ TILDE   ~
                          └─ NULLCOALESCE ??
```

---

## 4. Parser Flow (AST Generation)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PARSER FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────┐
                        │    Token[]      │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    parse()      │
                        └────────┬────────┘
                                 │
                                 ▼
                    ┌───────────────────────┐
           ┌───────│   parseStatement()    │◀─────────┐
           │       └───────────┬───────────┘          │
           │                   │                      │
           │    ┌──────────────┼──────────────┐       │
           │    ▼              ▼              ▼       │
           │ ┌──────┐    ┌───────────┐   ┌─────────┐  │
           │ │ TEXT │    │VAR_START  │   │BLK_START│  │
           │ └──┬───┘    └─────┬─────┘   └────┬────┘  │
           │    │              │              │       │
           │    ▼              ▼              ▼       │
           │ ┌──────┐    ┌───────────┐   ┌─────────┐  │
           │ │Text  │    │parseOutput│   │parseBlk │  │
           │ │Node  │    └─────┬─────┘   └────┬────┘  │
           │ └──────┘          │              │       │
           │                   │    ┌─────────┴───────┐
           │                   │    ▼                 ▼
           │                   │ ┌─────┐         ┌──────────┐
           │                   │ │ if  │────────▶│ If Node  │
           │                   │ ├─────┤         ├──────────┤
           │                   │ │ for │────────▶│ For Node │
           │                   │ ├─────┤         ├──────────┤
           │                   │ │block│────────▶│Block Node│
           │                   │ ├─────┤         ├──────────┤
           │                   │ │ set │────────▶│ Set Node │
           │                   │ ├─────┤         ├──────────┤
           │                   │ │with │────────▶│With Node │
           │                   │ └─────┘         └──────────┘
           │                   │
           │                   ▼
           │             ┌───────────┐
           │             │parseExpr()│
           │             └─────┬─────┘
           │                   │
           │      ┌────────────┼────────────┐
           │      ▼            ▼            ▼
           │ ┌─────────┐  ┌─────────┐  ┌──────────┐
           │ │ Name    │  │ Literal │  │FilterExpr│
           │ │ GetAttr │  │ Array   │  │ BinaryOp │
           │ │ GetItem │  │ Object  │  │ Compare  │
           │ └─────────┘  └─────────┘  └──────────┘
           │
           │                   │
           └───────────────────┤
                               │
                               ▼
                        ┌─────────────────┐
                        │   Template      │
                        │   { body: [] }  │
                        └─────────────────┘
```

**Main Parser Methods**:
- `parse()` - Entry point: calls parseStatement() in loop
- `parseStatement()` - Routes token to specific parser
- `parseText()` / `parseOutput()` / `parseBlock()` - Node-type parsers
- `parseExpression()` - Expression parser with operator precedence
- `parseFilter()` - Filter chain: `value|filter:arg|filter2`
- `parseComparison()` / `parseLogical()` - Operator precedence handling

---

## 5. AST Node Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AST NODE TYPES                                 │
└─────────────────────────────────────────────────────────────────────────┘

  TEMPLATE STRUCTURE          CONTROL FLOW              INHERITANCE
  ──────────────────          ────────────              ───────────
  Template                    If                        Block
  ├─ body: ASTNode[]          ├─ test: Expr            ├─ name: string
                              ├─ body: Node[]          ├─ body: Node[]
  Text                        ├─ elifs: {test,body}[]  └─ scoped: bool
  ├─ value: string            └─ else_: Node[]
                                                       Extends
  Output                      For                      ├─ template: Expr
  ├─ expression: Expr         ├─ target: string
                              ├─ iter: Expr            Include
                              ├─ body: Node[]          ├─ template: Expr
                              ├─ else_: Node[]         ├─ context: Expr
                              └─ recursive: bool       └─ only: bool

  EXPRESSIONS                 OPERATIONS               DJANGO TAGS
  ───────────                 ──────────               ───────────
  Name {value}                BinaryOp                 Url, Static
  Literal {value, raw}        ├─ left: Expr            Set, With
  GetAttr {object, attr}      ├─ op: string            Load, Now
  GetItem {object, index}     └─ right: Expr           Cycle, Lorem
  Array {items[]}                                      CsrfToken
  Object {pairs[]}            Compare                  Regroup
  Conditional                 ├─ left: Expr            Widthratio
  ├─ test, body, else_        └─ ops: {op, right}[]
  FilterExpr                  UnaryOp
  ├─ node, filter, args[]     ├─ op, node
```

**Total**: 48 AST node types

---

## 6. Runtime Flow (Execution)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          RUNTIME FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

                     ┌─────────────────────────┐
                     │   render(ast, context)  │
                     └───────────┬─────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │templateNeedsAsync(ast)?│
                    └───────────┬────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
    ┌──────────────────┐                ┌──────────────────┐
    │   SYNC PATH      │                │   ASYNC PATH     │
    │ (No inheritance) │                │ (Has extends/    │
    │                  │                │  include)        │
    └────────┬─────────┘                └────────┬─────────┘
             │                                   │
             ▼                                   ▼
    ┌──────────────────┐                ┌──────────────────┐
    │collectBlocksSync │                │ collectBlocks()  │
    └────────┬─────────┘                └────────┬─────────┘
             │                                   │
             ▼                                   ▼
    ┌──────────────────┐                ┌──────────────────┐
    │renderTemplateSync│                │resolveExtends()  │
    └────────┬─────────┘                │  (load parent)   │
             │                          └────────┬─────────┘
             │                                   │
             │                                   ▼
             │                          ┌──────────────────┐
             │                          │ merge blocks     │
             │                          │ render parent    │
             │                          └────────┬─────────┘
             │                                   │
             └───────────────┬───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  renderNode()   │◀─────────────────┐
                    └────────┬────────┘                  │
                             │                           │
        ┌──────────────┬─────┴─────┬──────────────┐      │
        ▼              ▼           ▼              ▼      │
    ┌───────┐    ┌──────────┐ ┌────────┐    ┌────────┐   │
    │ Text  │    │  Output  │ │   If   │    │  For   │   │
    └───┬───┘    └────┬─────┘ └───┬────┘    └───┬────┘   │
        │             │           │             │        │
        ▼             ▼           ▼             ▼        │
    ┌───────┐    ┌──────────┐ ┌────────┐    ┌────────┐   │
    │return │    │evalExpr()│ │evalTest│    │iterate │   │
    │ value │    │  + filter│ │render  │    │ForLoop │   │
    └───────┘    │  + escape│ │body    │    │context │───┘
                 └──────────┘ └────────┘    └────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Output String  │
                    └─────────────────┘
```

**Two Execution Paths**:

1. **SYNC PATH** (Fast - no async overhead):
   - `templateNeedsAsync()` checks if tree contains Extends/Include
   - If false: `collectBlocksSync()` → `renderTemplateSync()`
   - Direct node rendering without Promise overhead

2. **ASYNC PATH** (Fallback for inheritance):
   - `collectBlocks()` - async block collection
   - `renderTemplateAsync()` - processes Extends nodes
   - Resolves parent template, replaces blocks, renders parent

---

## 7. Context and ForLoop

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CONTEXT & FORLOOP STRUCTURE                         │
└─────────────────────────────────────────────────────────────────────────┘

  CONTEXT CLASS                           FORLOOP OBJECT (DTL)
  ─────────────                           ────────────────────
  ┌────────────────────────┐              ┌────────────────────────┐
  │ scopes: Object[]       │              │ counter    (1-indexed) │
  │   [0]: globals         │              │ counter0   (0-indexed) │
  │   [1]: render context  │              │ revcounter             │
  │   [2]: loop scope      │              │ revcounter0            │
  │   ...                  │              │ first      (boolean)   │
  │                        │              │ last       (boolean)   │
  │ get(name) ─────────────┼──▶ lookup    │ length                 │
  │ set(name, value) ──────┼──▶ current   │ depth / depth0         │
  │ push() ────────────────┼──▶ new scope │ parentloop             │
  │ pop() ─────────────────┼──▶ exit      │ cycle(...args)         │
  └────────────────────────┘              │ changed(val)           │
                                          │ previtem / nextitem    │
  VARIABLE LOOKUP                         └────────────────────────┘
  ───────────────
  {{ user.name }}                         LOOP ALIASES (Jinja2)
       │                                  ──────────────────────
       ▼                                  loop.index  = counter
  ┌───────────────┐                       loop.index0 = counter0
  │ ctx.get('user')                       loop.first  = first
  │   scope[1].user                       loop.last   = last
  │     = { name: 'John' }                loop.length = length
  └───────────────┘
       │
       ▼
  ┌───────────────┐
  │ GetAttr 'name'│
  │   → 'John'    │
  └───────────────┘
```

**ForLoop Properties**:
- `counter` / `counter0` - 1-indexed / 0-indexed counter
- `revcounter` / `revcounter0` - Reverse counters
- `first` / `last` - Boolean flags
- `length` - Array length
- `depth` / `depth0` - Nesting depth
- `parentloop` - Reference to parent loop
- `cycle(...args)` - Round-robin through arguments
- `changed(val)` - Track value changes

---

## 8. Compiler Flow (AOT)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPILER FLOW (AOT)                             │
└─────────────────────────────────────────────────────────────────────────┘

                     ┌─────────────────────────┐
                     │   compile(source) OR    │
                     │compileWithInheritance() │
                     └───────────┬─────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
           ┌────────────────┐        ┌────────────────┐
           │   Simple AST   │        │ Has Extends/   │
           │ (no inheritance)        │    Include     │
           └───────┬────────┘        └───────┬────────┘
                   │                         │
                   │                         ▼
                   │                ┌────────────────┐
                   │                │TemplateFlattener
                   │                │ flattenTemplate()
                   │                └───────┬────────┘
                   │                        │
                   │    ┌───────────────────┘
                   │    │
                   │    │  1. canFlatten() check
                   │    │  2. collect child blocks
                   │    │  3. load parent template
                   │    │  4. replace parent blocks
                   │    │  5. recursive for grandparent
                   │    │
                   │    ▼
                   │ ┌────────────────┐
                   │ │  Flattened AST │
                   │ │ (no Extends/   │
                   │ │  Include nodes)│
                   │ └───────┬────────┘
                   │         │
                   └────┬────┘
                        │
                        ▼
               ┌────────────────┐
               │Compiler.compile│
               │   (ast)        │
               └───────┬────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │   Generate JS Code     │
          │                        │
          │ function render(__ctx) │
          │   let __out = ''       │
          │   // generated code    │
          │   __out += ...         │
          │   return __out         │
          │ }                      │
          └───────────┬────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
  ┌─────────────────┐     ┌─────────────────┐
  │compileToFunction│     │ compileToCode   │
  │  new Function() │     │ (JS string)     │
  └────────┬────────┘     └────────┬────────┘
           │                       │
           ▼                       ▼
  ┌─────────────────┐     ┌─────────────────┐
  │ (ctx) => string │     │ "function..."   │
  │ 160x faster!    │     │ for build tools │
  └─────────────────┘     └─────────────────┘
```

**Template Flattener**:
- Resolves template inheritance at compile-time
- Requires `extends` and `include` to use static string literals
- Process:
  1. Check if template can be flattened with `canFlatten()`
  2. Collect blocks from child template
  3. Load parent template
  4. Replace parent blocks with child blocks
  5. Process parent (recursively)
  6. Return flattened AST without Extends/Include nodes

---

## 9. Multi-Engine Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MULTI-ENGINE ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────┘

     HANDLEBARS              LIQUID                   JINJA2/DTL
     ──────────              ──────                   ──────────
  ┌──────────────┐      ┌──────────────┐       ┌──────────────┐
  │ {{#if}}      │      │ {% if %}     │       │ {% if %}     │
  │ {{#each}}    │      │ {% for %}    │       │ {% for %}    │
  │ {{>partial}} │      │ {% assign %} │       │ {% block %}  │
  │ {{{raw}}}    │      │ {% raw %}    │       │ {% extends %}│
  └──────┬───────┘      └──────┬───────┘       └──────┬───────┘
         │                     │                      │
         ▼                     ▼                      ▼
  ┌──────────────┐      ┌──────────────┐       ┌──────────────┐
  │  HbsLexer    │      │ LiquidLexer  │       │   Lexer      │
  └──────┬───────┘      └──────┬───────┘       └──────┬───────┘
         │                     │                      │
         ▼                     ▼                      ▼
  ┌──────────────┐      ┌──────────────┐       ┌──────────────┐
  │  HbsParser   │      │ LiquidParser │       │   Parser     │
  └──────┬───────┘      └──────┬───────┘       └──────┬───────┘
         │                     │                      │
         └─────────────────────┼──────────────────────┘
                               │
                               ▼
                    ┌───────────────────┐
                    │    COMMON AST     │
                    │  (same structure) │
                    │                   │
                    │  If, For, Block,  │
                    │  Output, Text...  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   SHARED RUNTIME  │
                    │                   │
                    │  - 80+ filters    │
                    │  - 28 tests       │
                    │  - optimizations  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   Output String   │
                    └───────────────────┘
```

**Supported Engines**:
- **Jinja2/DTL** - Default engine (full compatibility)
- **Handlebars** - `{{#if}}`, `{{#each}}`, `{{>partial}}`, `{{{unescaped}}}`
- **Liquid** - Shopify syntax: `{% if %}`, `{% for %}`, `{% assign %}`, `{% raw %}`
- **Twig** - PHP/Symfony syntax

**Key Architecture Insight**: All engines parse to a common AST format, which is then executed by binja's shared runtime. This means all engines benefit from binja's optimizations and 80+ built-in filters.

---

## 10. AI Linting Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AI LINTING FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

                     ┌─────────────────────────┐
                     │    lint(template, {})   │
                     └───────────┬─────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   STAGE 1: SYNTAX      │
                    │   Lexer + Parser       │
                    └───────────┬────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
    ┌──────────────────┐                ┌──────────────────┐
    │   Syntax Error   │                │   Syntax Valid   │
    │                  │                │                  │
    │ return {         │                │ Continue to AI   │
    │   valid: false,  │                │                  │
    │   errors: [...]  │                │                  │
    │ }                │                │                  │
    └──────────────────┘                └────────┬─────────┘
                                                 │
                                                 ▼
                                    ┌────────────────────────┐
                                    │   STAGE 2: AI DETECT   │
                                    │   Provider Resolution  │
                                    └───────────┬────────────┘
                                                │
              ┌─────────────────────────────────┼─────────────────┐
              ▼                                 ▼                 ▼
    ┌──────────────────┐              ┌──────────────┐   ┌──────────────┐
    │    Anthropic     │              │    OpenAI    │   │    Ollama    │
    │ ANTHROPIC_API_KEY│              │OPENAI_API_KEY│   │ (local, free)│
    │    (Claude)      │              │   (GPT-4)    │   │              │
    └────────┬─────────┘              └──────┬───────┘   └──────┬───────┘
             │                               │                  │
             └───────────────┬───────────────┴──────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Build Prompt   │
                    │  + Template     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  AI Analysis    │
                    │  Security, Perf │
                    │  A11y, BestPrac │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Parse Response │
                    │  JSON → Issues  │
                    └────────┬────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  LintResult {                                               │
    │    valid: boolean,                                          │
    │    errors: [{ line, type: 'security', message, suggestion}] │
    │    warnings: [{ line, type: 'performance', ... }]           │
    │    suggestions: [{ line, type: 'best-practice', ... }]      │
    │  }                                                          │
    └─────────────────────────────────────────────────────────────┘
```

**Two-Stage Process**:

1. **Syntax Checking** (No AI needed):
   - Runs Lexer + Parser
   - Catches TemplateSyntaxError
   - If syntax invalid: returns early with error

2. **AI Analysis** (Optional):
   - Resolves AI provider: auto-detect or explicit
   - Builds prompt with categories to check
   - Provider analyzes template
   - Parses JSON response from LLM
   - Categorizes into errors/warnings/suggestions

**Issue Types**:
- `syntax` - Syntax errors
- `security` - XSS vulnerabilities, injection
- `performance` - Heavy filters in loops, repeated calculations
- `accessibility` - Missing alt text, forms without labels
- `best-practice` - Missing `{% empty %}`, deep nesting
- `deprecated` - Deprecated features

---

## 11. Debug Panel Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DEBUG PANEL FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │ Environment.render(template, context, { debug: true })          │
  └─────────────────────────────────┬───────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  DebugCollector     │
                         │  startCollection()  │
                         └──────────┬──────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
  ┌─────────────┐          ┌─────────────┐           ┌─────────────┐
  │ startLexer  │          │ startParser │           │ startRender │
  │  timing     │          │  timing     │           │  timing     │
  └──────┬──────┘          └──────┬──────┘           └──────┬──────┘
         │                        │                         │
         ▼                        ▼                         ▼
  ┌─────────────┐          ┌─────────────┐           ┌─────────────┐
  │   LEXER     │          │   PARSER    │           │   RUNTIME   │
  └──────┬──────┘          └──────┬──────┘           └──────┬──────┘
         │                        │                         │
         ▼                        ▼                         ▼
  ┌─────────────┐          ┌─────────────┐           ┌─────────────┐
  │  endLexer   │          │  endParser  │           │  endRender  │
  │  record ms  │          │  record ms  │           │  record ms  │
  └─────────────┘          └─────────────┘           └─────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
  ┌─────────────┐          ┌─────────────┐           ┌─────────────┐
  │ Capture     │          │ Track       │           │ Record DB   │
  │ Context     │          │ Filters     │           │ Queries     │
  │ Variables   │          │ Tests Used  │           │ (if ORM)    │
  └─────────────┘          └─────────────┘           └─────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ generateDebugPanel()│
                         │                     │
                         │  - Timing bars      │
                         │  - Context tree     │
                         │  - Filter list      │
                         │  - Query log        │
                         │  - Warnings         │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ injectDebugPanel()  │
                         │ before </body>      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   HTML + Debug UI   │
                         │  (draggable panel)  │
                         └─────────────────────┘
```

**DebugCollector Tracks**:

- **Timing**: Lexer, parser, render duration
- **Template Info**: Template chain (root, extends, includes)
- **Context**: Variable snapshot at start
- **Filters & Tests**: Usage count for each filter/test
- **Database Queries** (ORM integration): SQL, duration, row count, N+1 detection
- **Cache Stats**: Hit/miss rate

**Panel Features**:
- Draggable, collapsible
- Dark/light mode toggle
- Timing breakdown (bar chart)
- Context tree view (expandable objects)
- Filter/test usage list
- Database query log
- Warnings section

---

## 12. Component Connections Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPONENT CONNECTIONS OVERVIEW                       │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │ Environment │
                              │  (Main API) │
                              └──────┬──────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
  ┌───────────┐              ┌─────────────┐              ┌─────────────┐
  │  Caching  │              │Template Load│              │Debug Collect│
  │  (LRU)    │              │ (Bun.file)  │              │  (Optional) │
  └───────────┘              └──────┬──────┘              └─────────────┘
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────────┐
  │                        PROCESSING PIPELINE                            │
  │                                                                       │
  │  ┌───────┐     ┌────────┐     ┌─────────┐     ┌──────────┐           │
  │  │ LEXER │────▶│ PARSER │────▶│ RUNTIME │────▶│  OUTPUT  │           │
  │  └───────┘     └────────┘     └─────────┘     └──────────┘           │
  │       │                            │                                  │
  │       │                            ▼                                  │
  │       │                     ┌─────────────┐                          │
  │       │                     │  FILTERS    │                          │
  │       │                     │  (80+)      │                          │
  │       │                     ├─────────────┤                          │
  │       │                     │  TESTS      │                          │
  │       │                     │  (28)       │                          │
  │       │                     └─────────────┘                          │
  │       │                                                              │
  │       │   ┌────────────────────────────────────────────────────┐     │
  │       │   │              MULTI-ENGINE SUPPORT                   │     │
  │       │   │                                                     │     │
  │       │   │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │     │
  │       └───┼─▶│ Handlebars │  │   Liquid   │  │    Twig    │    │     │
  │           │  │  Lexer     │  │  Lexer     │  │  Lexer     │    │     │
  │           │  │  Parser    │  │  Parser    │  │  Parser    │    │     │
  │           │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘    │     │
  │           │        │               │               │           │     │
  │           │        └───────────────┼───────────────┘           │     │
  │           │                        ▼                           │     │
  │           │                  ┌───────────┐                     │     │
  │           │                  │COMMON AST │──────────────────────┼─────┤
  │           │                  └───────────┘                     │     │
  │           └────────────────────────────────────────────────────┘     │
  │                                                                       │
  │   ┌─────────────────────────────────────────────────────────────┐    │
  │   │                    AOT COMPILER                              │    │
  │   │                                                              │    │
  │   │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    │    │
  │   │  │  Flattener  │────▶│  Compiler   │────▶│  JS Function│    │    │
  │   │  │ (Resolves   │     │ (Generates  │     │  (160x      │    │    │
  │   │  │  extends)   │     │   JS code)  │     │   faster)   │    │    │
  │   │  └─────────────┘     └─────────────┘     └─────────────┘    │    │
  │   └─────────────────────────────────────────────────────────────┘    │
  └───────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────┐
  │                         OPTIONAL FEATURES                             │
  │                                                                       │
  │   ┌─────────────────┐                    ┌─────────────────┐         │
  │   │    AI LINTING   │                    │   DEBUG PANEL   │         │
  │   │                 │                    │                 │         │
  │   │ Anthropic       │                    │ Timing metrics  │         │
  │   │ OpenAI          │                    │ Context viewer  │         │
  │   │ Groq            │                    │ Filter usage    │         │
  │   │ Ollama          │                    │ DB query log    │         │
  │   └─────────────────┘                    └─────────────────┘         │
  └───────────────────────────────────────────────────────────────────────┘
```

---

## Performance Optimizations

### Lexer
- `charCodeAt()` instead of regex for character classification
- Char-by-char matching (39% faster than slice())
- Pre-compiled regex patterns
- Position tracking avoids substring copies

### Runtime
- Sync path for templates without async operations
- ~70 inline filter implementations (10-15% faster)
- Plain objects for context (faster than Map)
- Lazy ForLoop properties (computed only on access)

### Compiler
- String accumulation instead of array concat
- Variable counter for temp variables
- Common operations inlined
- Minification option for production

### Caching
- LRU cache for compiled templates
- Configurable cache size
- Cache hits tracked for monitoring

### Bun Optimizations
- `Bun.file().text()` instead of fs.promises
- `Bun.escapeHTML()` (native, very fast)
- Direct file operations (no abstraction layer)

---

## Benchmark Performance

| Benchmark | binja | Nunjucks | Speedup |
|-----------|-------|----------|---------|
| Simple Template | 371K ops/s | 96K ops/s | **3.9x** |
| Complex Template | 44K ops/s | 23K ops/s | **2.0x** |
| Nested Loops | 76K ops/s | 26K ops/s | **3.0x** |
| Conditionals | 84K ops/s | 25K ops/s | **3.4x** |
| HTML Escaping | 985K ops/s | 242K ops/s | **4.1x** |
| AOT Compiled | - | - | **160x** vs Nunjucks |

---

*Document automatically generated from binja codebase analysis v0.9.1*
