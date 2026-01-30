---
title: Installation
description: How to install binja in your Bun project
---

## Requirements

binja requires [Bun](https://bun.sh) runtime. Node.js is not supported.

```bash
# Install Bun if you haven't already
curl -fsSL https://bun.sh/install | bash
```

## Install binja

```bash
bun add binja
```

That's it! No external dependencies required.

## Optional: AI Linting

If you want to use AI-powered template linting, install the SDK for your preferred provider:

```bash
# For Claude (Anthropic)
bun add @anthropic-ai/sdk

# For OpenAI
bun add openai

# For Ollama (local) or Groq - no package needed
```

## Verify Installation

Create a simple test file:

```typescript
// test.ts
import { render } from 'binja'

const html = await render('Hello, {{ name }}!', { name: 'binja' })
console.log(html) // Output: Hello, binja!
```

Run it:

```bash
bun run test.ts
```

## TypeScript Configuration

binja is written in TypeScript and includes full type definitions. No additional configuration needed.

```typescript
import { render, compile, Environment } from 'binja'
import type { FilterFunction, Context } from 'binja'
```

## Project Structure (Recommended)

```
my-app/
├── src/
│   ├── index.ts
│   └── routes/
├── views/           # Template files
│   ├── base.html
│   ├── pages/
│   │   ├── home.html
│   │   └── about.html
│   └── components/
│       ├── header.html
│       └── footer.html
├── package.json
└── tsconfig.json
```

## Next Steps

- [Quick Start](/binja/guide/quickstart/) - Create your first template
- [Environment](/binja/api/environment/) - Configure template loading
