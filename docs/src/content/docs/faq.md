---
title: FAQ
description: Compatibility, performance, caching, security, and API answers.
---

## General

### What is Binja?

A Bun-first TypeScript template engine with a Jinja/Django-style core, static AOT compiler, Hono/Elysia adapters, and explicit Handlebars/Liquid/Twig subsets.

### Does it run on Node.js?

The package targets Bun `>=1.3.14` and uses Bun APIs such as `Bun.file` and `Bun.escapeHTML`. Node.js is not a supported runtime target.

### Is it fully compatible with Django or Jinja2?

No. It implements a broad, tested subset. Python extensions, every upstream tag/filter, and exact coercion/escaping edge cases are outside the guarantee. Migrate with fixture tests rather than syntax assumptions.

## Performance

### How fast is it?

The repository publishes current local microbenchmark numbers with hardware, Bun version, warmup, samples, ranges, and variability. It no longer publishes unsupported universal ratios against another engine. See [Benchmarks](/binja/guide/benchmarks/) and re-run the harness on the deployment target.

### When should I use AOT?

Use core `compile()` for a static template supported by the AOT compiler and a synchronous hot path. Use `compileWithInheritance()` when every dependency name is literal. Use `Environment` for dynamic template names, loader-backed rendering, custom filters, URL/static resolvers, or runtime-only tags.

### Does caching change semantics?

It should not. `Environment` caches immutable parsed ASTs while render-local state remains isolated. The core Hono/Elysia adapters use `Environment` in both cached and uncached modes, so inheritance/includes behave consistently.

## Filters and tests

### How many are included?

The public registries expose 91 filter entries and 35 test entries in this release. Counts include aliases. Inspect `Object.keys(builtinFilters)` and `Object.keys(builtinTests)` for the exact installed version.

### Can I add filters?

Yes, through `Environment`:

```ts
const env = new Environment({
  filters: { currency: (value: number) => `€${value.toFixed(2)}` },
})
```

Plain AOT `compile()` uses the built-in registry and does not accept that environment registry.

## Templates and loaders

### Are inheritance and includes supported?

Yes through the core `Environment`. The loader is root-contained, detects cycles, supports context overrides, and distinguishes a missing template from failures inside an existing include.

Direct Handlebars/Liquid/Twig modules accept strings and do not expose a partial/template loader, so their external dependency syntax is not supported through those APIs.

### Why did `ignore missing` still throw?

It intentionally suppresses only `TemplateNotFoundError`. A syntax error, unknown filter, or runtime error inside an existing included template is not “missing” and remains visible.

## Secondary engines

### Do all core filters work in every syntax?

They share the runtime registry, but parser syntax and aliases differ. Liquid and Twig map documented aliases; Handlebars does not expose a general Binja pipe-filter syntax. Test the specific template rather than assuming registry reachability.

### Is secondary `compile()` AOT?

No. It caches parsing and returns `(context) => Promise<string>`. Only the core `compile()` returns a synchronous AOT function.

## Security

### Is autoescape enabled?

Yes by default. `safe`, triple Handlebars output, Twig `raw`, and `autoescape false` are explicit trust assertions, not sanitizers.

### How should I embed JSON?

Prefer `json_script`, then parse the inert element's `textContent`. `json`/`tojson` are also HTML-safe, but do not add a redundant `safe` to untrusted input.

### Does `{% csrf_token %}` provide CSRF protection?

No. It only renders an escaped token supplied as `csrf_token` or `csrfToken`. The host application must generate and validate the token.

### Is debug mode safe in production?

No. Although displayed text is escaped, the panel can disclose context values, SQL, query parameters, templates, and errors.

## Troubleshooting

### A template is not found

Paths are relative to `EnvironmentOptions.templates`, and extensions are tried in configured order. Absolute paths, `..` traversal, and symlink escapes are rejected.

### A compiled CLI module cannot resolve `binja`

Generated modules intentionally import the package registries. Ensure `binja` is installed/resolvable from the output module's project.

### I see double escaping

Find where already-escaped text was converted back to a plain string. Do not broadly add `safe`; preserve a trusted safe-string wrapper only at the sanitization boundary.
