/**
 * Anthropic Claude Provider
 */

import type { AIProvider } from '../types'

export function createAnthropicProvider(model?: string, apiKey?: string): AIProvider {
  const key = apiKey || process.env.ANTHROPIC_API_KEY

  return {
    name: 'anthropic',

    async available(): Promise<boolean> {
      return !!key
    },

    async analyze(template: string, prompt: string): Promise<string> {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: key })

      const response = await client.messages.create({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt.replace('{{TEMPLATE}}', template),
          },
        ],
      })

      const content = response.content[0]
      if (content.type === 'text') {
        return content.text
      }
      throw new Error('Unexpected response type from Anthropic')
    },
  }
}
