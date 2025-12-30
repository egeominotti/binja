/**
 * Example: Using Binja Native (Zig FFI) Lexer
 *
 * The native lexer is 3-7x faster than pure TypeScript for large templates.
 */

// Option 1: Direct native import (throws if not available)
import {
  NativeLexer,
  tokenize,
  tokenizeCount,
  isNativeAvailable,
  nativeVersion,
  TokenType,
} from '../src/native'

// Option 2: From main package (when published)
// import { NativeLexer, isNativeAvailable } from 'binja/native'

const template = `
<!DOCTYPE html>
<html>
<head><title>{{ title }}</title></head>
<body>
  {% for item in items %}
    <div class="{{ item.class }}">
      {{ item.name|upper }}
    </div>
  {% endfor %}
</body>
</html>
`

console.log('=== Binja Native Example ===\n')

// Check if native is available
if (isNativeAvailable()) {
  console.log(`Native library: available (v${nativeVersion()})`)
} else {
  console.log('Native library: not available (using fallback)')
  process.exit(1)
}

// Quick token count (fastest)
console.log(`\nQuick token count: ${tokenizeCount(template)} tokens`)

// Get all tokens at once
console.log('\n--- tokenize() ---')
const tokens = tokenize(template)
console.log(`Got ${tokens.length} tokens`)
tokens.slice(0, 5).forEach((t, i) => {
  console.log(`  ${i}: type=${t.type} "${t.value.slice(0, 30).replace(/\n/g, '\\n')}"`)
})

// Manual lexer control (for streaming or custom processing)
console.log('\n--- NativeLexer class ---')
const lexer = new NativeLexer(template)
try {
  console.log(`Token count: ${lexer.tokenCount}`)

  // Access individual tokens
  for (let i = 0; i < Math.min(5, lexer.tokenCount); i++) {
    const type = lexer.getTokenType(i)
    const value = lexer.getTokenValue(i).slice(0, 30).replace(/\n/g, '\\n')
    console.log(`  ${i}: type=${type} "${value}"`)
  }
} finally {
  // Always free native memory!
  lexer.free()
}

// Using with 'using' statement (automatic cleanup)
console.log('\n--- Using statement (auto-cleanup) ---')
{
  using lexer2 = new NativeLexer('Hello {{ name }}!')
  console.log(`Tokens: ${lexer2.tokenCount}`)
} // lexer2.free() called automatically

// Benchmark comparison
console.log('\n--- Quick Benchmark ---')
const ITERATIONS = 10000

// Warmup
for (let i = 0; i < 1000; i++) tokenizeCount(template)

const start = performance.now()
for (let i = 0; i < ITERATIONS; i++) {
  tokenizeCount(template)
}
const time = performance.now() - start
const ops = Math.round(ITERATIONS / (time / 1000))

console.log(`${ITERATIONS.toLocaleString()} iterations in ${time.toFixed(0)}ms`)
console.log(`Speed: ${ops.toLocaleString()} ops/s`)

console.log('\n=== Done ===')
