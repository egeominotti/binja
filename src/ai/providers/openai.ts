/**
 * OpenAI Provider
 */

import type { AIProvider } from '../types'

export function createOpenAIProvider(model?: string, apiKey?: string): AIProvider {
  const key = apiKey || process.env.OPENAI_API_KEY

  return {
    name: 'openai',

    async available(): Promise<boolean> {
      return !!key
    },

    async analyze(template: string, prompt: string): Promise<string> {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: key })

      const response = await client.chat.completions.create({
        model: model || 'gpt-4o-mini',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt.replace('{{TEMPLATE}}', template),
          },
        ],
      })

      return response.choices[0]?.message?.content || ''
    },
  }
}
