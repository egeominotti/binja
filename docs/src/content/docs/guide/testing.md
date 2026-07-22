---
title: Generative Testing
description: Property-based, stateful model-based, and fuzz testing for Binja
---

Binja's test suite checks both examples and invariants. The generative tests use [fast-check](https://fast-check.dev/) 4.x and run in Bun 1.3.14.

## Three complementary campaigns

### Property-based tests

`test/property-based` generates Unicode strings, JSON values, numeric paths, and hostile prototype shapes. Each case checks an invariant rather than one fixture, including runtime/AOT equivalence, JSON round-trips, own-key lookup, and text-token conservation.

```sh
bun run test:property
```

If fast-check prints a seed, replay it with:

```sh
BINJA_PROPERTY_SEED=-123 BINJA_PROPERTY_RUNS=1000 bun test test/property-based
```

### Stateful model-based tests

`test/model-based` generates command sequences for the LRU template cache, global/filter/URL registries, filesystem rewrites, invalid loads, and cross-environment isolation. The real `Environment` is compared after every command with a small reference model, including exact LRU order.

```sh
bun run test:model
BINJA_MODEL_SEED=-123 BINJA_MODEL_RUNS=250 BINJA_MODEL_COMMANDS=100 bun test test/model-based
```

### Fuzzing

`test/fuzz` combines arbitrary Unicode input with a shrinking, corpus-seeded mutation generator. It exercises lexer/parser/compiler failure boundaries and arbitrary loader names. A case is valid only if it returns a string or a typed `Error`; loader fuzzing must never read outside its configured root.

```sh
bun run test:fuzz
BINJA_FUZZ_SEED=-123 BINJA_FUZZ_RUNS=5000 bun test test/fuzz --timeout 60000
```

This is deterministic mutation/dumb fuzzing suitable for the Bun test runner. Coverage-guided native fuzzers such as AFL++ or libFuzzer are not part of the TypeScript package build; a crashing input should first be added to `test/fuzz/corpus.ts` as a regression.

## Release gate

The extended campaign runs all three layers:

```sh
bun run test:generative
```

The normal coverage suite keeps a bounded number of generated cases; the extended command is also run by CI stability and release checks.
