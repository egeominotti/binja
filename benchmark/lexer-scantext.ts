/**
 * Benchmark: Lexer scanText() optimization
 *
 * Tests current vs optimized delimiter scanning performance
 */

import { Lexer } from '../src/lexer'

// Test templates with different characteristics
const templates = {
  // Mostly text, few delimiters (best case for optimization)
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

  // Balanced mix of text and delimiters
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

  // Dense delimiters (worst case for optimization)
  delimiterDense: `
    {{ a }}{{ b }}{{ c }}{{ d }}{{ e }}
    {% if x %}{{ x }}{% endif %}
    {% for i in items %}{{ i }}{% endfor %}
    {{ name|upper|trim }}{{ value|default:"N/A" }}
    {% with total=price|add:tax %}{{ total }}{% endwith %}
  `,

  // Very long text segments
  longText: `
    ${'A'.repeat(1000)}
    {{ variable }}
    ${'B'.repeat(1000)}
    {% if condition %}
    ${'C'.repeat(1000)}
    {% endif %}
    ${'D'.repeat(1000)}
  `,

  // Many lone braces (edge case - { not followed by { % #)
  loneBraces: `
    function test() { return { a: 1, b: 2 }; }
    const obj = { name: "test", value: { nested: true } };
    if (x) { console.log("hello"); }
    {{ actual_variable }}
    more code { with braces } here
  `,

  // Real-world e-commerce template
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
}

// Benchmark function
function benchmark(name: string, fn: () => void, iterations: number = 10000): { opsPerSec: number; avgMs: number } {
  // Warmup
  for (let i = 0; i < 100; i++) fn()

  // Actual benchmark
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const elapsed = performance.now() - start

  const avgMs = elapsed / iterations
  const opsPerSec = Math.round(1000 / avgMs)

  return { opsPerSec, avgMs }
}

// Run benchmarks
console.log('=' .repeat(70))
console.log('LEXER scanText() BENCHMARK')
console.log('=' .repeat(70))
console.log()

const results: Record<string, { chars: number; delimiters: number; opsPerSec: number; avgMs: number }> = {}

for (const [name, template] of Object.entries(templates)) {
  // Count characteristics
  const chars = template.length
  const delimiterMatches = template.match(/\{\{|\{%|\{#/g) || []
  const delimiters = delimiterMatches.length

  // Run benchmark
  const { opsPerSec, avgMs } = benchmark(name, () => {
    const lexer = new Lexer(template)
    lexer.tokenize()
  })

  results[name] = { chars, delimiters, opsPerSec, avgMs }

  const delimiterRatio = ((delimiters * 2) / chars * 100).toFixed(1)
  console.log(`📊 ${name}`)
  console.log(`   Template: ${chars} chars, ${delimiters} delimiters (${delimiterRatio}% delimiter density)`)
  console.log(`   Performance: ${opsPerSec.toLocaleString()} ops/sec (${avgMs.toFixed(4)} ms/op)`)
  console.log()
}

// Summary table
console.log('=' .repeat(70))
console.log('SUMMARY')
console.log('=' .repeat(70))
console.log()
console.log('| Template        | Chars  | Delims | Density | Ops/sec    | ms/op   |')
console.log('|-----------------|--------|--------|---------|------------|---------|')

for (const [name, data] of Object.entries(results)) {
  const density = ((data.delimiters * 2) / data.chars * 100).toFixed(1)
  console.log(
    `| ${name.padEnd(15)} | ${String(data.chars).padStart(6)} | ${String(data.delimiters).padStart(6)} | ${density.padStart(6)}% | ${data.opsPerSec.toLocaleString().padStart(10)} | ${data.avgMs.toFixed(4).padStart(7)} |`
  )
}

console.log()
console.log('=' .repeat(70))
console.log('ANALYSIS')
console.log('=' .repeat(70))
console.log()

// Calculate optimization potential
const textHeavyOps = results.textHeavy.opsPerSec
const denseOps = results.delimiterDense.opsPerSec
const ratio = (textHeavyOps / denseOps).toFixed(2)

console.log(`Text-heavy vs Delimiter-dense ratio: ${ratio}x`)
console.log()
console.log('Optimization potential analysis:')
console.log('- Text-heavy templates: HIGH potential (many chars between delimiters)')
console.log('- Balanced templates: MEDIUM potential')
console.log('- Delimiter-dense: LOW potential (frequent delimiter checks unavoidable)')
console.log()

// Detailed timing breakdown
console.log('=' .repeat(70))
console.log('DETAILED TIMING: Character processing rate')
console.log('=' .repeat(70))
console.log()

for (const [name, data] of Object.entries(results)) {
  const charsPerMs = data.chars / data.avgMs
  const charsPerSec = Math.round(charsPerMs * 1000)
  console.log(`${name}: ${charsPerSec.toLocaleString()} chars/sec`)
}
