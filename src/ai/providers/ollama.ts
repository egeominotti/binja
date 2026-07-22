/**
 * Ollama Provider (Local)
 */

import type { AIProvider } from '../types'

export function createOllamaProvider(model?: string, baseUrl?: string): AIProvider {
  const url = baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434'
  const selectedModel = model || process.env.OLLAMA_MODEL || 'llama3.1'

  return {
    name: 'ollama',

    async available(): Promise<boolean> {
      try {
        const response = await fetch(`${url}/api/tags`, {
          signal: AbortSignal.timeout(2000),
        })
        return response.ok
      } catch {
        return false
      }
    },

    async analyze(template: string, prompt: string): Promise<string> {
      const response = await fetch(`${url}/api/generate`, {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt.replace('{{TEMPLATE}}', template),
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`)
      }

      const data = (await response.json()) as { response: string }
      return data.response
    },
  }
}
