---
title: AI Linting
description: AI-powered template analysis for security, performance, and best practices
---

binja includes an optional AI-powered linting module that analyzes templates for security vulnerabilities, performance issues, accessibility problems, and best practice violations.

## Installation

Install the SDK for your preferred AI provider:

```bash
# For Claude (Anthropic)
bun add @anthropic-ai/sdk

# For OpenAI
bun add openai

# For Ollama (local) or Groq - no package needed
```

## Configuration

Set the API key for your provider:

```bash
# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...

# Groq (free tier available)
export GROQ_API_KEY=gsk_...

# Ollama - no key needed, just run: ollama serve
```

## CLI Usage

```bash
# Syntax check only
binja lint ./templates

# With AI analysis (auto-detect provider)
binja lint ./templates --ai

# With specific provider
binja lint ./templates --ai=anthropic
binja lint ./templates --ai=openai
binja lint ./templates --ai=ollama
binja lint ./templates --ai=groq

# JSON output for CI/CD
binja lint ./templates --ai --format=json
```

## Programmatic Usage

```typescript
import { lint } from 'binja/ai'

// Auto-detect provider from environment
const result = await lint(templateSource)

// Specify provider and options
const result = await lint(templateSource, {
  provider: 'anthropic',
  apiKey: 'sk-ant-...',
  model: 'claude-sonnet-4-20250514'
})

// Check results
console.log(result.errors)      // Syntax errors
console.log(result.warnings)    // Security, performance issues
console.log(result.suggestions) // Best practice recommendations
console.log(result.provider)    // Which AI was used
```

## What It Detects

### Security

| Issue | Example |
|-------|---------|
| XSS vulnerability | `{{ user_input\|safe }}` on untrusted data |
| Sensitive data exposure | `{{ user.password }}` in template |
| Unsafe URL handling | `href="{{ url }}"` without encoding |

### Performance

| Issue | Example |
|-------|---------|
| Heavy filters in loops | `{% for x in items %}{{ x\|sort }}{% endfor %}` |
| Repeated calculations | Same filter applied multiple times |
| Large data rendering | Rendering huge lists without pagination |

### Accessibility

| Issue | Example |
|-------|---------|
| Missing alt text | `<img src="{{ url }}">` |
| Forms without labels | `<input>` without associated `<label>` |
| Missing ARIA attributes | Interactive elements without roles |

### Best Practices

| Issue | Example |
|-------|---------|
| Missing empty block | `{% for %}` without `{% empty %}` |
| Deep nesting | More than 3-4 levels of nesting |
| Unused variables | Variables in context but never used |
| Complex conditionals | Long chains of `{% elif %}` |

## Provider Comparison

| Provider | API Key | Speed | Cost | Best For |
|----------|---------|-------|------|----------|
| **Anthropic** | `ANTHROPIC_API_KEY` | Fast | Paid | Best quality |
| **OpenAI** | `OPENAI_API_KEY` | Fast | Paid | Good quality |
| **Groq** | `GROQ_API_KEY` | Very Fast | Free tier | Quick checks |
| **Ollama** | None (local) | Varies | Free | Privacy, offline |

Auto-detect priority: Anthropic → OpenAI → Groq → Ollama

## Response Format

```typescript
interface LintResult {
  valid: boolean
  errors: Issue[]
  warnings: Issue[]
  suggestions: Issue[]
  provider: string
}

interface Issue {
  line: number
  column?: number
  type: 'security' | 'performance' | 'accessibility' | 'best-practice'
  severity: 'error' | 'warning' | 'info'
  message: string
  fix?: string
}
```

## CI/CD Integration

### GitHub Actions

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
        run: bunx binja lint ./templates --ai --format json > lint-results.json

      - name: Check for errors
        run: |
          if jq -e '.errors | length > 0' lint-results.json; then
            echo "Template errors found!"
            exit 1
          fi
```

## Local Development with Ollama

For free, private, offline linting:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
ollama serve

# Pull a model
ollama pull llama2

# Use with binja
binja lint ./templates --ai=ollama
```

## Customization

```typescript
const result = await lint(template, {
  provider: 'anthropic',
  // Focus on specific categories
  checks: ['security', 'accessibility'],
  // Ignore specific rules
  ignore: ['missing-empty-block'],
  // Custom severity thresholds
  minSeverity: 'warning',
})
```
