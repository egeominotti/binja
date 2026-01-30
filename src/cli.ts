#!/usr/bin/env bun
/**
 * binja CLI - Template pre-compilation tool
 *
 * Usage:
 *   binja compile <templates-dir> -o <output-dir>
 *   binja compile page.html -o dist/
 *   binja watch <templates-dir> -o <output-dir>
 *
 * Examples:
 *   binja compile ./templates -o ./dist/templates
 *   binja compile ./templates -o ./dist --minify
 *   binja compile ./views/home.html -o ./compiled --name renderHome
 */

import * as fs from 'fs'
import * as path from 'path'
import { Lexer } from './lexer'
import { Parser } from './parser'
import { compileToString } from './compiler'
import { flattenTemplate, canFlatten, TemplateLoader } from './compiler/flattener'

const VERSION = '0.9.0'

interface CompileOptions {
  output: string
  minify: boolean
  watch: boolean
  name?: string
  extensions: string[]
  verbose: boolean
}

interface LintCliOptions {
  ai: boolean
  aiProvider?: 'auto' | 'anthropic' | 'openai' | 'ollama' | 'groq'
  format: 'text' | 'json'
  extensions: string[]
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

function log(msg: string) {
  console.log(msg)
}

function success(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`)
}

function warn(msg: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
}

function error(msg: string) {
  console.error(`${colors.red}✗${colors.reset} ${msg}`)
}

function printHelp() {
  console.log(`
${colors.cyan}binja${colors.reset} - High-performance template compiler

${colors.yellow}Usage:${colors.reset}
  binja compile <source> [options]    Compile templates to JavaScript
  binja check <source>                Check if templates can be AOT compiled
  binja lint <source> [options]       Lint templates for issues
  binja --help                        Show this help
  binja --version                     Show version

${colors.yellow}Compile Options:${colors.reset}
  -o, --output <dir>      Output directory (required)
  -n, --name <name>       Function name for single file compilation
  -m, --minify            Minify output
  -e, --ext <extensions>  File extensions to compile (default: .html,.jinja,.jinja2)
  -v, --verbose           Verbose output
  -w, --watch             Watch for changes and recompile

${colors.yellow}Lint Options:${colors.reset}
  --ai                    Enable AI-powered analysis (requires API key)
  --ai=<provider>         Use specific AI provider (anthropic, openai, groq, ollama)
  --format=<format>       Output format: text (default), json
  -e, --ext <extensions>  File extensions to lint

${colors.yellow}Examples:${colors.reset}
  ${colors.dim}# Compile all templates in a directory${colors.reset}
  binja compile ./templates -o ./dist/templates

  ${colors.dim}# Compile with minification${colors.reset}
  binja compile ./views -o ./compiled --minify

  ${colors.dim}# Compile single file with custom function name${colors.reset}
  binja compile ./templates/home.html -o ./dist --name renderHome

  ${colors.dim}# Watch mode for development${colors.reset}
  binja compile ./templates -o ./dist --watch

  ${colors.dim}# Lint templates (syntax only)${colors.reset}
  binja lint ./templates

  ${colors.dim}# Lint with AI analysis${colors.reset}
  binja lint ./templates --ai

  ${colors.dim}# Lint with specific AI provider${colors.reset}
  binja lint ./templates --ai=ollama

${colors.yellow}Output:${colors.reset}
  Generated files export a render function:

    ${colors.dim}// dist/templates/home.js${colors.reset}
    export function render(ctx) { ... }

    ${colors.dim}// Usage${colors.reset}
    import { render } from './dist/templates/home.js'
    const html = render({ title: 'Hello' })
`)
}

interface ParsedArgs {
  command: string
  source: string
  compileOptions: CompileOptions
  lintOptions: LintCliOptions
}

function parseArgs(args: string[]): ParsedArgs {
  const compileOptions: CompileOptions = {
    output: '',
    minify: false,
    watch: false,
    extensions: ['.html', '.jinja', '.jinja2'],
    verbose: false,
  }

  const lintOptions: LintCliOptions = {
    ai: false,
    format: 'text',
    extensions: ['.html', '.jinja', '.jinja2'],
  }

  let command = ''
  let source = ''

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === 'compile' || arg === 'check' || arg === 'watch' || arg === 'lint') {
      command = arg
      if (arg === 'watch') {
        compileOptions.watch = true
        command = 'compile'
      }
    } else if (arg === '-o' || arg === '--output') {
      compileOptions.output = args[++i]
    } else if (arg === '-n' || arg === '--name') {
      compileOptions.name = args[++i]
    } else if (arg === '-m' || arg === '--minify') {
      compileOptions.minify = true
    } else if (arg === '-w' || arg === '--watch') {
      compileOptions.watch = true
    } else if (arg === '-v' || arg === '--verbose') {
      compileOptions.verbose = true
    } else if (arg === '-e' || arg === '--ext') {
      const exts = args[++i].split(',').map((e) => (e.startsWith('.') ? e : `.${e}`))
      compileOptions.extensions = exts
      lintOptions.extensions = exts
    } else if (arg === '--ai') {
      lintOptions.ai = true
    } else if (arg.startsWith('--ai=')) {
      lintOptions.ai = true
      lintOptions.aiProvider = arg.split('=')[1] as LintCliOptions['aiProvider']
    } else if (arg.startsWith('--format=')) {
      lintOptions.format = arg.split('=')[1] as 'text' | 'json'
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else if (arg === '--version' || arg === '-V') {
      console.log(`binja v${VERSION}`)
      process.exit(0)
    } else if (!arg.startsWith('-') && !source) {
      source = arg
    }
  }

  return { command, source, compileOptions, lintOptions }
}

function createTemplateLoader(baseDir: string, extensions: string[]): TemplateLoader {
  return {
    load(name: string): string {
      const basePath = path.resolve(baseDir, name)
      for (const ext of [...extensions, '']) {
        const fullPath = basePath + ext
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath, 'utf-8')
        }
      }
      throw new Error(`Template not found: ${name}`)
    },
    parse(source: string) {
      const lexer = new Lexer(source)
      const tokens = lexer.tokenize()
      const parser = new Parser(tokens)
      return parser.parse()
    },
  }
}

function generateOutputCode(code: string, functionName: string): string {
  // Generate ES module with runtime helpers
  return `// Generated by binja - DO NOT EDIT
// Source: binja compile

const escape = (v) => {
  if (v == null) return '';
  if (v?.__safe__ || v?.__safe) return String(v?.value ?? v);
  return Bun?.escapeHTML?.(String(v)) ?? String(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
};

const isTruthy = (v) => {
  if (v == null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') { for (const _ in v) return true; return false; }
  return true;
};

const toArray = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split('');
  if (typeof v === 'object') {
    if (typeof v[Symbol.iterator] === 'function') return [...v];
    return Object.entries(v);
  }
  return [];
};

const applyFilter = (name, value, ...args) => {
  throw new Error(\`Filter '\${name}' not available in compiled template. Use inline filters.\`);
};

const applyTest = (name, value, ...args) => {
  throw new Error(\`Test '\${name}' not available in compiled template.\`);
};

${code}

export { ${functionName} as render };
export default ${functionName};
`
}

async function compileFile(
  filePath: string,
  outputDir: string,
  baseDir: string,
  options: CompileOptions
): Promise<{ success: boolean; outputPath?: string; error?: string }> {
  try {
    const source = fs.readFileSync(filePath, 'utf-8')
    const loader = createTemplateLoader(baseDir, options.extensions)

    // Parse the template
    const ast = loader.parse(source)

    // Check if we can flatten (static extends/include)
    const check = canFlatten(ast)

    let finalAst = ast
    if (!check.canFlatten) {
      // Template has dynamic inheritance - compile without flattening
      if (options.verbose) {
        warn(
          `${path.basename(filePath)}: ${check.reason} - compiling without inheritance resolution`
        )
      }
    } else {
      // Flatten the template
      finalAst = flattenTemplate(ast, { loader })
    }

    // Determine function name
    const relativePath = path.relative(baseDir, filePath)
    const functionName =
      options.name ||
      'render' +
        relativePath
          .replace(/\.[^.]+$/, '')
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/^_+|_+$/g, '')
          .replace(/_([a-z])/g, (_, c) => c.toUpperCase())

    // Compile to JavaScript
    const code = compileToString(finalAst, {
      functionName,
      minify: options.minify,
    })

    // Generate output path
    const outputFileName = relativePath.replace(/\.[^.]+$/, '.js')
    const outputPath = path.join(outputDir, outputFileName)

    // Ensure output directory exists
    const outputDirPath = path.dirname(outputPath)
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true })
    }

    // Write output file
    const outputCode = generateOutputCode(code, functionName)
    fs.writeFileSync(outputPath, outputCode)

    return { success: true, outputPath }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function compileDirectory(
  sourceDir: string,
  outputDir: string,
  options: CompileOptions
): Promise<{ compiled: number; failed: number }> {
  let compiled = 0
  let failed = 0

  // Collect all files first
  const files: string[] = []

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        walkDir(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        if (options.extensions.includes(ext)) {
          files.push(fullPath)
        }
      }
    }
  }

  walkDir(sourceDir)

  // Compile all files
  for (const fullPath of files) {
    const result = await compileFile(fullPath, outputDir, sourceDir, options)

    if (result.success) {
      compiled++
      if (options.verbose) {
        success(
          `${path.relative(sourceDir, fullPath)} → ${path.relative(process.cwd(), result.outputPath!)}`
        )
      }
    } else {
      failed++
      error(`${path.relative(sourceDir, fullPath)}: ${result.error}`)
    }
  }

  return { compiled, failed }
}

async function checkTemplates(sourceDir: string, options: CompileOptions) {
  const loader = createTemplateLoader(sourceDir, options.extensions)
  let total = 0
  let canCompile = 0
  let cannotCompile = 0

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        walkDir(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        if (options.extensions.includes(ext)) {
          total++
          try {
            const source = fs.readFileSync(fullPath, 'utf-8')
            const ast = loader.parse(source)
            const check = canFlatten(ast)

            const relativePath = path.relative(sourceDir, fullPath)
            if (check.canFlatten) {
              canCompile++
              success(`${relativePath}`)
            } else {
              cannotCompile++
              warn(`${relativePath}: ${check.reason}`)
            }
          } catch (err: any) {
            cannotCompile++
            error(`${path.relative(sourceDir, fullPath)}: ${err.message}`)
          }
        }
      }
    }
  }

  walkDir(sourceDir)

  log('')
  log(`Total: ${total} templates`)
  log(`${colors.green}AOT compatible: ${canCompile}${colors.reset}`)
  if (cannotCompile > 0) {
    log(`${colors.yellow}Require runtime: ${cannotCompile}${colors.reset}`)
  }
}

async function watchAndCompile(sourceDir: string, outputDir: string, options: CompileOptions) {
  log(`${colors.cyan}Watching${colors.reset} ${sourceDir} for changes...`)
  log(`${colors.dim}Press Ctrl+C to stop${colors.reset}`)
  log('')

  // Initial compile
  const { compiled, failed } = await compileDirectory(sourceDir, outputDir, {
    ...options,
    verbose: true,
  })
  log('')
  log(`Compiled ${compiled} templates${failed > 0 ? `, ${failed} failed` : ''}`)
  log('')

  // Watch for changes
  const watcher = fs.watch(sourceDir, { recursive: true }, async (eventType, filename) => {
    if (!filename) return

    const ext = path.extname(filename)
    if (!options.extensions.includes(ext)) return

    const fullPath = path.join(sourceDir, filename)
    if (!fs.existsSync(fullPath)) return

    log(`${colors.dim}[${new Date().toLocaleTimeString()}]${colors.reset} ${filename} changed`)

    const result = await compileFile(fullPath, outputDir, sourceDir, options)
    if (result.success) {
      success(`Compiled ${filename}`)
    } else {
      error(`${filename}: ${result.error}`)
    }
  })

  process.on('SIGINT', () => {
    watcher.close()
    log('\nStopped watching.')
    process.exit(0)
  })
}

// Lint templates
async function lintTemplates(sourcePath: string, isDirectory: boolean, options: LintCliOptions) {
  type LintResult = {
    valid: boolean
    errors: Array<{
      line: number
      type: string
      severity: string
      message: string
      suggestion?: string
    }>
    warnings: Array<{
      line: number
      type: string
      severity: string
      message: string
      suggestion?: string
    }>
    suggestions: Array<{
      line: number
      type: string
      severity: string
      message: string
      suggestion?: string
    }>
    provider?: string
    duration?: number
  }

  // Dynamic import of AI module (optional dependency)
  let lintFn: (template: string, opts?: any) => Promise<LintResult>
  let syntaxCheckFn: (template: string) => LintResult

  if (options.ai) {
    try {
      const aiModule = await import('./ai')
      lintFn = aiModule.lint
      syntaxCheckFn = aiModule.syntaxCheck
    } catch (e: any) {
      error('AI lint requires the AI module.')
      error('Make sure you have an AI provider configured:')
      error('  - ANTHROPIC_API_KEY + bun add @anthropic-ai/sdk')
      error('  - OPENAI_API_KEY + bun add openai')
      error('  - GROQ_API_KEY')
      error('  - Ollama running locally')
      process.exit(1)
    }
  } else {
    // Syntax-only check
    syntaxCheckFn = (template: string): LintResult => {
      try {
        const lexer = new Lexer(template)
        const tokens = lexer.tokenize()
        const parser = new Parser(tokens, template)
        parser.parse()
        return { valid: true, errors: [], warnings: [], suggestions: [] }
      } catch (e: any) {
        return {
          valid: false,
          errors: [{ line: e.line || 1, type: 'syntax', severity: 'error', message: e.message }],
          warnings: [],
          suggestions: [],
        }
      }
    }
    lintFn = async (template: string) => syntaxCheckFn(template)
  }

  const files: string[] = []

  if (isDirectory) {
    function walkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walkDir(fullPath)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name)
          if (options.extensions.includes(ext)) {
            files.push(fullPath)
          }
        }
      }
    }
    walkDir(sourcePath)
  } else {
    files.push(sourcePath)
  }

  let totalErrors = 0
  let totalWarnings = 0
  let totalSuggestions = 0

  const allResults: Array<{ file: string; result: LintResult }> = []

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf-8')
    const result = await lintFn(source, {
      provider: options.aiProvider || 'auto',
    })

    allResults.push({ file, result })
    totalErrors += result.errors.length
    totalWarnings += result.warnings.length
    totalSuggestions += result.suggestions.length
  }

  // Output
  if (options.format === 'json') {
    console.log(JSON.stringify(allResults, null, 2))
  } else {
    for (const { file, result } of allResults) {
      const relativePath = path.relative(process.cwd(), file)
      const issues = [...result.errors, ...result.warnings, ...result.suggestions]

      if (issues.length === 0) continue

      log('')
      log(`  ${colors.cyan}${relativePath}${colors.reset}`)
      log('')

      for (const issue of issues) {
        const icon =
          issue.severity === 'error'
            ? colors.red + '✗'
            : issue.severity === 'warning'
              ? colors.yellow + '⚠'
              : colors.dim + '💡'
        const typeColor =
          issue.type === 'security'
            ? colors.red
            : issue.type === 'performance'
              ? colors.yellow
              : colors.dim

        log(
          `  ${icon}${colors.reset}  L${issue.line.toString().padEnd(4)} ${typeColor}${issue.type.padEnd(14)}${colors.reset} ${issue.message}`
        )
        if (issue.suggestion) {
          log(`                            ${colors.dim}→ ${issue.suggestion}${colors.reset}`)
        }
      }
    }

    log('')
    if (totalErrors === 0 && totalWarnings === 0 && totalSuggestions === 0) {
      success(`${files.length} template(s) checked, no issues found`)
    } else {
      const parts: string[] = []
      if (totalErrors > 0) parts.push(`${colors.red}${totalErrors} error(s)${colors.reset}`)
      if (totalWarnings > 0)
        parts.push(`${colors.yellow}${totalWarnings} warning(s)${colors.reset}`)
      if (totalSuggestions > 0) parts.push(`${totalSuggestions} suggestion(s)`)

      log(`  ${files.length} template(s): ${parts.join(', ')}`)

      if (allResults[0]?.result.provider) {
        log(`  ${colors.dim}AI provider: ${allResults[0].result.provider}${colors.reset}`)
      }
    }
  }

  if (totalErrors > 0) {
    process.exit(1)
  }
}

// Main
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    printHelp()
    process.exit(0)
  }

  const { command, source, compileOptions, lintOptions } = parseArgs(args)

  if (!command) {
    error('No command specified. Use "compile", "check", or "lint".')
    printHelp()
    process.exit(1)
  }

  if (!source) {
    error('No source path specified.')
    process.exit(1)
  }

  const sourcePath = path.resolve(source)

  if (!fs.existsSync(sourcePath)) {
    error(`Source not found: ${source}`)
    process.exit(1)
  }

  const isDirectory = fs.statSync(sourcePath).isDirectory()

  if (command === 'lint') {
    await lintTemplates(sourcePath, isDirectory, lintOptions)
  } else if (command === 'check') {
    if (isDirectory) {
      await checkTemplates(sourcePath, compileOptions)
    } else {
      const loader = createTemplateLoader(path.dirname(sourcePath), compileOptions.extensions)
      const src = fs.readFileSync(sourcePath, 'utf-8')
      const ast = loader.parse(src)
      const check = canFlatten(ast)

      if (check.canFlatten) {
        success(`${source} can be AOT compiled`)
      } else {
        warn(`${source}: ${check.reason}`)
      }
    }
  } else if (command === 'compile') {
    if (!compileOptions.output) {
      error('Output directory required. Use -o <dir>')
      process.exit(1)
    }

    const outputDir = path.resolve(compileOptions.output)

    if (compileOptions.watch) {
      if (!isDirectory) {
        error('Watch mode requires a directory, not a single file.')
        process.exit(1)
      }
      await watchAndCompile(sourcePath, outputDir, compileOptions)
    } else if (isDirectory) {
      const startTime = Date.now()
      const { compiled, failed } = await compileDirectory(sourcePath, outputDir, compileOptions)
      const elapsed = Date.now() - startTime

      log('')
      if (failed === 0) {
        success(`Compiled ${compiled} templates in ${elapsed}ms`)
      } else {
        warn(`Compiled ${compiled} templates, ${failed} failed (${elapsed}ms)`)
      }
    } else {
      const result = await compileFile(
        sourcePath,
        outputDir,
        path.dirname(sourcePath),
        compileOptions
      )

      if (result.success) {
        success(`Compiled to ${result.outputPath}`)
      } else {
        error(result.error!)
        process.exit(1)
      }
    }
  }
}

main().catch((err) => {
  error(err.message)
  process.exit(1)
})
