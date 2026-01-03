/**
 * AI Lint Prompt Engineering
 */

import type { IssueType } from './types'

export const LINT_PROMPT = `Analyze this Jinja2/Django template for issues.

TEMPLATE:
\`\`\`jinja
{{TEMPLATE}}
\`\`\`

Check for:

1. SECURITY
   - XSS vulnerabilities (unescaped user input, |safe on untrusted data)
   - Variables in onclick/onerror/javascript: without escapejs
   - Sensitive data exposure (passwords, tokens, API keys)
   - SQL/command injection patterns

2. PERFORMANCE
   - Heavy filters inside loops (date, filesizeformat)
   - Repeated filter calls on same value (use {% with %})
   - N+1 query patterns (accessing relations in loops)

3. ACCESSIBILITY
   - Images without alt text
   - Forms without labels
   - Missing ARIA attributes on interactive elements
   - Poor heading hierarchy

4. BEST PRACTICES
   - {% for %} without {% empty %}
   - Deeply nested conditionals (>3 levels)
   - Magic numbers/strings (should be variables)
   - Deprecated filter usage

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "issues": [
    {
      "line": 1,
      "type": "security|performance|accessibility|best-practice",
      "severity": "error|warning|suggestion",
      "message": "Brief description",
      "suggestion": "How to fix"
    }
  ]
}

If no issues found, return: {"issues": []}`

/**
 * Build prompt with optional category filter
 */
export function buildPrompt(categories?: IssueType[]): string {
  if (!categories || categories.length === 0) {
    return LINT_PROMPT
  }

  // Filter the prompt to only include requested categories
  const categoryMap: Record<IssueType, string> = {
    syntax: 'SYNTAX',
    security: 'SECURITY',
    performance: 'PERFORMANCE',
    accessibility: 'ACCESSIBILITY',
    'best-practice': 'BEST PRACTICES',
    deprecated: 'DEPRECATED',
  }

  const requested = categories.map((c) => categoryMap[c]).filter(Boolean)

  return LINT_PROMPT.replace(
    /Check for:[\s\S]*?Respond ONLY/,
    `Check ONLY for: ${requested.join(', ')}\n\nRespond ONLY`
  )
}
