import { describe, expect, test } from 'bun:test'
import { parseAIResponse, syntaxCheck } from '../src/ai/lint'

describe('AI lint boundaries', () => {
  test('rejects malformed provider output instead of reporting a clean analysis', () => {
    expect(() => parseAIResponse('analysis complete: everything looks fine')).toThrow('valid JSON')
    expect(() => parseAIResponse('{}')).toThrow("'issues' array")
  })

  test('extracts and normalizes a fenced JSON response', () => {
    expect(
      parseAIResponse(`\`\`\`json
        {"issues":[{"line":2,"type":"a11y","severity":"info","message":"Add alt"}]}
      \`\`\``)
    ).toEqual([
      {
        line: 2,
        message: 'Add alt',
        severity: 'suggestion',
        suggestion: undefined,
        type: 'accessibility',
      },
    ])
  })

  test('syntax checking remains deterministic and provider-free', () => {
    expect(syntaxCheck('{{ value }}').valid).toBe(true)
    const invalid = syntaxCheck('{{ value')
    expect(invalid.valid).toBe(false)
    expect(invalid.errors).toHaveLength(1)
  })
})
