/**
 * AI Linting Types
 */

export type IssueSeverity = 'error' | 'warning' | 'suggestion'

export type IssueType =
  | 'syntax'
  | 'security'
  | 'performance'
  | 'accessibility'
  | 'best-practice'
  | 'deprecated'

export interface Issue {
  line: number
  column?: number
  type: IssueType
  severity: IssueSeverity
  message: string
  suggestion?: string
  code?: string
}

export interface LintResult {
  valid: boolean
  errors: Issue[]
  warnings: Issue[]
  suggestions: Issue[]
  provider?: string
  duration?: number
}

export interface LintOptions {
  /** AI provider to use: 'auto', 'anthropic', 'openai', 'ollama', 'groq' */
  provider?: 'auto' | 'anthropic' | 'openai' | 'ollama' | 'groq'
  /** Model to use (provider-specific) */
  model?: string
  /** API key (alternative to environment variable) */
  apiKey?: string
  /** Ollama server URL (default: http://localhost:11434) */
  ollamaUrl?: string
  /** Categories to check */
  categories?: IssueType[]
  /** Maximum issues to return */
  maxIssues?: number
}

export interface AIProvider {
  name: string
  available: () => Promise<boolean>
  analyze: (template: string, prompt: string) => Promise<string>
}
