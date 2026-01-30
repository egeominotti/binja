---
title: Changelog
description: Version history and release notes
---

## v0.9.1 (2025-01-30)

### Added
- AI-powered template linting with multiple providers (Anthropic, OpenAI, Groq, Ollama)
- Architecture flowcharts documentation

### Fixed
- Minor bug fixes and performance improvements

---

## v0.9.0 (2025-01-28)

### Added
- **Hono adapter** - First-class integration with `binja/hono`
- **Elysia adapter** - First-class integration with `binja/elysia`
- Framework adapter documentation and examples

---

## v0.8.0 (2025-01-25)

### Added
- **Twig engine support** - Full Twig syntax compatibility
- `detectEngine()` function for auto-detecting engine from file extension
- Improved multi-engine documentation

### Changed
- Unified AST format across all engines

---

## v0.7.0 (2025-01-20)

### Added
- **Liquid engine support** - Shopify/Jekyll template syntax
- `{% assign %}` tag for Liquid
- `{% capture %}` tag for Liquid

---

## v0.6.0 (2025-01-15)

### Added
- **Handlebars engine support** - `{{#if}}`, `{{#each}}`, `{{{unescaped}}}`
- `MultiEngine` unified API
- Engine-specific imports (`binja/engines/handlebars`)

---

## v0.5.0 (2025-01-10)

### Added
- **Debug panel** - Django Debug Toolbar-style development tools
- `DebugCollector` class for programmatic access
- Performance timing visualization

### Changed
- Improved error messages with line numbers

---

## v0.4.0 (2025-01-05)

### Added
- **84 built-in filters** - Complete Jinja2 + Django filter set
- **28 built-in tests** - `is` operator support
- `truncatechars_html`, `truncatewords_html` filters
- `groupby`, `columns` filters

### Performance
- Inline filter optimization for ~70 common filters (10-15% speedup)

---

## v0.3.0 (2024-12-20)

### Added
- **AOT compilation** - `compile()` function for 160x speedup
- `compileToCode()` for build tool integration
- CLI tool (`binja compile`, `binja check`, `binja watch`)

---

## v0.2.0 (2024-12-10)

### Added
- **Template inheritance** - `{% extends %}`, `{% block %}`
- **Include** - `{% include %}` with context passing
- LRU cache with configurable max size
- Timezone support for date filters

---

## v0.1.0 (2024-12-01)

### Initial Release
- Core template engine with Jinja2/DTL syntax
- Variables, filters, conditionals, loops
- `Environment` class for configuration
- 50+ built-in filters
- Autoescape by default
- TypeScript support
