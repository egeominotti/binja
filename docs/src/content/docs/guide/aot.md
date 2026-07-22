---
title: AOT Compilation
description: Compile Binja's supported static subset to synchronous JavaScript render functions.
---

AOT compilation parses a template once and generates a synchronous JavaScript function. Compilation/setup cost is paid before the hot render path.

## Basic use

```ts
import { compile } from 'binja'

const renderUser = compile('<h1>{{ name|upper }}</h1>')
const html = renderUser({ name: 'ada' })
```

Compile once at process startup or build time and reuse the returned function.

## Supported common subset

- variables, literals, arrays, objects, property/item access;
- arithmetic, boolean, comparison, membership, conditional, and coalescing expressions;
- built-in filters and tests;
- `if`/`elif`/`else`, `for`/`empty`, `set`, `with`;
- `autoescape`, `spaceless`, comments, raw/verbatim text;
- loop aliases and Python/Jinja truthiness/stringification.

## Runtime-only or rejected features

Plain `compile()` rejects `extends`, `include`, URL/static tags, and any AST node the compiler cannot represent faithfully. It also does not accept an `Environment` custom-filter registry; use the built-in registry or runtime mode for custom filters.

Use `Environment` for dynamic template names:

```ts
const env = new Environment({ templates: './views', cache: true })
const html = await env.render(templateName, context)
```

## Static inheritance and includes

```ts
import { compileWithInheritance } from 'binja'

const renderPage = await compileWithInheritance('page.html', {
  templates: './views',
  extensions: ['.html', '.jinja', '.jinja2', ''],
})
```

The flattener resolves literal `extends` and `include` dependencies below `templates`, expands blocks/`block.super`, and rejects dynamic names or root escapes.

## Generating modules

The easiest supported path to an importable file is the CLI:

```sh
binja compile ./views -o ./compiled
```

Generated modules include Binja's helper contract, import the built-in filter/test registries, and export `render` plus a default function.

`compileToCode()` and `compileWithInheritanceToCode()` are lower-level APIs. They return a function source fragment that expects helpers (`stringify`, truthiness, lookup, filter/test dispatch, and iteration) in the surrounding build-tool scope; they do not return a complete ESM module.

## Options

```ts
interface CompileOptions {
  functionName?: string
  minify?: boolean
  autoescape?: boolean
}
```

Function names are validated against JavaScript identifier and reserved-word rules. `minify` currently removes generated formatting newlines; use a bundler/minifier for full minification.

## Measure on the target

The local audit benchmark reports AOT separately from async runtime and excludes compilation time. See [Benchmarks](/binja/guide/benchmarks/) for current numbers and the reproducibility rules.
