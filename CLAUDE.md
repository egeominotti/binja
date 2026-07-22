# CLAUDE.md

Read [`AGENTS.md`](./AGENTS.md) first. It is the repository-wide source of truth for workflow, safety invariants, validation, documentation, and commit hygiene. [`SKILL.md`](./SKILL.md) contains the reusable audit procedure.

## Project summary

Binja is a Bun-first TypeScript template engine with:

- a Jinja/Django-style lexer, parser, AST, and asynchronous runtime;
- a synchronous AOT compiler for a documented static subset;
- loader-backed inheritance/includes and an LRU cache through `Environment`;
- 91 filter registry entries and 35 test entries, including aliases;
- Hono/Elysia adapters, CLI generation, debug/query tooling, and optional AI linting;
- explicit Handlebars, Liquid, and Twig compatibility subsets.

Never describe any syntax module as fully compatible with its upstream engine. Keep claims tied to executable tests.

## Required checks

```sh
bun install
bun run typecheck
bun run check
bun run test:coverage
bun run build
bun run test:package
bun run benchmark
cd docs && bun run build
```

Use focused `bun test test/<file>.test.ts` runs while iterating. The full release gate is still required before a commit intended for publication.

## Repository map

```text
src/
  lexer/                 tokenization and delimiter handling
  parser/                core grammar and AST construction
  runtime/               evaluation, rendering, inheritance, render-local state
  compiler/              AOT code generation and static dependency flattening
  filters/               built-in filter registry
  tests/                 built-in `is` predicates
  engines/               Handlebars, Liquid, Twig subsets and MultiEngine
  adapters/              Hono and Elysia integration
  debug/                 panel, collectors, request/query integrations
  ai/                    optional AI-assisted linting
  security.ts            shared protected lookup and HTML-safe JSON helpers
  cli.ts                 compile/check/watch/lint executable
test/                    unit, regression, model, soak, adapter, CLI, package tests
benchmark/               warmed multi-round correctness-gated benchmark
docs/                    Astro/Starlight documentation
```

## Execution paths to keep aligned

A template feature may cross:

```text
source
  → lexer tokens
  → parser AST
  ├→ Runtime / Environment / adapters
  ├→ AOT compiler / flattener / CLI-generated helpers
  └→ secondary-engine parser transform → shared runtime
```

Expression, lookup, output, filter, test, truthiness, or scoping changes usually require runtime/AOT parity tests and an audit of generated CLI helpers. Secondary parsers need their own fixtures.

## Correctness invariants

- Autoescape and safe strings behave identically in runtime and AOT for common nodes.
- Booleans render as `True`/`False`; empty arrays, objects, maps, and sets follow documented Jinja-style truthiness.
- Mapping membership uses own keys.
- Property reads route through protected lookup and cannot expose `__proto__`, `prototype`, `constructor`, `caller`, `callee`, or `arguments`.
- Mutable blocks, cycles, counters, `ifchanged`, autoescape stacks, and include state are render-local.
- Cached/uncached adapter settings do not change core inheritance or include semantics.
- Unsupported or unknown syntax throws with source context; it is never silently discarded.

## Security boundary

Template source is trusted application code, not sandboxed user content. Context values and names are untrusted. Any HTML-producing filter must escape untrusted components before returning a safe wrapper. Debug output, JSON in HTML, CSRF values, generated attributes, error text, and filesystem names need context-specific handling.

Use shared helpers from `src/security.ts`; do not duplicate a weaker fast path.

## AOT boundaries

`compile()` returns a synchronous function and supports only nodes represented by `src/compiler/index.ts`. Static literal inheritance/includes can be flattened by `compileWithInheritance()` or the CLI. Dynamic template names, URL/static resolver tags, and custom Environment registries require runtime rendering.

`compileToCode()` returns a helper-dependent function fragment. The CLI wraps it into a complete ESM module that imports Binja's filter/test registries.

## Adding features

For a filter or test:

1. add the registry implementation;
2. check runtime inline dispatch and AOT dispatch;
3. check CLI-generated dispatch;
4. use protected property access for external keys;
5. add normal, edge, security, and runtime/AOT parity tests;
6. update registry counts/tables only after deriving them from code.

For a tag or expression:

1. update tokens/lexer if needed;
2. add a typed AST node;
3. parse with source-aware errors;
4. implement sync/async runtime paths and state cleanup;
5. implement AOT or reject it explicitly;
6. update flattener recursion where the node has a body;
7. cover nested, malformed, concurrent, and parity cases.

## Documentation rules

- Current registry counts are 91 filters and 35 tests, including aliases; derive again after registry edits.
- Current package version is read from `package.json`; do not hardcode versions in examples.
- Benchmark results must include hardware, Bun version, rounds, range, and variability.
- Do not restore the removed competitor ratios or absolute compatibility language without a reproducible equivalent harness/test corpus.
- Engine docs must state their loader/helper/host-runtime limitations.

## Publishing

Build and package-smoke every public subpath before release. Do not edit generated `dist`, `coverage`, or docs build output. Commit and push only with explicit user authorization.
