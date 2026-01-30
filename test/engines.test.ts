/**
 * Multi-Engine Tests
 * Tests for Handlebars and Liquid engine support
 */

import { describe, test, expect } from 'bun:test'
import * as handlebars from '../src/engines/handlebars'
import * as liquid from '../src/engines/liquid'
import * as twig from '../src/engines/twig'
import { MultiEngine, getEngine, detectEngine } from '../src/engines'

describe('Handlebars Engine', () => {
  describe('Basic Output', () => {
    test('variable output', async () => {
      const result = await handlebars.render('Hello {{name}}!', { name: 'World' })
      expect(result).toBe('Hello World!')
    })

    test('unescaped output', async () => {
      const result = await handlebars.render('Hello {{{html}}}!', { html: '<b>World</b>' })
      expect(result).toBe('Hello <b>World</b>!')
    })

    test('escaped output', async () => {
      const result = await handlebars.render('Hello {{html}}!', { html: '<b>World</b>' })
      expect(result).toBe('Hello &lt;b&gt;World&lt;/b&gt;!')
    })

    test('nested path', async () => {
      const result = await handlebars.render('{{user.name}}', { user: { name: 'John' } })
      expect(result).toBe('John')
    })
  })

  describe('If Block', () => {
    test('if true', async () => {
      const result = await handlebars.render('{{#if show}}Yes{{/if}}', { show: true })
      expect(result).toBe('Yes')
    })

    test('if false', async () => {
      const result = await handlebars.render('{{#if show}}Yes{{/if}}', { show: false })
      expect(result).toBe('')
    })

    test('if else', async () => {
      const result = await handlebars.render('{{#if show}}Yes{{else}}No{{/if}}', { show: false })
      expect(result).toBe('No')
    })
  })

  describe('Unless Block', () => {
    test('unless true', async () => {
      const result = await handlebars.render('{{#unless hide}}Visible{{/unless}}', { hide: false })
      expect(result).toBe('Visible')
    })

    test('unless false', async () => {
      const result = await handlebars.render('{{#unless hide}}Visible{{/unless}}', { hide: true })
      expect(result).toBe('')
    })
  })

  describe('Each Block', () => {
    test('each array', async () => {
      const result = await handlebars.render('{{#each items}}{{this}}{{/each}}', {
        items: ['a', 'b', 'c'],
      })
      expect(result).toBe('abc')
    })

    test('each with else', async () => {
      const result = await handlebars.render('{{#each items}}{{this}}{{else}}Empty{{/each}}', {
        items: [],
      })
      expect(result).toBe('Empty')
    })
  })

  describe('Comments', () => {
    test('inline comment', async () => {
      const result = await handlebars.render('Hello {{! comment }}World', {})
      expect(result).toBe('Hello World')
    })

    test('block comment', async () => {
      const result = await handlebars.render('Hello {{!-- block comment --}}World', {})
      expect(result).toBe('Hello World')
    })
  })

  describe('Deep Paths', () => {
    test('deeply nested path', async () => {
      const result = await handlebars.render('{{user.address.city}}', {
        user: { address: { city: 'Rome' } },
      })
      expect(result).toBe('Rome')
    })

    test('path with slash separator', async () => {
      const result = await handlebars.render('{{user/name}}', { user: { name: 'John' } })
      expect(result).toBe('John')
    })
  })

  describe('Each with Loop Variables', () => {
    test('each with @index', async () => {
      const result = await handlebars.render('{{#each items}}{{@index}}:{{this}} {{/each}}', {
        items: ['a', 'b'],
      })
      expect(result).toBe('0:a 1:b ')
    })

    test('each with @first and @last', async () => {
      const result = await handlebars.render(
        '{{#each items}}{{#if @first}}[{{/if}}{{this}}{{#if @last}}]{{/if}}{{/each}}',
        { items: ['a', 'b', 'c'] }
      )
      expect(result).toBe('[abc]')
    })
  })

  describe('With Block', () => {
    test('with context', async () => {
      const result = await handlebars.render(
        '{{#with user}}{{this.name}} - {{this.email}}{{/with}}',
        { user: { name: 'John', email: 'john@example.com' } }
      )
      expect(result).toBe('John - john@example.com')
    })
  })

  describe('Literals', () => {
    test('string literal', async () => {
      const result = await handlebars.render('{{#if true}}Yes{{/if}}', {})
      expect(result).toBe('Yes')
    })

    test('number in expression', async () => {
      const result = await handlebars.render('{{value}}', { value: 42 })
      expect(result).toBe('42')
    })
  })
})

describe('Liquid Engine', () => {
  describe('Basic Output', () => {
    test('variable output', async () => {
      const result = await liquid.render('Hello {{ name }}!', { name: 'World' })
      expect(result).toBe('Hello World!')
    })

    test('nested path', async () => {
      const result = await liquid.render('{{ user.name }}', { user: { name: 'John' } })
      expect(result).toBe('John')
    })

    test('array index', async () => {
      const result = await liquid.render('{{ items[0] }}', { items: ['first', 'second'] })
      expect(result).toBe('first')
    })
  })

  describe('Filters', () => {
    test('upcase filter', async () => {
      const result = await liquid.render('{{ name | upper }}', { name: 'world' })
      expect(result).toBe('WORLD')
    })

    test('filter with argument', async () => {
      const result = await liquid.render('{{ text | truncatechars: 5 }}', { text: 'Hello World' })
      expect(result).toBe('He...')
    })
  })

  describe('If Tag', () => {
    test('if true', async () => {
      const result = await liquid.render('{% if show %}Yes{% endif %}', { show: true })
      expect(result).toBe('Yes')
    })

    test('if false', async () => {
      const result = await liquid.render('{% if show %}Yes{% endif %}', { show: false })
      expect(result).toBe('')
    })

    test('if else', async () => {
      const result = await liquid.render('{% if show %}Yes{% else %}No{% endif %}', { show: false })
      expect(result).toBe('No')
    })

    test('if elsif', async () => {
      const result = await liquid.render('{% if a %}A{% elsif b %}B{% else %}C{% endif %}', {
        a: false,
        b: true,
      })
      expect(result).toBe('B')
    })

    test('comparison', async () => {
      const result = await liquid.render('{% if count > 5 %}Many{% endif %}', { count: 10 })
      expect(result).toBe('Many')
    })
  })

  describe('Unless Tag', () => {
    test('unless true', async () => {
      const result = await liquid.render('{% unless hide %}Visible{% endunless %}', { hide: false })
      expect(result).toBe('Visible')
    })

    test('unless false', async () => {
      const result = await liquid.render('{% unless hide %}Visible{% endunless %}', { hide: true })
      expect(result).toBe('')
    })
  })

  describe('For Tag', () => {
    test('for loop', async () => {
      const result = await liquid.render('{% for item in items %}{{ item }}{% endfor %}', {
        items: ['a', 'b', 'c'],
      })
      expect(result).toBe('abc')
    })

    test('for with else', async () => {
      const result = await liquid.render(
        '{% for item in items %}{{ item }}{% else %}Empty{% endfor %}',
        { items: [] }
      )
      expect(result).toBe('Empty')
    })
  })

  describe('Assign Tag', () => {
    test('assign variable', async () => {
      const result = await liquid.render('{% assign name = "World" %}Hello {{ name }}!', {})
      expect(result).toBe('Hello World!')
    })
  })

  describe('Comment Tag', () => {
    test('comment', async () => {
      const result = await liquid.render('Hello {% comment %}ignored{% endcomment %}World', {})
      expect(result).toBe('Hello World')
    })
  })

  describe('Raw Tag', () => {
    test('raw output', async () => {
      const result = await liquid.render('{% raw %}{{ not parsed }}{% endraw %}', {})
      expect(result).toBe('{{ not parsed }}')
    })
  })

  describe('Boolean Operators', () => {
    test('and operator', async () => {
      const result = await liquid.render('{% if a and b %}Both{% endif %}', { a: true, b: true })
      expect(result).toBe('Both')
    })

    test('and operator false', async () => {
      const result = await liquid.render('{% if a and b %}Both{% endif %}', { a: true, b: false })
      expect(result).toBe('')
    })

    test('or operator', async () => {
      const result = await liquid.render('{% if a or b %}One{% endif %}', { a: false, b: true })
      expect(result).toBe('One')
    })
  })

  describe('Comparison Operators', () => {
    test('equals', async () => {
      const result = await liquid.render('{% if x == 5 %}Yes{% endif %}', { x: 5 })
      expect(result).toBe('Yes')
    })

    test('not equals', async () => {
      const result = await liquid.render('{% if x != 5 %}Yes{% endif %}', { x: 3 })
      expect(result).toBe('Yes')
    })

    test('less than', async () => {
      const result = await liquid.render('{% if x < 10 %}Yes{% endif %}', { x: 5 })
      expect(result).toBe('Yes')
    })

    test('greater or equal', async () => {
      const result = await liquid.render('{% if x >= 5 %}Yes{% endif %}', { x: 5 })
      expect(result).toBe('Yes')
    })
  })

  describe('Forloop Variables', () => {
    test('forloop.index', async () => {
      const result = await liquid.render('{% for i in items %}{{ forloop.counter }}{% endfor %}', {
        items: ['a', 'b', 'c'],
      })
      expect(result).toBe('123')
    })

    test('forloop.first and forloop.last', async () => {
      const result = await liquid.render(
        '{% for i in items %}{% if forloop.first %}[{% endif %}{{ i }}{% if forloop.last %}]{% endif %}{% endfor %}',
        { items: ['a', 'b', 'c'] }
      )
      expect(result).toBe('[abc]')
    })
  })

  describe('Multiple Filters', () => {
    test('chained filters', async () => {
      const result = await liquid.render('{{ name | upper | truncatechars: 5 }}', {
        name: 'hello world',
      })
      expect(result).toBe('HE...')
    })
  })

  describe('Deep Paths', () => {
    test('deeply nested', async () => {
      const result = await liquid.render('{{ a.b.c.d }}', { a: { b: { c: { d: 'deep' } } } })
      expect(result).toBe('deep')
    })

    test('bracket and dot mixed', async () => {
      const result = await liquid.render('{{ users[0].name }}', { users: [{ name: 'John' }] })
      expect(result).toBe('John')
    })
  })

  describe('Literals', () => {
    test('true literal', async () => {
      const result = await liquid.render('{% if true %}Yes{% endif %}', {})
      expect(result).toBe('Yes')
    })

    test('false literal', async () => {
      const result = await liquid.render('{% if false %}Yes{% else %}No{% endif %}', {})
      expect(result).toBe('No')
    })

    test('nil literal', async () => {
      const result = await liquid.render('{% if x == nil %}Nil{% endif %}', { x: null })
      expect(result).toBe('Nil')
    })
  })

  describe('Whitespace Control', () => {
    test('output whitespace preserved', async () => {
      const result = await liquid.render('A {{ x }} B', { x: 'X' })
      expect(result).toBe('A X B')
    })
  })
})

describe('Twig Engine', () => {
  describe('Basic Output', () => {
    test('variable output', async () => {
      const result = await twig.render('Hello {{ name }}!', { name: 'World' })
      expect(result).toBe('Hello World!')
    })

    test('nested path', async () => {
      const result = await twig.render('{{ user.name }}', { user: { name: 'John' } })
      expect(result).toBe('John')
    })

    test('array index', async () => {
      const result = await twig.render('{{ items[0] }}', { items: ['first', 'second'] })
      expect(result).toBe('first')
    })
  })

  describe('Filters', () => {
    test('upper filter', async () => {
      const result = await twig.render('{{ name | upper }}', { name: 'world' })
      expect(result).toBe('WORLD')
    })

    test('default filter', async () => {
      const result = await twig.render('{{ missing | default: "fallback" }}', {})
      expect(result).toBe('fallback')
    })

    test('e filter (escape alias)', async () => {
      const result = await twig.render('{{ html | e }}', { html: '<b>test</b>' })
      expect(result).toBe('&lt;b&gt;test&lt;/b&gt;')
    })
  })

  describe('If Tag', () => {
    test('if true', async () => {
      const result = await twig.render('{% if show %}Yes{% endif %}', { show: true })
      expect(result).toBe('Yes')
    })

    test('if false', async () => {
      const result = await twig.render('{% if show %}Yes{% endif %}', { show: false })
      expect(result).toBe('')
    })

    test('if else', async () => {
      const result = await twig.render('{% if show %}Yes{% else %}No{% endif %}', { show: false })
      expect(result).toBe('No')
    })

    test('if elif', async () => {
      const result = await twig.render('{% if a %}A{% elif b %}B{% else %}C{% endif %}', {
        a: false,
        b: true,
      })
      expect(result).toBe('B')
    })
  })

  describe('For Tag', () => {
    test('for loop', async () => {
      const result = await twig.render('{% for item in items %}{{ item }}{% endfor %}', {
        items: ['a', 'b', 'c'],
      })
      expect(result).toBe('abc')
    })

    test('for with loop.index', async () => {
      const result = await twig.render('{% for i in items %}{{ loop.index }}{% endfor %}', {
        items: ['a', 'b', 'c'],
      })
      expect(result).toBe('123')
    })

    test('for with empty', async () => {
      const result = await twig.render(
        '{% for item in items %}{{ item }}{% empty %}Empty{% endfor %}',
        { items: [] }
      )
      expect(result).toBe('Empty')
    })
  })

  describe('Set Tag', () => {
    test('set variable', async () => {
      const result = await twig.render('{% set name = "World" %}Hello {{ name }}!', {})
      expect(result).toBe('Hello World!')
    })
  })

  describe('Comments', () => {
    test('comment', async () => {
      const result = await twig.render('Hello {# ignored #}World', {})
      expect(result).toBe('Hello World')
    })
  })

  describe('Raw Tag', () => {
    test('raw output', async () => {
      const result = await twig.render('{% raw %}{{ not parsed }}{% endraw %}', {})
      expect(result).toBe('{{ not parsed }}')
    })
  })

  describe('Deep Paths', () => {
    test('deeply nested', async () => {
      const result = await twig.render('{{ a.b.c.d }}', { a: { b: { c: { d: 'deep' } } } })
      expect(result).toBe('deep')
    })

    test('bracket and dot mixed', async () => {
      const result = await twig.render('{{ users[0].name }}', { users: [{ name: 'John' }] })
      expect(result).toBe('John')
    })
  })

  describe('Comparison Operators', () => {
    test('equals', async () => {
      const result = await twig.render('{% if x == 5 %}Yes{% endif %}', { x: 5 })
      expect(result).toBe('Yes')
    })

    test('not equals', async () => {
      const result = await twig.render('{% if x != 5 %}Yes{% endif %}', { x: 3 })
      expect(result).toBe('Yes')
    })

    test('greater than', async () => {
      const result = await twig.render('{% if x > 5 %}Yes{% endif %}', { x: 10 })
      expect(result).toBe('Yes')
    })
  })

  describe('Boolean Operators', () => {
    test('and operator', async () => {
      const result = await twig.render('{% if a and b %}Both{% endif %}', { a: true, b: true })
      expect(result).toBe('Both')
    })

    test('or operator', async () => {
      const result = await twig.render('{% if a or b %}One{% endif %}', { a: false, b: true })
      expect(result).toBe('One')
    })

    test('not operator', async () => {
      const result = await twig.render('{% if not hidden %}Visible{% endif %}', { hidden: false })
      expect(result).toBe('Visible')
    })
  })

  describe('String Concatenation', () => {
    test('tilde operator', async () => {
      const result = await twig.render('{{ "Hello " ~ name }}', { name: 'World' })
      expect(result).toBe('Hello World')
    })
  })
})

describe('MultiEngine', () => {
  test('getEngine by name', () => {
    const hbs = getEngine('handlebars')
    expect(hbs).toBeDefined()
    expect(hbs?.name).toBe('handlebars')

    const liq = getEngine('liquid')
    expect(liq).toBeDefined()
    expect(liq?.name).toBe('liquid')

    const tw = getEngine('twig')
    expect(tw).toBeDefined()
    expect(tw?.name).toBe('twig')
  })

  test('getEngine by extension', () => {
    const hbs = getEngine('.hbs')
    expect(hbs?.name).toBe('handlebars')

    const liq = getEngine('.liquid')
    expect(liq?.name).toBe('liquid')

    const tw = getEngine('.twig')
    expect(tw?.name).toBe('twig')
  })

  test('detectEngine from path', () => {
    const hbs = detectEngine('/templates/page.hbs')
    expect(hbs?.name).toBe('handlebars')

    const liq = detectEngine('/templates/page.liquid')
    expect(liq?.name).toBe('liquid')

    const tw = detectEngine('/templates/page.twig')
    expect(tw?.name).toBe('twig')
  })

  test('MultiEngine render', async () => {
    const engine = new MultiEngine()

    const jinja = await engine.render('Hello {{ name }}!', { name: 'Jinja' }, 'jinja2')
    expect(jinja).toBe('Hello Jinja!')

    const hbs = await engine.render('Hello {{name}}!', { name: 'HBS' }, 'handlebars')
    expect(hbs).toBe('Hello HBS!')

    const liq = await engine.render('Hello {{ name }}!', { name: 'Liquid' }, 'liquid')
    expect(liq).toBe('Hello Liquid!')

    const tw = await engine.render('Hello {{ name }}!', { name: 'Twig' }, 'twig')
    expect(tw).toBe('Hello Twig!')
  })

  test('listEngines', () => {
    const engine = new MultiEngine()
    const list = engine.listEngines()
    expect(list).toContain('jinja2')
    expect(list).toContain('handlebars')
    expect(list).toContain('liquid')
    expect(list).toContain('twig')
  })
})
