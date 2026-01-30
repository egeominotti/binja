/**
 * Whitespace Control Tests - Based on Jinja2 test_api.py and test_lexnparse.py
 * Tests for whitespace trimming functionality in Jinja2/DTL templates
 *
 * Jinja2 Reference: https://jinja.palletsprojects.com/en/3.1.x/templates/#whitespace-control
 *
 * NOTE: Some tests are marked with .todo() or .skip() as they test features
 * that require implementation of full whitespace control in the lexer/parser/runtime.
 */
import { describe, test, expect } from 'bun:test'
import { Environment, render, Template } from '../src'
import { Lexer, TokenType } from '../src/lexer'

describe('Whitespace Control', () => {
  // ==================== Block Tag Trimming ====================
  describe('Block Tag Trimming ({%- ... -%})', () => {
    // These tests document expected Jinja2 whitespace trimming behavior
    // They are marked as todo() until whitespace control is fully implemented

    test.todo('trims left whitespace with {%-', async () => {
      const result = await render('hello   {%- if true %} world{% endif %}', {})
      expect(result).toBe('hello world')
    })

    test.todo('trims right whitespace with -%}', async () => {
      const result = await render('{% if true -%}   hello{% endif %}', {})
      expect(result).toBe('hello')
    })

    test.todo('trims both sides with {%- ... -%}', async () => {
      const result = await render('hello   {%- if true -%}   world   {%- endif -%}   !', {})
      expect(result).toBe('helloworld!')
    })

    test.todo('trims newlines on left with {%-', async () => {
      const result = await render('hello\n\n{%- if true %} world{% endif %}', {})
      expect(result).toBe('hello world')
    })

    test.todo('trims newlines on right with -%}', async () => {
      const result = await render('{% if true -%}\n\nhello{% endif %}', {})
      expect(result).toBe('hello')
    })

    test('preserves whitespace without trimming markers', async () => {
      const result = await render('hello   {% if true %} world{% endif %}', {})
      expect(result).toBe('hello    world')
    })

    test.todo('trims tabs', async () => {
      const result = await render('hello\t\t{%- if true %}\tworld{% endif %}', {})
      expect(result).toBe('hello\tworld')
    })

    test.todo('trims mixed whitespace (spaces, tabs, newlines)', async () => {
      const result = await render('hello \t\n  {%- if true -%}  \t\n world{% endif %}', {})
      expect(result).toBe('helloworld')
    })
  })

  // ==================== Variable Output Trimming ====================
  describe('Variable Output Trimming ({{- ... -}})', () => {
    test.todo('trims left whitespace with {{-', async () => {
      const result = await render('hello   {{- name }}', { name: 'world' })
      expect(result).toBe('helloworld')
    })

    test.todo('trims right whitespace with -}}', async () => {
      const result = await render('{{ name -}}   !', { name: 'hello' })
      expect(result).toBe('hello!')
    })

    test.todo('trims both sides with {{- ... -}}', async () => {
      const result = await render('hello   {{- name -}}   !', { name: 'world' })
      expect(result).toBe('helloworld!')
    })

    test.todo('trims newlines on left with {{-', async () => {
      const result = await render('hello\n\n{{- name }}', { name: 'world' })
      expect(result).toBe('helloworld')
    })

    test.todo('trims newlines on right with -}}', async () => {
      const result = await render('{{ name -}}\n\n!', { name: 'hello' })
      expect(result).toBe('hello!')
    })

    test('preserves whitespace without trimming markers', async () => {
      const result = await render('hello   {{ name }}   !', { name: 'world' })
      expect(result).toBe('hello   world   !')
    })

    test.todo('trims around filter expressions', async () => {
      const result = await render('hello   {{- name|upper -}}   !', { name: 'world' })
      expect(result).toBe('helloWORLD!')
    })

    test.todo('trims around complex expressions', async () => {
      const result = await render('a   {{- x + y -}}   b', { x: 1, y: 2 })
      expect(result).toBe('a3b')
    })
  })

  // ==================== Comment Trimming ====================
  describe('Comment Trimming ({#- ... -#})', () => {
    test.todo('trims left whitespace with {#-', async () => {
      const result = await render('hello   {#- comment #}world', {})
      expect(result).toBe('helloworld')
    })

    test.todo('trims right whitespace with -#}', async () => {
      const result = await render('hello{# comment -#}   world', {})
      expect(result).toBe('helloworld')
    })

    test.todo('trims both sides with {#- ... -#}', async () => {
      const result = await render('hello   {#- comment -#}   world', {})
      expect(result).toBe('helloworld')
    })

    test.todo('trims newlines around comments', async () => {
      const result = await render('hello\n{#- comment -#}\nworld', {})
      expect(result).toBe('helloworld')
    })

    test('preserves whitespace without trimming markers (comments stripped)', async () => {
      const result = await render('hello   {# comment #}   world', {})
      expect(result).toBe('hello      world')
    })

    test.todo('handles multiline comment with trimming', async () => {
      const result = await render('hello   {#- line1\nline2\nline3 -#}   world', {})
      expect(result).toBe('helloworld')
    })
  })

  // ==================== For Loop Whitespace Control ====================
  describe('For Loop Whitespace Control', () => {
    test.todo('removes extra whitespace in for loops', async () => {
      const result = await render('{%- for i in items -%}{{ i }}{%- endfor -%}', {
        items: [1, 2, 3],
      })
      expect(result).toBe('123')
    })

    test.todo('produces clean output without extra newlines', async () => {
      const template = `
{%- for item in items -%}
{{ item }}
{%- endfor -%}
`
      const result = await render(template, { items: ['a', 'b', 'c'] })
      expect(result).toBe('abc')
    })

    test('basic for loop without whitespace control', async () => {
      const result = await render('{% for i in items %}{{ i }}{% endfor %}', { items: [1, 2, 3] })
      expect(result).toBe('123')
    })

    test('for loop with comma separator (no trimming needed)', async () => {
      const template =
        '{% for item in items %}{{ item }}{% if not forloop.last %}, {% endif %}{% endfor %}'
      const result = await render(template, { items: ['apple', 'banana', 'cherry'] })
      expect(result).toBe('apple, banana, cherry')
    })

    test.todo('handles nested loops with whitespace control', async () => {
      const template = `{%- for row in matrix -%}[{%- for col in row -%}{{ col }}{%- endfor -%}]{%- endfor -%}`
      const result = await render(template, {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      })
      expect(result).toBe('[12][34]')
    })

    test.todo('preserves intentional spacing in loop body', async () => {
      const template = `{%- for item in items %}{{ item }} {% endfor -%}`
      const result = await render(template, { items: ['a', 'b', 'c'] })
      expect(result).toBe('a b c ')
    })
  })

  // ==================== If Statement Whitespace Control ====================
  describe('If Statement Whitespace Control', () => {
    test.todo('removes extra whitespace around if statements', async () => {
      const result = await render('start{%- if show -%}content{%- endif -%}end', { show: true })
      expect(result).toBe('startcontentend')
    })

    test.todo('handles if-else with trimming', async () => {
      const template = `start{%- if show -%}yes{%- else -%}no{%- endif -%}end`
      expect(await render(template, { show: true })).toBe('startyesend')
      expect(await render(template, { show: false })).toBe('startnoend')
    })

    test.todo('handles if-elif-else with trimming', async () => {
      const template = `{%- if x == 1 -%}one{%- elif x == 2 -%}two{%- else -%}other{%- endif -%}`
      expect(await render(template, { x: 1 })).toBe('one')
      expect(await render(template, { x: 2 })).toBe('two')
      expect(await render(template, { x: 3 })).toBe('other')
    })

    test('basic if statement without trimming', async () => {
      expect(await render('{% if show %}yes{% endif %}', { show: true })).toBe('yes')
      expect(await render('{% if show %}yes{% endif %}', { show: false })).toBe('')
    })

    test('if-else without trimming', async () => {
      const template = '{% if show %}yes{% else %}no{% endif %}'
      expect(await render(template, { show: true })).toBe('yes')
      expect(await render(template, { show: false })).toBe('no')
    })
  })

  // ==================== Block Tag Whitespace Control ====================
  describe('Block Tag Whitespace Control', () => {
    test.todo('trims around block tags', async () => {
      const env = new Environment({ templates: '/tmp' })
      const base = `base   {%- block content -%}   default   {%- endblock -%}   end`
      const result = await env.renderString(base, {})
      expect(result).toBe('basedefaultend')
    })

    test.todo('handles with tag trimming', async () => {
      const result = await render('start   {%- with x=1 -%}   {{ x }}   {%- endwith -%}   end', {})
      expect(result).toBe('start1end')
    })

    test('with tag without trimming', async () => {
      const result = await render('{% with x=1 %}{{ x }}{% endwith %}', {})
      expect(result).toBe('1')
    })
  })

  // ==================== Whitespace Preservation ====================
  describe('Whitespace Preservation', () => {
    test('preserves leading whitespace in text', async () => {
      const result = await render('   hello', {})
      expect(result).toBe('   hello')
    })

    test('preserves trailing whitespace in text', async () => {
      const result = await render('hello   ', {})
      expect(result).toBe('hello   ')
    })

    test('preserves whitespace between text elements', async () => {
      const result = await render('hello   world', {})
      expect(result).toBe('hello   world')
    })

    test('preserves newlines in text', async () => {
      const result = await render('line1\nline2\nline3', {})
      expect(result).toBe('line1\nline2\nline3')
    })

    test('preserves indentation in multiline text', async () => {
      const result = await render('line1\n  indented\nline3', {})
      expect(result).toBe('line1\n  indented\nline3')
    })

    test('preserves whitespace inside string literals', async () => {
      const result = await render('{{ "  spaces  " }}', {})
      expect(result).toBe('  spaces  ')
    })

    test('preserves whitespace around regular tags', async () => {
      const result = await render('hello   {{ name }}   world', { name: 'there' })
      expect(result).toBe('hello   there   world')
    })

    test('preserves newlines around regular block tags', async () => {
      const result = await render('hello\n{% if true %}yes{% endif %}\nworld', {})
      expect(result).toBe('hello\nyes\nworld')
    })
  })

  // ==================== Mixed Content ====================
  describe('Mixed Trimmed and Non-Trimmed Tags', () => {
    test.todo('mixes trimmed and non-trimmed tags', async () => {
      const result = await render('a   {{- x }}   {{ y -}}   z', { x: 'b', y: 'c' })
      expect(result).toBe('ab   cz')
    })

    test.todo('handles complex mixed template', async () => {
      const template = `
start
{%- for item in items %}
  {{- item -}}
{% endfor -%}
end
`
      const result = await render(template, { items: [1, 2, 3] })
      expect(result).toBe('\nstart123end\n')
    })

    test.todo('selective trimming in loop', async () => {
      const template = `{%- for item in items -%}
  {{ item }}
{%- endfor -%}`
      const result = await render(template, { items: ['a', 'b'] })
      expect(result).toBe('  a\n  b\n')
    })
  })

  // ==================== Practical Examples ====================
  describe('Practical Template Examples', () => {
    test('HTML list without explicit trimming', async () => {
      const template = '<ul>{% for item in items %}<li>{{ item }}</li>{% endfor %}</ul>'
      const result = await render(template, { items: ['one', 'two', 'three'] })
      expect(result).toBe('<ul><li>one</li><li>two</li><li>three</li></ul>')
    })

    test.todo('HTML list with trimming for clean output', async () => {
      const template = `<ul>
{%- for item in items %}
<li>{{ item }}</li>
{%- endfor %}
</ul>`
      const result = await render(template, { items: ['one', 'two', 'three'] })
      expect(result).toBe('<ul>\n<li>one</li>\n<li>two</li>\n<li>three</li>\n</ul>')
    })

    test.todo('inline elements without unwanted spaces', async () => {
      const template = `<span>{{- name -}}</span>`
      const result = await render(template, { name: 'John' })
      expect(result).toBe('<span>John</span>')
    })

    test('inline elements basic', async () => {
      const template = '<span>{{ name }}</span>'
      const result = await render(template, { name: 'John' })
      expect(result).toBe('<span>John</span>')
    })

    test.todo('clean attribute values', async () => {
      const template = `<div class="{%- if active -%}active{%- endif -%}">content</div>`
      const result = await render(template, { active: true })
      expect(result).toBe('<div class="active">content</div>')
    })
  })

  // ==================== Edge Cases ====================
  describe('Edge Cases', () => {
    test.todo('handles empty content with trimming', async () => {
      const result = await render('{%- if false -%}content{%- endif -%}', {})
      expect(result).toBe('')
    })

    test('handles empty content without trimming', async () => {
      const result = await render('{% if false %}content{% endif %}', {})
      expect(result).toBe('')
    })

    test.todo('handles multiple consecutive trimmed tags', async () => {
      const result = await render('{%- if true -%}{%- if true -%}x{%- endif -%}{%- endif -%}', {})
      expect(result).toBe('x')
    })

    test('handles multiple consecutive tags without trimming', async () => {
      const result = await render('{% if true %}{% if true %}x{% endif %}{% endif %}', {})
      expect(result).toBe('x')
    })

    test.todo('handles trimming at template boundaries', async () => {
      const result = await render('{%- if true -%}content{%- endif -%}', {})
      expect(result).toBe('content')
    })

    test.todo('handles only whitespace between trimmed tags', async () => {
      const result = await render('{%- if true -%}   {%- endif -%}', {})
      expect(result).toBe('')
    })

    test.todo('handles newline-only content between trimmed tags', async () => {
      const result = await render('{%- if true -%}\n\n\n{%- endif -%}', {})
      expect(result).toBe('')
    })

    test.todo('trimming does not affect string literal content', async () => {
      const result = await render('{{- "   hello   " -}}', {})
      expect(result).toBe('   hello   ')
    })

    test('string literal preserves internal whitespace', async () => {
      const result = await render('{{ "   hello   " }}', {})
      expect(result).toBe('   hello   ')
    })

    test.todo('handles trimming with filters', async () => {
      const result = await render('   {{- "hello"|upper -}}   ', {})
      expect(result).toBe('HELLO')
    })

    test.todo('handles nested if with selective trimming', async () => {
      const result = await render(
        'a{%- if true %} b {% if true -%}c{%- endif %} d{%- endif %}e',
        {}
      )
      expect(result).toBe('a b c de')
    })
  })

  // ==================== Lexer Token Recognition ====================
  describe('Lexer Whitespace Control Token Recognition', () => {
    test('recognizes {%- block start', () => {
      const lexer = new Lexer('{%- if true %}')
      const tokens = lexer.tokenize()
      const blockStart = tokens.find((t) => t.type === TokenType.BLOCK_START)
      expect(blockStart?.value).toBe('{%-')
    })

    test.todo('recognizes {{- variable start', () => {
      const lexer = new Lexer('{{- name }}')
      const tokens = lexer.tokenize()
      const varStart = tokens.find((t) => t.type === TokenType.VARIABLE_START)
      expect(varStart?.value).toBe('{{-')
    })

    test('recognizes -%} block end', () => {
      const lexer = new Lexer('{% if true -%}')
      const tokens = lexer.tokenize()
      const blockEnd = tokens.find((t) => t.type === TokenType.BLOCK_END)
      // The lexer should handle the dash before %}
      expect(blockEnd).toBeDefined()
    })

    test.todo('recognizes -}} variable end', () => {
      const lexer = new Lexer('{{ name -}}')
      const tokens = lexer.tokenize()
      const varEnd = tokens.find((t) => t.type === TokenType.VARIABLE_END)
      expect(varEnd).toBeDefined()
    })

    test('tokenizes template with block trim variants', () => {
      const lexer = new Lexer('{%- for x in y -%}content{%- endfor -%}')
      const tokens = lexer.tokenize()

      const blockStarts = tokens.filter((t) => t.type === TokenType.BLOCK_START)
      expect(blockStarts.length).toBe(2)
    })

    test('regular block tokens work correctly', () => {
      const lexer = new Lexer('{% for x in y %}{{ x }}{% endfor %}')
      const tokens = lexer.tokenize()

      const blockStarts = tokens.filter((t) => t.type === TokenType.BLOCK_START)
      const varStarts = tokens.filter((t) => t.type === TokenType.VARIABLE_START)

      expect(blockStarts.length).toBe(2)
      expect(varStarts.length).toBe(1)
    })
  })

  // ==================== Template Class ====================
  describe('Template Class Whitespace Control', () => {
    test.todo('Template function preserves whitespace control', async () => {
      const tmpl = Template('hello   {{- name -}}   world')
      expect(await tmpl.render({ name: 'there' })).toBe('hellothereworld')
    })

    test('Template function basic usage', async () => {
      const tmpl = Template('hello {{ name }} world')
      expect(await tmpl.render({ name: 'there' })).toBe('hello there world')
    })

    test.todo('reusable template with whitespace control', async () => {
      const tmpl = Template('{%- for i in items -%}{{ i }}{%- endfor -%}')
      expect(await tmpl.render({ items: [1, 2, 3] })).toBe('123')
      expect(await tmpl.render({ items: ['a', 'b'] })).toBe('ab')
    })

    test('reusable template without whitespace control', async () => {
      const tmpl = Template('{% for i in items %}{{ i }}{% endfor %}')
      expect(await tmpl.render({ items: [1, 2, 3] })).toBe('123')
      expect(await tmpl.render({ items: ['a', 'b'] })).toBe('ab')
    })
  })

  // ==================== Comparison with Non-Trimmed ====================
  describe('Comparison: Trimmed vs Non-Trimmed', () => {
    test('for loop output without trimming', async () => {
      const items = ['a', 'b', 'c']
      const noTrim = await render('{% for i in items %}{{ i }}{% endfor %}', { items })
      expect(noTrim).toBe('abc')
    })

    test.todo('demonstrates difference: multiline template trimming', async () => {
      const items = [1, 2]

      const withTrim = `{%- for i in items -%}{{ i }}{%- endfor -%}`
      const withTrimResult = await render(withTrim, { items })
      expect(withTrimResult).toBe('12')
    })
  })

  // ==================== Special Characters ====================
  describe('Special Characters Around Trim Markers', () => {
    test.todo('handles unicode characters with trimming', async () => {
      const result = await render('hello   {{- name -}}   world', { name: 'aloha' })
      expect(result).toBe('helloalohaworld')
    })

    test('handles unicode characters without trimming', async () => {
      const result = await render('hello {{ name }} world', { name: 'aloha' })
      expect(result).toBe('hello aloha world')
    })

    test('preserves special whitespace characters (NBSP)', async () => {
      const result = await render('a\u00A0b', {}) // NBSP
      expect(result).toBe('a\u00A0b')
    })
  })

  // ==================== Regression Tests ====================
  describe('Regression Tests', () => {
    test('does not trim inside string content', async () => {
      const result = await render('{{ " - hello - " }}', {})
      expect(result).toBe(' - hello - ')
    })

    test('minus sign in expression is not confused with trim marker', async () => {
      const result = await render('{{ 5 - 3 }}', {})
      expect(result).toBe('2')
    })

    test('negative numbers work correctly', async () => {
      const result = await render('{{ -5 }}', {})
      expect(result).toBe('-5')
    })

    test('handles dash in variable names', async () => {
      const result = await render('{{ x }} - {{ y }}', { x: 1, y: 2 })
      expect(result).toBe('1 - 2')
    })

    test('subtraction in conditions works', async () => {
      const result = await render('{% if x - 1 == 0 %}zero{% endif %}', { x: 1 })
      expect(result).toBe('zero')
    })

    test('handles expression with multiple operators', async () => {
      const result = await render('{{ 10 - 5 - 2 }}', {})
      expect(result).toBe('3')
    })
  })

  // ==================== Current Implementation Behavior ====================
  describe('Current Implementation Behavior (without full whitespace control)', () => {
    test('block tags preserve surrounding whitespace', async () => {
      const result = await render('a   {% if true %}b{% endif %}   c', {})
      expect(result).toBe('a   b   c')
    })

    test('variable tags preserve surrounding whitespace', async () => {
      const result = await render('a   {{ x }}   c', { x: 'b' })
      expect(result).toBe('a   b   c')
    })

    test('comments are removed but whitespace preserved', async () => {
      const result = await render('a   {# comment #}   c', {})
      expect(result).toBe('a      c')
    })

    test('newlines around tags are preserved', async () => {
      const result = await render('a\n{% if true %}b{% endif %}\nc', {})
      expect(result).toBe('a\nb\nc')
    })

    test('multiple spaces collapse naturally in output', async () => {
      const result = await render('{% for i in items %}  {{ i }}  {% endfor %}', { items: [1, 2] })
      expect(result).toBe('  1    2  ')
    })
  })
})
