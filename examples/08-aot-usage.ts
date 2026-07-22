/**
 * Example 08: Runtime vs AOT APIs
 *
 * `render()` is asynchronous and convenient for one-off source strings.
 * `compile()` performs setup once and returns a synchronous render function for
 * the supported static subset.
 */

import { compile, Environment } from '../src'

const source = `
<h1>{{ title|upper }}</h1>
<ul>
{% for item in items %}<li>{{ loop.index }}. {{ item }}</li>{% endfor %}
</ul>
`.trim()

const context = {
  title: 'AOT example',
  items: ['lexer', 'parser', 'compiler'],
}

const env = new Environment({ autoescape: true })
const runtimeHtml = await env.renderString(source, context)

const renderCompiled = compile(source)
const aotHtml = renderCompiled(context)

if (runtimeHtml !== aotHtml) {
  throw new Error('Runtime and AOT output diverged')
}

console.log(aotHtml)

// Use the repository benchmark for measurements. It warms each case, consumes
// output, separates sync/async harnesses, and reports variability:
//   BENCH_ROUNDS=15 bun run benchmark -- --json
