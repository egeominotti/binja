/**
 * Benchmark Comparison: Original vs Optimized Lexer
 */

import { Lexer } from '../src/lexer'
import { LexerOptimized } from './lexer-optimized'

const templates = {
  textHeavy: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to our website</title>
      <link rel="stylesheet" href="/styles/main.css">
      <script src="/scripts/app.js"></script>
    </head>
    <body>
      <header class="site-header">
        <nav class="main-navigation">
          <ul class="nav-list">
            <li><a href="/">Home</a></li>
            <li><a href="/about">About Us</a></li>
            <li><a href="/services">Services</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      </header>
      <main class="content">
        <article class="post">
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        </article>
      </main>
      <footer>Copyright 2024</footer>
    </body>
    </html>
    {{ title }}
  `,

  balanced: `
    <div class="container">
      <h1>{{ title }}</h1>
      <p class="description">{{ description }}</p>
      {% for item in items %}
        <div class="item">
          <span>{{ item.name }}</span>
          <span>{{ item.price|currency }}</span>
        </div>
      {% endfor %}
      {% if show_footer %}
        <footer>{{ footer_text }}</footer>
      {% endif %}
    </div>
  `,

  delimiterDense: `
    {{ a }}{{ b }}{{ c }}{{ d }}{{ e }}
    {% if x %}{{ x }}{% endif %}
    {% for i in items %}{{ i }}{% endfor %}
    {{ name|upper|trim }}{{ value|default:"N/A" }}
    {% with total=price|add:tax %}{{ total }}{% endwith %}
  `,

  longText: `
    ${'A'.repeat(1000)}
    {{ variable }}
    ${'B'.repeat(1000)}
    {% if condition %}
    ${'C'.repeat(1000)}
    {% endif %}
    ${'D'.repeat(1000)}
  `,

  loneBraces: `
    function test() { return { a: 1, b: 2 }; }
    const obj = { name: "test", value: { nested: true } };
    if (x) { console.log("hello"); }
    {{ actual_variable }}
    more code { with braces } here
  `,

  ecommerce: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>{{ shop.name }} - {{ page_title }}</title>
      <meta name="description" content="{{ page_description }}">
    </head>
    <body>
      <header>
        <h1>{{ shop.name }}</h1>
        <nav>
          {% for link in navigation %}
            <a href="{{ link.url }}">{{ link.title }}</a>
          {% endfor %}
        </nav>
        <div class="cart">
          <span>{{ cart.item_count }} items</span>
          <span>{{ cart.total|money }}</span>
        </div>
      </header>

      <main>
        {% for product in products %}
          <article class="product-card">
            <img src="{{ product.image|img_url:'medium' }}" alt="{{ product.title }}">
            <h2>{{ product.title }}</h2>
            <p>{{ product.description|truncate:100 }}</p>
            <span class="price">{{ product.price|money }}</span>
            {% if product.compare_at_price > product.price %}
              <span class="sale">Save {{ product.compare_at_price|minus:product.price|money }}</span>
            {% endif %}
            <button>Add to Cart</button>
          </article>
        {% endfor %}
      </main>

      <footer>
        <p>&copy; {{ "now"|date:"Y" }} {{ shop.name }}. All rights reserved.</p>
      </footer>
    </body>
    </html>
  `,

  // Extra large text-heavy template
  veryLongText: `
    ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100)}
    {{ single_variable }}
    ${'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(100)}
  `,
}

function benchmark(name: string, fn: () => void, iterations: number = 10000): number {
  // Warmup
  for (let i = 0; i < 100; i++) fn()

  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const elapsed = performance.now() - start

  return Math.round(1000 / (elapsed / iterations))
}

// Verify both lexers produce same output
function verifyOutput(template: string): boolean {
  const original = new Lexer(template).tokenize()
  const optimized = new LexerOptimized(template).tokenize()

  if (original.length !== optimized.length) {
    console.error(`Token count mismatch: ${original.length} vs ${optimized.length}`)
    return false
  }

  for (let i = 0; i < original.length; i++) {
    if (original[i].type !== optimized[i].type ||
        original[i].value !== optimized[i].value) {
      console.error(`Token mismatch at ${i}: ${JSON.stringify(original[i])} vs ${JSON.stringify(optimized[i])}`)
      return false
    }
  }

  return true
}

console.log('=' .repeat(80))
console.log('LEXER COMPARISON: Original vs Optimized (indexOf-based scanText)')
console.log('=' .repeat(80))
console.log()

// Verify correctness first
console.log('Verifying output correctness...')
let allCorrect = true
for (const [name, template] of Object.entries(templates)) {
  const correct = verifyOutput(template)
  if (!correct) {
    console.error(`❌ ${name}: Output mismatch!`)
    allCorrect = false
  }
}

if (!allCorrect) {
  console.error('\n❌ Verification failed! Stopping benchmark.')
  process.exit(1)
}
console.log('✅ All outputs match!\n')

// Run benchmarks
console.log('| Template        | Chars  | Original    | Optimized   | Speedup |')
console.log('|-----------------|--------|-------------|-------------|---------|')

const results: { name: string; original: number; optimized: number; speedup: number }[] = []

for (const [name, template] of Object.entries(templates)) {
  const chars = template.length

  const originalOps = benchmark(`${name}-original`, () => {
    new Lexer(template).tokenize()
  })

  const optimizedOps = benchmark(`${name}-optimized`, () => {
    new LexerOptimized(template).tokenize()
  })

  const speedup = optimizedOps / originalOps

  results.push({ name, original: originalOps, optimized: optimizedOps, speedup })

  const speedupStr = speedup >= 1
    ? `+${((speedup - 1) * 100).toFixed(0)}%`.padStart(7)
    : `${((speedup - 1) * 100).toFixed(0)}%`.padStart(7)

  const speedupColor = speedup >= 1.1 ? '🟢' : speedup >= 0.95 ? '🟡' : '🔴'

  console.log(
    `| ${name.padEnd(15)} | ${String(chars).padStart(6)} | ${originalOps.toLocaleString().padStart(11)} | ${optimizedOps.toLocaleString().padStart(11)} | ${speedupColor} ${speedupStr} |`
  )
}

console.log()
console.log('=' .repeat(80))
console.log('SUMMARY')
console.log('=' .repeat(80))
console.log()

const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length
const bestCase = results.reduce((best, r) => r.speedup > best.speedup ? r : best)
const worstCase = results.reduce((worst, r) => r.speedup < worst.speedup ? r : worst)

console.log(`Average speedup: ${avgSpeedup >= 1 ? '+' : ''}${((avgSpeedup - 1) * 100).toFixed(1)}%`)
console.log(`Best case: ${bestCase.name} (+${((bestCase.speedup - 1) * 100).toFixed(0)}%)`)
console.log(`Worst case: ${worstCase.name} (${((worstCase.speedup - 1) * 100).toFixed(0)}%)`)
console.log()

if (avgSpeedup >= 1.05) {
  console.log('✅ RECOMMENDATION: Optimization is beneficial overall')
} else if (avgSpeedup >= 0.95) {
  console.log('🟡 RECOMMENDATION: Optimization has minimal impact')
} else {
  console.log('❌ RECOMMENDATION: Optimization makes performance worse')
}
