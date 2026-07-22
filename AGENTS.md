# AGENTS.md

## Scope

These instructions apply to the entire repository. Binja is a Bun-first TypeScript template engine with a Jinja/Django-style core, an AOT compiler, framework adapters, optional debug/AI tooling, and compatibility subsets for Handlebars, Liquid, and Twig.

Treat compatibility claims as tested subsets, not blanket upstream compatibility. When behavior differs between the interpreter, AOT output, an adapter, or a secondary engine, either restore parity with regression tests or document the limitation explicitly.

## Repository map

- `src/lexer`, `src/parser`, `src/runtime`: core tokenize/parse/render pipeline.
- `src/compiler`: AOT compilation and static inheritance flattening.
- `src/filters`, `src/tests`: built-in registries shared by runtime and AOT.
- `src/engines`: Handlebars, Liquid, and Twig compatibility layers.
- `src/adapters`: Hono and Elysia integrations.
- `src/debug`, `src/ai`, `src/cli.ts`: optional tooling and CLI.
- `test`: unit, regression, model-based, package, soak, CLI, and adapter tests.
- `examples`: executable TypeScript examples; `bun run typecheck` validates them.
- `benchmark`: reproducible local microbenchmark harness.
- `docs`, `README.md`, `FLOWCHARTS.md`, `llms.txt`: public documentation; keep these aligned with the implementation.

## Required workflow

1. Inspect `git status` before editing and preserve unrelated work.
2. Reproduce a defect with a focused test before or alongside the fix.
3. Update every applicable execution path. Core expression/filter changes usually affect the interpreter, AOT compiler, generated CLI helpers, and secondary-engine transforms.
4. Run focused tests while iterating.
5. Before handoff, run the full release gate:

   ```sh
   bun run typecheck
   bun run check
   bun run test:coverage
   bun run test:generative
   bun run test:examples
   bun run build
   bun run test:package
   cd docs && bun run build
   ```

6. Run `bun run benchmark` for performance-sensitive changes. Compare multiple warmed rounds and report machine/runtime metadata; never present one machine's microbenchmark as a universal speed claim.

## Correctness and security invariants

- Keep runtime and AOT output equivalent for all syntax supported by `compile()`. Add parity cases to `test/audit-fixes.test.ts` or `test/deep-audit.test.ts`.
- Preserve Python/Jinja truthiness and `True`/`False` stringification instead of JavaScript defaults.
- Resolve mapping membership against own keys only.
- Route template property reads through the shared security helpers. Do not expose `__proto__`, `prototype`, `constructor`, `caller`, `callee`, or `arguments` through a new fast path.
- Treat template source as trusted application code, but treat context values, template names, attribute names, JSON payloads, debug values, and error text as untrusted input.
- Any filter that returns trusted markup must escape its untrusted components first. Do not mark arbitrary input safe merely because a filter transforms it.
- Keep template paths contained under their configured root, including symlink resolution and CLI/adapters.
- Do not suppress parser/render failures under `ignore missing`; only suppress a real `TemplateNotFoundError`.
- Keep mutable render state request-local. Long-lived `Environment` and `Runtime` instances must remain safe under concurrent renders.

## Generative and fuzz testing

- Property invariants live in `test/property-based`; replay a failure with `BINJA_PROPERTY_SEED` and adjust `BINJA_PROPERTY_RUNS`.
- Stateful command models live in `test/model-based`; use `BINJA_MODEL_SEED`, `BINJA_MODEL_RUNS`, and `BINJA_MODEL_COMMANDS` for reproduction.
- Corpus-seeded mutation fuzzing lives in `test/fuzz`; use `BINJA_FUZZ_SEED` and `BINJA_FUZZ_RUNS`. Fuzz cases must terminate with a string or a typed error and must never read outside a loader root.
- The normal suite uses bounded campaigns; `bun run test:generative` is the extended release/stability campaign.

## AOT and loaders

- `compile()` is synchronous after compilation and supports only nodes handled by `src/compiler/index.ts`.
- Resolve static `extends` and `include` with `compileWithInheritance()` or the CLI flattener.
- Use `Environment.render()` for dynamic template names and runtime loading.
- Generated CLI modules may import Binja registries; package smoke tests must exercise every documented export subpath.
- Reject unsupported syntax loudly. Never silently drop an unknown tag or expression.

## Secondary engines

- The Handlebars, Liquid, and Twig modules are compatibility subsets implemented over the shared AST/runtime, not upstream package replacements.
- Add engine-specific syntax tests in `test/engines.test.ts` or `test/deep-audit.test.ts`.
- Keep their public subpaths in `package.json`, the Bun build entry list, and `test/package-smoke.ts` synchronized.
- If a feature requires a template loader or registration API that an engine does not expose, document it as unsupported instead of showing a non-working example.

## Style and maintenance

- Target Bun `>=1.3.14` and strict TypeScript.
- Use the existing Biome configuration; run `bun run format` only for touched code.
- Prefer small shared helpers over duplicated security or semantic logic, but measure hot-path changes.
- Use `Object.create(null)`, `Map`, or explicit own-property checks when external strings become keys.
- Avoid stale numeric claims, counts, versions, model names, and benchmark ratios in docs. Derive or remeasure them.
- Update the changelog under an `Unreleased` section for user-visible behavior. Do not invent release dates or version numbers.
- Do not edit generated `dist`, `coverage`, or `docs/dist` artifacts; rebuild them for verification only.

## Commit hygiene

- Keep commits focused and use an imperative Conventional Commit subject when practical.
- Never bypass failing checks to publish.
- Push only when explicitly requested and report the branch and commit hash.
