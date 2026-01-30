/**
 * Ollama Provider (Local)
 */

import type { AIProvider } from '../types'

export function createOllamaProvider(model?: string, baseUrl?: string): AIProvider {
  const url = baseUrl || 'http://localhost:11434'

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3.1',
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
