/**
 * Groq Provider (Fast & Free tier available)
 */

import type { AIProvider } from '../types'

export function createGroqProvider(model?: string, apiKey?: string): AIProvider {
  const key = apiKey || process.env.GROQ_API_KEY

  return {
    name: 'groq',

    async available(): Promise<boolean> {
      return !!key
    },

    async analyze(template: string, prompt: string): Promise<string> {
      if (!key) {
        throw new Error('Groq API key not provided')
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model || 'llama-3.1-70b-versatile',
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: prompt.replace('{{TEMPLATE}}', template),
            },
          ],
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Groq error: ${error}`)
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>
      }
      return data.choices[0]?.message?.content || ''
    },
  }
}
