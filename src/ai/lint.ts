/**
 * AI-powered Template Linting
 */

import { Lexer } from '../lexer'
import { Parser } from '../parser'
import type { Issue, LintResult, LintOptions } from './types'
import { resolveProvider } from './providers'
import { buildPrompt } from './prompt'

/**
 * Lint a template using AI analysis
 *
 * @example
 * ```typescript
 * import { lint } from 'binja/ai'
 *
 * const result = await lint(`
 *   {% for p in products %}
 *     <div onclick="buy({{ p.id }})">{{ p.name }}</div>
 *   {% endfor %}
 * `)
 *
 * // result.warnings = [{ type: 'security', message: 'XSS: unescaped in onclick' }]
 * ```
 */
export async function lint(template: string, options: LintOptions = {}): Promise<LintResult> {
  const startTime = Date.now()

  const result: LintResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  }

  // 1. Syntax check with parser (no AI needed)
  try {
    const lexer = new Lexer(template)
    const tokens = lexer.tokenize()
    const parser = new Parser(tokens, template)
    parser.parse()
  } catch (e: any) {
    result.valid = false
    result.errors.push({
      line: e.line || 1,
      type: 'syntax',
      severity: 'error',
      message: e.message,
    })
    result.duration = Date.now() - startTime
    return result // Stop if syntax is broken
  }

  // 2. AI analysis
  try {
    const provider = await resolveProvider(options)
    result.provider = provider.name

    const prompt = buildPrompt(options.categories)
    const response = await provider.analyze(template, prompt)

    // Parse AI response
    const issues = parseAIResponse(response)

    // Categorize issues
    for (const issue of issues) {
      if (
        options.maxIssues !== undefined &&
        result.errors.length + result.warnings.length + result.suggestions.length >=
          Math.max(0, Math.trunc(options.maxIssues))
      ) {
        break
      }

      switch (issue.severity) {
        case 'error':
          result.errors.push(issue)
          break
        case 'warning':
          result.warnings.push(issue)
          break
        case 'suggestion':
          result.suggestions.push(issue)
          break
      }
    }

    result.valid = result.errors.length === 0
  } catch (e: any) {
    // AI analysis failed, but syntax is valid
    result.warnings.push({
      line: 0,
      type: 'best-practice',
      severity: 'warning',
      message: `AI analysis failed: ${e.message}`,
    })
  }

  result.duration = Date.now() - startTime
  return result
}

/**
 * Parse AI response JSON
 */
export function parseAIResponse(response: string): Issue[] {
  let parsed: unknown
  try {
    // Try to extract JSON from response (in case of markdown wrapping)
    let jsonStr = response.trim()

    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    // Find JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      jsonStr = objectMatch[0]
    }

    parsed = JSON.parse(jsonStr)
  } catch (error) {
    throw new Error('AI provider did not return valid JSON', { cause: error })
  }

  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    !('issues' in parsed) ||
    !Array.isArray(parsed.issues)
  ) {
    throw new Error("AI provider response must contain an 'issues' array")
  }

  // Validate and normalize issues
  return parsed.issues
    .filter((issue: any) => issue && typeof issue === 'object')
    .map((issue: any) => ({
      line:
        typeof issue.line === 'number' && Number.isFinite(issue.line)
          ? Math.max(1, Math.trunc(issue.line))
          : 1,
      type: normalizeType(issue.type),
      severity: normalizeSeverity(issue.severity),
      message: String(issue.message || 'Unknown issue'),
      suggestion: issue.suggestion ? String(issue.suggestion) : undefined,
    }))
}

function normalizeType(type: string): Issue['type'] {
  const typeMap: Record<string, Issue['type']> = {
    security: 'security',
    performance: 'performance',
    accessibility: 'accessibility',
    a11y: 'accessibility',
    'best-practice': 'best-practice',
    'best-practices': 'best-practice',
    bestpractice: 'best-practice',
    deprecated: 'deprecated',
    syntax: 'syntax',
  }
  return typeMap[String(type).toLowerCase()] || 'best-practice'
}

function normalizeSeverity(severity: string): Issue['severity'] {
  const sevMap: Record<string, Issue['severity']> = {
    error: 'error',
    warning: 'warning',
    warn: 'warning',
    suggestion: 'suggestion',
    info: 'suggestion',
    hint: 'suggestion',
  }
  return sevMap[String(severity).toLowerCase()] || 'warning'
}

/**
 * Quick syntax check without AI (fast, sync)
 */
export function syntaxCheck(template: string): LintResult {
  const result: LintResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  }

  try {
    const lexer = new Lexer(template)
    const tokens = lexer.tokenize()
    const parser = new Parser(tokens, template)
    parser.parse()
  } catch (e: any) {
    result.valid = false
    result.errors.push({
      line: e.line || 1,
      type: 'syntax',
      severity: 'error',
      message: e.message,
    })
  }

  return result
}
