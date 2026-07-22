---
title: CLI
description: Compile, validate, watch, and lint Binja templates.
---

The `binja` executable is included in the package:

```sh
bunx binja --help
bunx binja --version
```

## Compile

```sh
binja compile <source-file-or-directory> -o <output-directory>
```

| Option | Effect |
|---|---|
| `-o, --output <dir>` | Required output directory |
| `-n, --name <identifier>` | Function name for a single-file compile |
| `-m, --minify` | Remove generated formatting newlines |
| `-e, --ext <csv>` | Extensions; default `.html,.jinja,.jinja2` |
| `-v, --verbose` | Print every compiled path |
| `-w, --watch` | Recompile changed files; directory only |

```sh
binja compile ./views -o ./compiled --verbose
binja compile ./views/card.html -o ./compiled --name renderCard
binja compile ./views -o ./compiled --ext html,twig
```

The compiler parses each template, verifies static flattenability, resolves literal `extends`/`include` dependencies beneath the source root, generates AOT code, and writes an ESM module. Dynamic dependency names fail because they cannot be resolved at build time.

Generated modules:

- import `builtinFilters` and `builtinTests` from `binja`;
- include protected lookup, output, truthiness, iteration, and dispatch helpers;
- export the generated function as `render` and as the default export.

```ts
import renderCard, { render } from './compiled/card.js'

renderCard({ title: 'Status' })
render({ title: 'Status' })
```

If any file in a directory fails, successful siblings may already have been written, but the command exits non-zero.

## Check

```sh
binja check <source-file-or-directory>
```

`check` does more than parse: it verifies that dependencies are statically flattenable, performs flattening, and asks the AOT compiler to generate code. Dynamic includes/extends, missing dependencies, unsupported AOT nodes, and syntax errors produce a non-zero exit.

`check` currently emits terminal text; it does not support `--strict` or JSON output.

## Watch

Both forms are equivalent:

```sh
binja watch ./views -o ./compiled
binja compile ./views -o ./compiled --watch
```

Watch mode requires a directory and recompiles changed files with one of the selected extensions. It does not remove an output when a source file is deleted.

## Lint

```sh
binja lint <source-file-or-directory>
binja lint ./views --format=json
```

Without AI, lint performs syntax validation. Optional AI analysis supports:

```sh
binja lint ./views --ai
binja lint ./views --ai=anthropic
binja lint ./views --ai=openai
binja lint ./views --ai=groq
binja lint ./views --ai=ollama
```

`--format=json` is the exact option form. AI providers require their documented credentials/runtime and optional SDK where applicable.

Lint exits non-zero for errors. Warnings and suggestions alone do not currently change the exit code.

## Path and code safety

Dependency resolution rejects paths and symlinks outside the source directory. Generated function names are sanitized for directory compiles and validated by the compiler; an unsafe explicit `--name` fails rather than becoming injected JavaScript.

## CI example

```yaml
- run: bun install --frozen-lockfile
- run: bunx binja check ./views
- run: bunx binja lint ./views --format=json
```
