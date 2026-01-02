/**
 * Multi-Engine Support Example
 *
 * This example demonstrates how to use binja with multiple template engines:
 * - Jinja2/DTL (default)
 * - Handlebars
 * - Liquid (Shopify)
 * - Twig (PHP/Symfony)
 */

import { render } from '../src'
import * as handlebars from '../src/engines/handlebars'
import * as liquid from '../src/engines/liquid'
import * as twig from '../src/engines/twig'
import { MultiEngine } from '../src/engines'

async function main() {
  console.log('=== Multi-Engine Template Support ===\n')

  const context = {
    name: 'World',
    items: ['Apple', 'Banana', 'Cherry'],
    user: { name: 'John', age: 30 },
    showGreeting: true,
  }

  // 1. Jinja2/DTL (default binja engine)
  console.log('--- Jinja2/DTL ---')
  const jinja2Template = `
Hello {{ name }}!
{% if showGreeting %}Welcome to binja!{% endif %}
Items: {% for item in items %}{{ item }}{% if not forloop.last %}, {% endif %}{% endfor %}
User: {{ user.name }} ({{ user.age }} years old)
  `.trim()

  const jinja2Result = await render(jinja2Template, context)
  console.log(jinja2Result)
  console.log()

  // 2. Handlebars
  console.log('--- Handlebars ---')
  const handlebarsTemplate = `
Hello {{name}}!
{{#if showGreeting}}Welcome to binja!{{/if}}
Items: {{#each items}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
User: {{user.name}} ({{user.age}} years old)
  `.trim()

  const handlebarsResult = await handlebars.render(handlebarsTemplate, context)
  console.log(handlebarsResult)
  console.log()

  // 3. Liquid (Shopify)
  console.log('--- Liquid ---')
  const liquidTemplate = `
Hello {{ name }}!
{% if showGreeting %}Welcome to binja!{% endif %}
Items: {% for item in items %}{{ item }}{% unless forloop.last %}, {% endunless %}{% endfor %}
User: {{ user.name }} ({{ user.age }} years old)
  `.trim()

  const liquidResult = await liquid.render(liquidTemplate, context)
  console.log(liquidResult)
  console.log()

  // 4. Twig (PHP/Symfony)
  console.log('--- Twig ---')
  const twigTemplate = `
Hello {{ name }}!
{% if showGreeting %}Welcome to binja!{% endif %}
Items: {% for item in items %}{{ item }}{% if not loop.last %}, {% endif %}{% endfor %}
User: {{ user.name }} ({{ user.age }} years old)
  `.trim()

  const twigResult = await twig.render(twigTemplate, context)
  console.log(twigResult)
  console.log()

  // 5. Using MultiEngine class
  console.log('--- MultiEngine API ---')
  const engine = new MultiEngine()

  // Render with different engines using the same API
  const engines = ['jinja2', 'handlebars', 'liquid', 'twig'] as const

  for (const engineName of engines) {
    let template: string
    switch (engineName) {
      case 'jinja2':
        template = 'Hello {{ name }}!'
        break
      case 'handlebars':
        template = 'Hello {{name}}!'
        break
      case 'liquid':
        template = 'Hello {{ name }}!'
        break
      case 'twig':
        template = 'Hello {{ name }}!'
        break
    }

    const result = await engine.render(template, { name: 'World' }, engineName)
    console.log(`${engineName}: ${result}`)
  }

  console.log()
  console.log('Available engines:', engine.listEngines().join(', '))
}

main().catch(console.error)
