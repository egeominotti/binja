---
title: CLI
description: Command-line interface for template compilation and linting
---

binja includes a CLI tool for template pre-compilation, validation, and linting.

## Installation

The CLI is included with binja:

```bash
bun add binja
```

Run with:

```bash
bunx binja <command>
# or
bun x binja <command>
```

## Commands

### compile

Compile templates to JavaScript for production.

```bash
binja compile ./templates -o ./dist
```

**Options:**

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory |
| `-w, --watch` | Watch for changes |
| `--minify` | Minify output |

**Example:**

```bash
# Compile all templates
binja compile ./views -o ./dist/templates

# Watch mode
binja compile ./views -o ./dist/templates --watch
```

### check

Validate templates for syntax errors.

```bash
binja check ./templates
```

**Options:**

| Option | Description |
|--------|-------------|
| `--strict` | Fail on warnings |
| `--format <type>` | Output format (text, json) |

**Example:**

```bash
# Check all templates
binja check ./views

# JSON output for CI
binja check ./views --format json
```

### watch

Watch templates and recompile on changes.

```bash
binja watch ./templates -o ./dist
```

### lint

Check templates for issues (syntax, security, best practices).

```bash
binja lint ./templates
```

**Options:**

| Option | Description |
|--------|-------------|
| `--ai` | Enable AI-powered analysis |
| `--ai=<provider>` | Use specific AI provider |
| `--format <type>` | Output format (text, json) |

**Example:**

```bash
# Syntax check only
binja lint ./views

# With AI analysis (auto-detect provider)
binja lint ./views --ai

# With specific AI provider
binja lint ./views --ai=anthropic
binja lint ./views --ai=openai
binja lint ./views --ai=ollama
binja lint ./views --ai=groq

# JSON output for CI/CD
binja lint ./views --ai --format=json
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Template Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Check templates
        run: bunx binja check ./templates --format json
```

### With AI Linting

```yaml
name: Template Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Lint templates
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: bunx binja lint ./templates --ai --format json
```

## Exit Codes

| Code | Description |
|------|-------------|
| `0` | Success |
| `1` | Error (syntax error, file not found) |
| `2` | Warnings (with --strict) |

## Compiled Output

When using `compile`, templates are converted to JavaScript:

**Input:** `views/user.html`
```django
<h1>{{ name|upper }}</h1>
<p>Email: {{ email }}</p>
```

**Output:** `dist/user.js`
```javascript
export function render(ctx) {
  let __out = '';
  __out += '<h1>';
  __out += escape(ctx.name.toUpperCase());
  __out += '</h1>\n<p>Email: ';
  __out += escape(ctx.email);
  __out += '</p>';
  return __out;
}
```

## Using Compiled Templates

```typescript
import { render as renderUser } from './dist/user.js'

const html = renderUser({
  name: 'john',
  email: 'john@example.com'
})
```
