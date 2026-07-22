---
name: binja
description: Audit, maintain, secure, benchmark, test, package, and document the Binja Bun/TypeScript template engine. Use for changes involving its lexer/parser/runtime pipeline, AOT compiler, built-in filters or tests, Handlebars/Liquid/Twig subsets, Hono/Elysia adapters, CLI, debug tooling, package exports, performance claims, or repository documentation.
---

# Maintain Binja

## Establish the baseline

Read `AGENTS.md` and inspect the working tree before acting. Inventory the affected source, tests, public exports, examples, and documentation. Run the narrowest existing checks that establish current behavior, then record exact failures or benchmark output instead of relying on historical claims.

Use this command set for a complete baseline:

```sh
bun run typecheck
bun run check
bun run test:coverage
bun run test:generative
bun run test:examples
bun run build
bun run test:package
bun run benchmark
cd docs && bun run build
```

## Property, model, and fuzz campaigns

`test/property-based` checks runtime/AOT and security invariants with fast-check. `test/model-based` generates stateful cache, registry, and concurrency command sequences. `test/fuzz` mutates a hostile template corpus and exercises parser/compiler/loader boundaries. Reproduce a failure with the corresponding `BINJA_*_SEED` variable; keep fuzz inputs bounded and deterministic.

## Trace every execution path

Follow a template feature through lexer tokens, parser AST, runtime evaluation, AOT generation, CLI-generated helpers, adapters, and secondary-engine transforms. Update all paths that advertise the feature.

Check these invariants whenever expressions, filters, tests, output, or scopes change:

- Runtime and AOT return identical visible output.
- Autoescape and safe-string behavior remain consistent.
- Boolean and empty-collection semantics follow the documented Jinja/Django subset.
- Context and attribute access cannot traverse blocked prototype primitives.
- Async includes/inheritance preserve request-local state and detect cycles.
- Cached and uncached adapter modes have identical rendering semantics.

Reject unsupported syntax with a source-aware error. Never preserve compatibility by silently discarding template content.

## Audit security boundaries

Assume context data and loader names are attacker-controlled. Keep templates themselves in the trusted-code boundary and state that boundary in public security docs.

Review property lookup, mapping membership, path containment, JSON-in-HTML output, HTML-producing filters, attribute generation, debug/error panels, CSRF integration, and unbounded loops. Add a regression test for each corrected boundary.

Use the shared functions in `src/security.ts` rather than creating a new access or escaping rule in a fast path.

## Benchmark responsibly

Run `bun run benchmark` after correctness checks. Keep compilation/setup outside timed sections, consume outputs, warm every case, separate synchronous and asynchronous harnesses, retain multiple samples, and report median, range, variability, Bun version, CPU, architecture, and memory.

Use `BENCH_ROUNDS=N bun run benchmark` for longer runs and `bun run benchmark -- --json` for machine-readable data. Do not compare unrelated workloads or turn a local microbenchmark into a universal competitor claim.

## Keep packaging and docs executable

For every documented import path, update all of:

- `package.json` exports;
- `build:js` entrypoints;
- declaration output assumptions;
- `test/package-smoke.ts` imports and behavior checks;
- README and docs examples.

Build the Astro documentation and verify examples against the actual API. Replace absolute compatibility and performance language with tested scope and reproducible measurements. Keep `README.md`, `docs`, `FLOWCHARTS.md`, `llms.txt`, `CLAUDE.md`, and the changelog consistent.

## Finish with evidence

Run the complete release gate from `AGENTS.md`. Inspect the final diff and package tarball behavior. Summarize fixed defects, compatibility limitations that remain, benchmark conditions/results, test counts, and documentation changes. Commit and push only when the user explicitly requests it.
