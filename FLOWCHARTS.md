# Binja architecture flows

This document reflects the current source layout. It intentionally omits historical performance ratios and blanket compatibility claims.

## Core source-string render

```mermaid
flowchart LR
  Source[Trusted template source] --> Lexer
  Lexer --> Tokens
  Tokens --> Parser
  Parser --> AST[Immutable TemplateNode]
  Context[Untrusted context values] --> Runtime
  AST --> Runtime
  Runtime --> Lookup[Protected lookup]
  Runtime --> Registry[Filters and tests]
  Runtime --> Escape[Safe string / autoescape]
  Lookup --> HTML
  Registry --> HTML
  Escape --> HTML[Rendered string]
```

`render()` creates a short-lived `Environment`, compiles source to AST, and invokes the asynchronous runtime. `Environment.renderString()` reuses its configured runtime and loader.

## Loader-backed rendering

```mermaid
flowchart TD
  Name[Template name] --> Contain{Inside configured root?}
  Contain -- no --> NotFound[TemplateNotFoundError]
  Contain -- yes --> Cache{AST cache hit?}
  Cache -- yes --> AST
  Cache -- no --> Extensions[Try configured extensions]
  Extensions --> Realpath{File and symlink stay inside root?}
  Realpath -- no --> NotFound
  Realpath -- yes --> Read[Read source]
  Read --> Parse[Lexer + Parser]
  Parse --> Store[LRU cache if enabled]
  Store --> AST[Template AST]
  AST --> Render[Request-local Runtime render]
```

Cache hits move an entry to the newest LRU position. `cacheMaxSize` bounds AST count. Render-local state is not stored in the AST cache.

## Inheritance and includes

```mermaid
sequenceDiagram
  participant App
  participant Env as Environment loader
  participant RT as Runtime
  App->>Env: render("child.html", context)
  Env-->>RT: child AST
  RT->>RT: collect child blocks
  RT->>Env: load parent/include names
  Env-->>RT: dependency AST
  RT->>RT: detect collection/render cycles
  RT->>RT: render dependency with isolated scopes
  RT-->>App: final HTML
```

`ignore missing` catches only `TemplateNotFoundError`. Parser/filter/runtime errors from an existing include remain visible. Includes containing their own inheritance chain are rendered through an isolated block state.

## Render-local state

```mermaid
flowchart LR
  Runtime[Long-lived Runtime] --> ALS[AsyncLocalStorage RenderState]
  ALS --> Blocks
  ALS --> Cycles
  ALS --> IfChanged
  ALS --> AutoescapeStack
  ALS --> CollectionSet[Dependency collection set]
  ALS --> RenderingSet[Active render set]
  ALS --> Counters[Liquid counters]
```

Every root render creates a new state. Context scopes, loop metadata, and changed-state tracking are restored with `try/finally`, including failure paths.

## Protected lookup and output

```mermaid
flowchart TD
  Key[Name / property key] --> Blocked{Blocked primitive?}
  Blocked -- yes --> Undefined
  Blocked -- no --> Read[Read value; bind method receiver]
  Read --> Value
  Value --> Null{null / undefined?}
  Null -- yes --> Empty[empty output]
  Null -- no --> Safe{Safe wrapper?}
  Safe -- yes --> Raw[trusted string]
  Safe -- no --> Auto{Autoescape active?}
  Auto -- yes --> Escaped[Bun.escapeHTML]
  Auto -- no --> Raw
```

Blocked string keys are `__proto__`, `prototype`, `constructor`, `caller`, `callee`, and `arguments`. Mapping membership uses own keys only.

## AOT compilation

```mermaid
flowchart TD
  Source --> Parse[Lexer + Parser]
  Parse --> Supported{All nodes supported?}
  Supported -- no --> Reject[Explicit compile error]
  Supported -- yes --> Generate[Generate JS function source]
  Generate --> Bind[Bind runtime helper contract]
  Bind --> Sync[(context) => string]
```

Core `compile()` binds protected lookup, Jinja truthiness/stringification, iteration, and built-in filter/test dispatch. It returns a synchronous render function.

### Static dependency flattening

```mermaid
flowchart TD
  Main[Main AST] --> Static{extends/includes are literals?}
  Static -- no --> RuntimeAdvice[Use Environment runtime]
  Static -- yes --> Load[Root-contained compile-time loader]
  Load --> Collect[Collect block override chains]
  Collect --> Super[Expand block.super]
  Super --> Inline[Inline static includes]
  Inline --> Flat[Flat AST]
  Flat --> AOT[AOT generator]
```

`compileWithInheritance()` binds helpers and returns an executable function. `compileWithInheritanceToCode()` returns only the generated function fragment. The CLI adds helpers, imports registries, and exports a complete ESM module.

## CLI flow

```mermaid
flowchart LR
  Input[File or directory] --> Parse
  Parse --> FlattenCheck[Static flattenability]
  FlattenCheck --> Flatten
  Flatten --> Generate[AOT generation]
  Generate --> Module[ESM helper wrapper]
  Module --> Output[Mirrored .js path]
```

`check` stops after successful flattening and generation. Directory compile/check sets a non-zero exit status if any template fails. Dependency paths remain under the source root.

## Secondary engines

```mermaid
flowchart TD
  HBS[Handlebars source] --> HParser[Handlebars lexer/parser]
  Liquid[Liquid source] --> LParser[Liquid lexer/parser]
  Twig[Twig source] --> TParser[Core lexer + Twig transform]
  Core[Core source] --> CParser[Core lexer/parser]
  HParser --> AST[Shared AST subset]
  LParser --> AST
  TParser --> AST
  CParser --> AST
  AST --> Runtime[Shared runtime/security/output]
```

The shared AST does not imply complete upstream compatibility. The direct secondary APIs have no external template/partial loader and their `compile()` functions remain asynchronous parsed-runtime caches.

## Adapter flow

```mermaid
flowchart TD
  Request --> Adapter[Hono middleware / Elysia derive]
  Adapter --> Resolve[Root-contained template path]
  Resolve --> Engine{Configured engine}
  Engine -- core --> Env[Configured Environment]
  Engine -- secondary --> ParsedCache[Optional parsed render-function cache]
  Env --> HTML
  ParsedCache --> HTML
  HTML --> Layout{Layout configured?}
  Layout -- core --> SafeContent[Trusted rendered content into Environment layout]
  Layout -- secondary --> SecondaryLayout[Secondary source render]
  SafeContent --> Response
  SecondaryLayout --> Response
  Layout -- no --> Response[HTML response]
```

Core cached and uncached modes both use `Environment`, preserving include/inheritance semantics.

## Debug/query telemetry

```mermaid
sequenceDiagram
  participant MW as Debug middleware
  participant ALS as Collector storage
  participant App
  participant Env
  participant DB as Query wrapper
  MW->>ALS: start request-local collector
  MW->>App: next()
  App->>Env: render
  Env->>ALS: lexer/parser/cache/template/filter/test events
  App->>DB: execute query
  DB->>ALS: query timing/details
  App-->>MW: HTML response
  MW->>ALS: finish and read data
  MW-->>App: HTML + escaped debug panel
```

Debug values are escaped for HTML but can still disclose secrets. Collection is development-only.

## Benchmark harness

```mermaid
flowchart LR
  Cases --> Correctness[Verify expected outputs]
  Correctness --> Warmup
  Warmup --> Rounds[3+ separate timed rounds]
  Rounds --> Consume[Consume each result]
  Consume --> Stats[Median, min/max, RSD]
  Stats --> Metadata[Bun, CPU, platform, arch, RAM]
  Metadata --> Text[Markdown-style table]
  Metadata --> JSON[Machine-readable JSON]
```

Sync and async cases use separate loops, and setup/compilation is excluded. See `benchmark/index.ts` and the documentation benchmark page for the current measured snapshot.
