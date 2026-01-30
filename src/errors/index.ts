/**
 * Rich Error Formatting for binja
 *
 * Provides detailed error messages with:
 * - Source code context (snippet)
 * - Caret pointer to exact location
 * - "Did you mean?" suggestions
 * - ANSI colors for terminal output
 */

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
}

// Check if colors should be used
const useColors = process.stdout?.isTTY !== false

function c(color: keyof typeof colors, text: string): string {
  return useColors ? `${colors[color]}${text}${colors.reset}` : text
}

export interface ErrorLocation {
  line: number
  column: number
  source?: string
  templateName?: string
}

export interface ErrorOptions extends ErrorLocation {
  suggestion?: string
  availableOptions?: string[]
}

/**
 * Base template error with rich formatting
 */
export class TemplateError extends Error {
  public line: number
  public column: number
  public source?: string
  public templateName?: string
  public suggestion?: string
  public availableOptions?: string[]

  constructor(message: string, options: ErrorOptions) {
    const formatted = formatError('TemplateError', message, options)
    super(formatted)
    this.name = 'TemplateError'
    this.line = options.line
    this.column = options.column
    this.source = options.source
    this.templateName = options.templateName
    this.suggestion = options.suggestion
    this.availableOptions = options.availableOptions
  }
}

/**
 * Syntax errors (lexer/parser)
 */
export class TemplateSyntaxError extends Error {
  public line: number
  public column: number
  public source?: string
  public templateName?: string
  public suggestion?: string

  constructor(message: string, options: ErrorOptions) {
    const formatted = formatError('TemplateSyntaxError', message, options)
    super(formatted)
    this.name = 'TemplateSyntaxError'
    this.line = options.line
    this.column = options.column
    this.source = options.source
    this.templateName = options.templateName
    this.suggestion = options.suggestion
  }
}

/**
 * Runtime errors (undefined variables, filter errors)
 */
export class TemplateRuntimeError extends Error {
  public line: number
  public column: number
  public source?: string
  public templateName?: string
  public suggestion?: string
  public availableOptions?: string[]

  constructor(message: string, options: ErrorOptions) {
    const formatted = formatError('TemplateRuntimeError', message, options)
    super(formatted)
    this.name = 'TemplateRuntimeError'
    this.line = options.line
    this.column = options.column
    this.source = options.source
    this.templateName = options.templateName
    this.suggestion = options.suggestion
    this.availableOptions = options.availableOptions
  }
}

/**
 * Format error with source context and suggestions
 */
function formatError(type: string, message: string, options: ErrorOptions): string {
  const parts: string[] = []

  // Header: ErrorType: message at line X, column Y
  const location = options.templateName
    ? `${options.templateName}:${options.line}:${options.column}`
    : `line ${options.line}, column ${options.column}`

  parts.push(`${c('red', c('bold', type))}: ${message} at ${c('cyan', location)}`)

  // Source snippet with caret
  if (options.source) {
    parts.push('')
    parts.push(generateSnippet(options.source, options.line, options.column))
  }

  // Suggestion
  if (options.suggestion) {
    parts.push('')
    parts.push(`${c('yellow', 'Did you mean')}: ${c('cyan', options.suggestion)}?`)
  }

  // Available options (for unknown filter/test)
  if (options.availableOptions && options.availableOptions.length > 0) {
    parts.push('')
    const truncated = options.availableOptions.slice(0, 8)
    const more =
      options.availableOptions.length > 8
        ? ` ${c('gray', `... and ${options.availableOptions.length - 8} more`)}`
        : ''
    parts.push(`${c('gray', 'Available')}: ${truncated.join(', ')}${more}`)
  }

  return parts.join('\n')
}

/**
 * Generate source snippet with line numbers and caret
 */
function generateSnippet(source: string, errorLine: number, errorColumn: number): string {
  const lines = source.split('\n')
  const parts: string[] = []

  // Determine line range (2 lines before, error line, 1 line after)
  const startLine = Math.max(1, errorLine - 2)
  const endLine = Math.min(lines.length, errorLine + 1)

  // Calculate gutter width for line numbers
  const gutterWidth = String(endLine).length

  for (let i = startLine; i <= endLine; i++) {
    const lineContent = lines[i - 1] || ''
    const lineNum = String(i).padStart(gutterWidth, ' ')
    const isErrorLine = i === errorLine

    if (isErrorLine) {
      // Error line with arrow
      parts.push(
        `${c('red', ' \u2192')} ${c('gray', lineNum)} ${c('dim', '\u2502')} ${lineContent}`
      )

      // Caret line
      const caretPadding = ' '.repeat(gutterWidth + 4 + Math.max(0, errorColumn - 1))
      const caret = c('red', '^')
      parts.push(`${caretPadding}${caret}`)
    } else {
      // Context line
      parts.push(`  ${c('gray', lineNum)} ${c('dim', '\u2502')} ${c('gray', lineContent)}`)
    }
  }

  return parts.join('\n')
}

/**
 * Find similar string (for "Did you mean?" suggestions)
 * Uses Levenshtein distance
 */
export function findSimilar(input: string, candidates: string[], maxDistance = 3): string | null {
  let bestMatch: string | null = null
  let bestDistance = maxDistance + 1

  const inputLower = input.toLowerCase()

  for (const candidate of candidates) {
    const distance = levenshteinDistance(inputLower, candidate.toLowerCase())
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = candidate
    }
  }

  return bestDistance <= maxDistance ? bestMatch : null
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Helper to create errors with source context
 */
export function createSyntaxError(
  message: string,
  line: number,
  column: number,
  source?: string,
  suggestion?: string
): TemplateSyntaxError {
  return new TemplateSyntaxError(message, { line, column, source, suggestion })
}

export function createRuntimeError(
  message: string,
  line: number,
  column: number,
  source?: string,
  suggestion?: string,
  availableOptions?: string[]
): TemplateRuntimeError {
  return new TemplateRuntimeError(message, { line, column, source, suggestion, availableOptions })
}
