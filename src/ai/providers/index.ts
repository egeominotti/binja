/**
 * AI Provider Manager - Auto-detect and create providers
 */

import type { AIProvider, LintOptions } from '../types'
import { createAnthropicProvider } from './anthropic'
import { createOpenAIProvider } from './openai'
import { createOllamaProvider } from './ollama'
import { createGroqProvider } from './groq'

/**
 * Get a specific provider by name
 */
export function getProvider(
  name: 'anthropic' | 'openai' | 'ollama' | 'groq',
  options: LintOptions = {}
): AIProvider {
  switch (name) {
    case 'anthropic':
      return createAnthropicProvider(options.model, options.apiKey)
    case 'openai':
      return createOpenAIProvider(options.model, options.apiKey)
    case 'ollama':
      return createOllamaProvider(options.model, options.ollamaUrl)
    case 'groq':
      return createGroqProvider(options.model, options.apiKey)
    default:
      throw new Error(`Unknown provider: ${name}`)
  }
}

/**
 * Auto-detect available provider
 * Priority: Anthropic > OpenAI > Groq > Ollama
 */
export async function detectProvider(
  options: LintOptions = {}
): Promise<AIProvider> {
  // Try in order of preference
  const providers: Array<{
    name: 'anthropic' | 'openai' | 'groq' | 'ollama'
    create: () => AIProvider
  }> = [
    { name: 'anthropic', create: () => createAnthropicProvider(options.model, options.apiKey) },
    { name: 'openai', create: () => createOpenAIProvider(options.model, options.apiKey) },
    { name: 'groq', create: () => createGroqProvider(options.model, options.apiKey) },
    {
      name: 'ollama',
      create: () => createOllamaProvider(options.model, options.ollamaUrl),
    },
  ]

  for (const { name, create } of providers) {
    const provider = create()
    if (await provider.available()) {
      return provider
    }
  }

  throw new Error(
    'No AI provider available.\n\n' +
      'Configure one of the following:\n' +
      '  - ANTHROPIC_API_KEY (Claude)\n' +
      '  - OPENAI_API_KEY (GPT-4)\n' +
      '  - GROQ_API_KEY (Llama, free tier)\n' +
      '  - Ollama running locally (http://localhost:11434)\n\n' +
      'Install SDK if needed:\n' +
      '  bun add @anthropic-ai/sdk   # for Claude\n' +
      '  bun add openai              # for OpenAI'
  )
}

/**
 * Get provider based on options (auto or specific)
 */
export async function resolveProvider(
  options: LintOptions = {}
): Promise<AIProvider> {
  const providerName = options.provider || 'auto'

  if (providerName === 'auto') {
    return detectProvider(options)
  }

  const provider = getProvider(providerName, options)
  if (!(await provider.available())) {
    throw new Error(
      `Provider '${providerName}' is not available. Check your API key or configuration.`
    )
  }

  return provider
}

export { createAnthropicProvider } from './anthropic'
export { createOpenAIProvider } from './openai'
export { createOllamaProvider } from './ollama'
export { createGroqProvider } from './groq'
