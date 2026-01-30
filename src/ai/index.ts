/**
 * binja AI Module - Optional AI-powered template linting
 *
 * This module is opt-in and requires an AI provider:
 * - Anthropic Claude: bun add @anthropic-ai/sdk + ANTHROPIC_API_KEY
 * - OpenAI GPT-4: bun add openai + OPENAI_API_KEY
 * - Groq (free): GROQ_API_KEY
 * - Ollama (local): ollama running on localhost:11434
 *
 * @example
 * ```typescript
 * import { lint } from 'binja/ai'
 *
 * const result = await lint(template)
 * console.log(result.warnings) // AI-detected issues
 * ```
 *
 * @module binja/ai
 */

export { lint, syntaxCheck } from './lint'
export { resolveProvider, detectProvider, getProvider } from './providers'
export {
  createAnthropicProvider,
  createOpenAIProvider,
  createOllamaProvider,
  createGroqProvider,
} from './providers'

export type { Issue, IssueType, IssueSeverity, LintResult, LintOptions, AIProvider } from './types'
