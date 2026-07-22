---
title: Contributing
description: How to contribute to binja
---

We welcome contributions to binja! This guide will help you get started.

## Getting Started

### Fork and Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/binja.git
cd binja
```

### Install Dependencies

```bash
bun install
```

### Run Tests

```bash
bun test
```

### Run Specific Tests

```bash
bun test test/filters.test.ts
bun test test/runtime.test.ts
bun run test:property
bun run test:model
bun run test:fuzz
```

## Project Structure

```
binja/
├── src/
│   ├── index.ts          # Main entry, Environment class
│   ├── cli.ts            # CLI tool
│   ├── lexer/            # Tokenizer
│   ├── parser/           # AST generator
│   ├── runtime/          # Template execution
│   ├── compiler/         # AOT compilation
│   ├── filters/          # Built-in filters
│   ├── tests/            # Built-in tests (is operator)
│   ├── engines/          # Multi-engine support
│   ├── ai/               # AI linting
│   └── debug/            # Debug panel
├── test/                 # Test files
└── examples/             # Usage examples
```

## Development Workflow

### Adding a New Filter

1. Add filter in `src/filters/index.ts`:

```typescript
export const builtinFilters: Record<string, FilterFunction> = {
  // ...existing filters

  myfilter: (value: any, arg?: any): any => {
    // Filter logic
    return result
  },
}
```

2. The registry implementation is the required behavior. Add a runtime fast path only when a representative benchmark demonstrates a material improvement and parity tests cover it.

3. Add tests in `test/filters.test.ts`:

```typescript
test('myfilter', async () => {
  const result = await render('{{ value|myfilter }}', { value: 'test' })
  expect(result).toBe('expected')
})
```

### Adding a New Tag

1. Add token type in `src/lexer/tokens.ts` (if needed)
2. Add AST node type in `src/parser/nodes.ts`
3. Add parsing logic in `src/parser/index.ts`
4. Add execution logic in `src/runtime/index.ts`
5. Add or explicitly reject the node in `src/compiler/index.ts` and the CLI flattener
6. Add runtime/AOT parity and failure-path tests
7. Update the public syntax and compatibility documentation

### Adding a New Engine

1. Create directory `src/engines/{engine}/`
2. Create `lexer.ts` - tokenizes the engine's syntax
3. Create `parser.ts` - converts tokens to binja's common AST
4. Create `index.ts` with `parse()`, `compile()`, `render()` functions
5. Register in `src/engines/index.ts`
6. Add package exports, build entrypoints, and package-smoke imports
7. Add tests in `test/engines.test.ts`

## Code Style

- Use TypeScript
- Use `async/await` over Promises
- Use `const` over `let` where possible
- Add JSDoc comments for public APIs
- Follow existing code patterns

## Commit Messages

Use conventional commits:

```
feat: add new filter
fix: correct date formatting
docs: update README
test: add filter tests
refactor: simplify parser
```

## Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes and commit

3. Run tests and type check:
   ```bash
   bun test
   bun run typecheck
   ```

4. Push and create PR:
   ```bash
   git push origin feat/my-feature
   ```

5. Fill out the PR template

## Testing Guidelines

- All tests use Bun's test runner
- Tests should be async (render returns Promise)
- Test file naming: `{feature}.test.ts`
- Replicate Jinja2's behavior where applicable

Generative tests are part of the release gate. Property tests assert runtime/AOT and security invariants; model tests compare generated stateful command sequences with a reference model; fuzz tests mutate hostile templates and loader names. Use the `BINJA_PROPERTY_SEED`, `BINJA_MODEL_SEED`, or `BINJA_FUZZ_SEED` printed by fast-check to replay a failure.

```typescript
import { describe, test, expect } from 'bun:test'
import { render, Environment } from '../src'

describe('Feature Name', () => {
  test('description', async () => {
    const result = await render('{{ value|filter }}', { value: 'test' })
    expect(result).toBe('expected')
  })
})
```

## Questions?

- Open an issue for bugs or feature requests
- Use discussions for questions

Thank you for contributing!
