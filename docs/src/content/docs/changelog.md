---
title: Changelog
description: Verified release history and pending changes.
---

## Unreleased

### Security

- Centralized protected property resolution across runtime, AOT, CLI-generated modules, and attribute-oriented filters; blocked prototype-escape primitives and own-key membership semantics.
- Made `json`/`tojson`, `json_script`, debug output, error pages, CSRF output, and `xmlattr` safe for their documented HTML contexts.
- Stopped `pprint`, `addslashes`, and HTML truncation filters from implicitly trusting arbitrary input.
- Contained Environment, adapter, AOT, and CLI template paths beneath their configured roots, including symlink checks.
- Added explicit `TemplateNotFoundError`; `ignore missing` no longer suppresses syntax/render errors in existing includes.

### Core runtime and AOT

- Render synchronous subtrees directly inside include/inheritance renders while preserving asynchronous block overrides and render-local scope cleanup.

- Implemented real `autoescape` and `spaceless` block bodies, include/inheritance cycle detection, include-with-inheritance rendering, and request-local state cleanup through `try/finally`.
- Aligned runtime/AOT truthiness, boolean stringification, protected lookup, membership, filter arguments, built-in tests, chained comparisons, loop aliases, and `set` scope behavior.
- Added Twig-style `??`, `? :`, `elseif`, and `is divisible by`; fixed Django numeric path tokenization and custom delimiter scanning.
- Unknown/unsupported tags now fail with source-aware errors instead of silently dropping content.
- Added positive-size validation to batch/column/wrapping paths and bounded Liquid ranges.

### Secondary engines

- Added Liquid filter aliases, inclusive ranges, `capture`, and render-local increment/decrement counters; unsupported `break`/`continue` and unknown tags now fail explicitly.
- Fixed Handlebars `unless ... else`, mismatched/unclosed block diagnostics, and static runtime imports.
- Corrected Twig filter mappings for `keys`/`merge` and transformation of conditional expressions.
- Documented every secondary engine as a tested subset, including its loader/helper ecosystem boundaries.

### Adapters, CLI, debug, and package

- Share bounded template/layout caches across the loading paths within each adapter instance, coalesce secondary-engine loads, and prevent invalidation from being undone by older in-flight loads.
- Avoid filesystem checks on adapter cache hits; validate names on every request and resolve symlinks when loading source.
- Automatically release registry entries for discarded Hono/Elysia adapter instances.

- Core Hono/Elysia rendering now uses one configured `Environment` in cached and uncached modes, preserving include/inheritance behavior; layout content and debug errors use explicit safe handling.
- CLI `check` now performs flattening and AOT generation, directory failures exit non-zero, and generated modules execute built-in filters/tests with protected lookup.
- Debug collection now records lexer/parser totals, cache/filter/test/template activity, tolerates cycles/invalid dates, and begins before middleware request work so query telemetry is captured.
- Added package exports/build entries/smoke checks for `binja/engines` and each engine subpath.

### Quality and documentation

- Replaced Biome with oxlint and oxfmt for lint, formatting, pre-commit, and CI release checks.
- Updated CI/CD pinned Bun versions to 1.4.2.

- Added fast-check property invariants, stateful LRU/registry model checks, corpus-seeded parser/loader fuzzing with replayable seeds, and an extended generative release campaign.
- Fixed prototype-inherited filter/test dispatch, mapping length over inherited keys, order-dependent `ifchanged` Map/Set equality, invalid batch/column/wordwrap progress values, URL/static resolver escaping, stale cross-adapter secondary caches, and malformed AI responses being reported as clean.
- Added per-adapter bounded LRU caches and provider model/timeout configuration for optional AI integrations.
- Added deep security/semantic regressions, CLI integration coverage, and cached-adapter inheritance fixtures.
- Replaced stale lexer comparison scripts with a correctness-gated, warmed, multi-round sync/async benchmark that reports median, range, RSD, metadata, and JSON.
- Added root `AGENTS.md` and a validated root `SKILL.md` maintenance workflow.
- Removed unsupported absolute compatibility and competitor-performance claims; synchronized README, site metadata, API/engine/security guides, internal architecture docs, and examples.

## v0.9.3 — 2026-07-20

- Hardened renderer state, inheritance/include flattening, AOT parity, adapters, and registry semantics with regression, concurrency, property-based, and model-based tests.
- Added Biome-based release gates, package smoke checks, declaration-build fixes, and Bun 1.3.14 engine metadata.
- Improved rich errors, cache bounds, cross-environment isolation, and debug/query integration behavior.

## v0.9.2 — 2026-01-30

- Optimized default-delimiter text scanning and added repository formatting/pre-commit configuration.
- The historical percentage attached to the lexer commit is not repeated here because the old comparison scripts did not provide a valid current baseline.

## v0.9.1 — 2026-01-03

- Added optional multi-provider AI linting, Hono/Elysia adapters, Twig syntax support, documentation, and architecture diagrams.

## v0.8.0 — 2026-01-03

- Introduced the multi-engine API and initial Handlebars/Liquid compatibility layers over the shared AST/runtime.

## Earlier releases

Earlier 0.x releases established the core lexer/parser/runtime, filters/tests, inheritance/includes, cache/timezone support, debug/query tooling, AOT compiler, CLI, and error reporting. Historical exact compatibility and performance claims have been removed where the repository cannot reproduce them with the current test or benchmark harness.
