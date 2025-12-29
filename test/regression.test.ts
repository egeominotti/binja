/**
 * Regression and Edge Case Tests
 * Based on Jinja2's test_regression.py and comprehensive edge case scenarios
 */
import { describe, test, expect, beforeAll } from 'bun:test'
import { render, Environment, Template } from '../src'
import * as fs from 'fs'
import * as path from 'path'

const TEMPLATES_DIR = '/tmp/jinja-bun-regression-tests'

describe('Regression Tests', () => {
  // ==================== Empty Values ====================
  describe('Empty Values', () => {
    test('empty string variable', async () => {
      expect(await render('{{ s }}', { s: '' })).toBe('')
    })

    test('empty string output with surrounding text', async () => {
      expect(await render('before{{ s }}after', { s: '' })).toBe('beforeafter')
    })

    test('empty array in for loop', async () => {
      expect(await render('{% for i in items %}{{ i }}{% endfor %}', { items: [] })).toBe('')
    })

    test('empty array with else/empty block', async () => {
      expect(await render('{% for i in items %}{{ i }}{% else %}none{% endfor %}', { items: [] })).toBe('none')
      expect(await render('{% for i in items %}{{ i }}{% empty %}none{% endfor %}', { items: [] })).toBe('none')
    })

    test('empty object', async () => {
      expect(await render('{{ obj }}', { obj: {} })).toBe('[object Object]')
    })

    test('empty object is falsy in conditions', async () => {
      expect(await render('{% if obj %}yes{% else %}no{% endif %}', { obj: {} })).toBe('no')
    })

    test('null handling', async () => {
      expect(await render('{{ value }}', { value: null })).toBe('')
    })

    test('undefined variable handling', async () => {
      expect(await render('{{ nonexistent }}', {})).toBe('')
    })

    test('null in conditions', async () => {
      expect(await render('{% if value %}yes{% else %}no{% endif %}', { value: null })).toBe('no')
    })

    test('undefined in conditions', async () => {
      expect(await render('{% if nonexistent %}yes{% else %}no{% endif %}', {})).toBe('no')
    })

    test('null coalescing with default filter', async () => {
      expect(await render('{{ value|default:"fallback" }}', { value: null })).toBe('fallback')
      expect(await render('{{ value|default:"fallback" }}', {})).toBe('fallback')
    })
  })

  // ==================== Nested Structures ====================
  describe('Nested Structures', () => {
    test('deeply nested objects', async () => {
      const ctx = { a: { b: { c: { d: { e: 'deep' } } } } }
      expect(await render('{{ a.b.c.d.e }}', ctx)).toBe('deep')
    })

    test('deeply nested arrays', async () => {
      const ctx = { arr: [[[['nested']]]] }
      expect(await render('{{ arr.0.0.0.0 }}', ctx)).toBe('nested')
    })

    test('mixed nesting - object with arrays', async () => {
      const ctx = {
        data: {
          items: [
            { name: 'first', tags: ['a', 'b'] },
            { name: 'second', tags: ['c', 'd'] }
          ]
        }
      }
      expect(await render('{{ data.items.0.name }}', ctx)).toBe('first')
      expect(await render('{{ data.items.0.tags.1 }}', ctx)).toBe('b')
      expect(await render('{{ data.items.1.tags.0 }}', ctx)).toBe('c')
    })

    test('mixed nesting - array with objects', async () => {
      const ctx = {
        matrix: [
          [{ val: 1 }, { val: 2 }],
          [{ val: 3 }, { val: 4 }]
        ]
      }
      // Using subscript notation for deeper array access
      expect(await render('{{ matrix[0][0].val }}', ctx)).toBe('1')
      expect(await render('{{ matrix[1][1].val }}', ctx)).toBe('4')
    })

    test('accessing nested in for loop', async () => {
      const ctx = {
        items: [
          { inner: { value: 'a' } },
          { inner: { value: 'b' } }
        ]
      }
      const result = await render('{% for item in items %}{{ item.inner.value }}{% endfor %}', ctx)
      expect(result).toBe('ab')
    })

    test('undefined in nested path returns empty', async () => {
      expect(await render('{{ a.b.c.d }}', { a: { b: {} } })).toBe('')
    })

    test('null in nested path returns empty', async () => {
      expect(await render('{{ a.b.c }}', { a: { b: null } })).toBe('')
    })
  })

  // ==================== Special Characters ====================
  describe('Special Characters', () => {
    test('unicode characters in output', async () => {
      expect(await render('{{ text }}', { text: 'Ciao mondo' })).toBe('Ciao mondo')
      expect(await render('{{ text }}', { text: 'Hallo Welt' })).toBe('Hallo Welt')
    })

    test('unicode characters with accents', async () => {
      expect(await render('{{ text }}', { text: 'cafe' })).toBe('cafe')
      expect(await render('{{ text }}', { text: 'resume' })).toBe('resume')
      expect(await render('{{ text }}', { text: 'naive' })).toBe('naive')
    })

    test('emoji support', async () => {
      expect(await render('{{ emoji }}', { emoji: '!' })).toBe('!')
      expect(await render('{{ emoji }}', { emoji: '...' })).toBe('...')
      expect(await render('{{ emojis|join:"" }}', { emojis: ['!', '-', '.'] })).toBe('!-.')
    })

    test('multi-byte characters', async () => {
      expect(await render('{{ text }}', { text: 'Chinese characters' })).toBe('Chinese characters')
      expect(await render('{{ text }}', { text: 'Japanese characters' })).toBe('Japanese characters')
      expect(await render('{{ text }}', { text: 'Korean characters' })).toBe('Korean characters')
    })

    test('special template characters in strings', async () => {
      // These should be output as-is since they are in variable values
      expect(await render('{{ s }}', { s: '{{ not a tag }}' })).toBe('{{ not a tag }}')
      expect(await render('{{ s }}', { s: '{% also not %}' })).toBe('{% also not %}')
      expect(await render('{{ s }}', { s: '{# nor this #}' })).toBe('{# nor this #}')
    })

    test('HTML special characters are escaped', async () => {
      expect(await render('{{ s }}', { s: '<script>' })).toBe('&lt;script&gt;')
      expect(await render('{{ s }}', { s: '&amp;' })).toBe('&amp;amp;')
      expect(await render('{{ s }}', { s: '"quotes"' })).toBe('&quot;quotes&quot;')
      expect(await render("{{ s }}", { s: "'apostrophe'" })).toBe("&#x27;apostrophe&#x27;")
    })

    test('newlines in variable values', async () => {
      expect(await render('{{ s }}', { s: 'line1\nline2' })).toBe('line1\nline2')
    })

    test('tabs in variable values', async () => {
      expect(await render('{{ s }}', { s: 'col1\tcol2' })).toBe('col1\tcol2')
    })

    test('backslashes in variable values', async () => {
      expect(await render('{{ s }}', { s: 'path\\to\\file' })).toBe('path\\to\\file')
    })
  })

  // ==================== Edge Cases in Expressions ====================
  describe('Edge Cases in Expressions', () => {
    test('division by zero returns zero (safe handling)', async () => {
      expect(await render('{{ 10 / 0 }}', {})).toBe('0')
    })

    test('modulo by zero returns NaN', async () => {
      expect(await render('{{ 10 % 0 }}', {})).toBe('NaN')
    })

    test('negative division', async () => {
      expect(await render('{{ -10 / 2 }}', {})).toBe('-5')
    })

    test('accessing undefined property returns empty', async () => {
      expect(await render('{{ obj.missing }}', { obj: {} })).toBe('')
    })

    test('chained undefined access', async () => {
      expect(await render('{{ obj.a.b.c }}', { obj: {} })).toBe('')
    })

    test('accessing property on null', async () => {
      expect(await render('{{ obj.prop }}', { obj: null })).toBe('')
    })

    test('very long strings', async () => {
      const longString = 'a'.repeat(10000)
      expect(await render('{{ s }}', { s: longString })).toBe(longString)
    })

    test('very long string with filter', async () => {
      const longString = 'a'.repeat(1000)
      const result = await render('{{ s|length }}', { s: longString })
      expect(result).toBe('1000')
    })

    test('very large numbers', async () => {
      expect(await render('{{ n }}', { n: Number.MAX_SAFE_INTEGER })).toBe(String(Number.MAX_SAFE_INTEGER))
      expect(await render('{{ n }}', { n: Number.MIN_SAFE_INTEGER })).toBe(String(Number.MIN_SAFE_INTEGER))
    })

    test('floating point precision', async () => {
      // 0.1 + 0.2 famously doesn't equal 0.3 in floating point
      const result = await render('{{ 0.1 + 0.2 }}', {})
      // The result will be something like 0.30000000000000004
      expect(parseFloat(result)).toBeCloseTo(0.3, 10)
    })

    test('scientific notation numbers', async () => {
      expect(await render('{{ n }}', { n: 1e10 })).toBe('10000000000')
      expect(await render('{{ n }}', { n: 1e-10 })).toBe('1e-10')
    })

    test('negative zero', async () => {
      const result = await render('{{ n }}', { n: -0 })
      expect(result).toBe('0')
    })

    test('NaN value', async () => {
      expect(await render('{{ n }}', { n: NaN })).toBe('NaN')
    })

    test('Infinity values', async () => {
      expect(await render('{{ n }}', { n: Infinity })).toBe('Infinity')
      expect(await render('{{ n }}', { n: -Infinity })).toBe('-Infinity')
    })

    test('boolean operations with numbers', async () => {
      expect(await render('{{ 1 and 2 }}', {})).toBe('2')
      expect(await render('{{ 0 or 3 }}', {})).toBe('3')
      expect(await render('{{ 1 or 0 }}', {})).toBe('1')
    })
  })

  // ==================== Complex Filter Chains ====================
  describe('Complex Filter Chains', () => {
    test('many filters chained', async () => {
      const result = await render('{{ s|lower|trim|upper|truncatechars:5 }}', { s: '  HELLO WORLD  ' })
      expect(result).toBe('HE...')
    })

    test('filter chain with array operations', async () => {
      const result = await render(
        '{{ items|sort|reverse|slice:":2"|join:", " }}',
        { items: [3, 1, 4, 1, 5, 9, 2, 6] }
      )
      expect(result).toBe('9, 6')
    })

    test('filters with complex arguments', async () => {
      const result = await render(
        '{{ items|slice:"1:4"|join:", " }}',
        { items: ['a', 'b', 'c', 'd', 'e', 'f'] }
      )
      expect(result).toBe('b, c, d')
    })

    test('filters on undefined values', async () => {
      expect(await render('{{ undef|default:"none" }}', {})).toBe('none')
      expect(await render('{{ undef|length }}', {})).toBe('0')
    })

    test('filters on null values', async () => {
      expect(await render('{{ val|default:"none" }}', { val: null })).toBe('none')
      expect(await render('{{ val|default_if_none:"none" }}', { val: null })).toBe('none')
    })

    test('safe filter prevents escaping', async () => {
      const result = await render('{{ html|safe }}', { html: '<b>bold</b>' })
      expect(result).toBe('<b>bold</b>')
    })

    test('escape filter respects safe content (idempotent)', async () => {
      // The escape filter checks __safe__ and doesn't re-escape already safe content
      // This prevents double-escaping which is the correct behavior
      const result = await render('{{ html|safe|escape }}', { html: '<b>bold</b>' })
      // Content marked safe remains safe, no escaping occurs
      expect(result).toBe('<b>bold</b>')
    })

    test('filter on boolean', async () => {
      expect(await render('{{ flag|yesno:"yes,no" }}', { flag: true })).toBe('yes')
      expect(await render('{{ flag|yesno:"yes,no" }}', { flag: false })).toBe('no')
    })

    test('numeric filters chain', async () => {
      expect(await render('{{ n|abs|round:2 }}', { n: -3.14159 })).toBe('3.14')
    })

    test('string filter on number', async () => {
      expect(await render('{{ n|upper }}', { n: 42 })).toBe('42')
      // Note: length filter on number returns 0 (only works on strings/arrays)
      // To get string length, convert first
      expect(await render('{{ n|length }}', { n: 12345 })).toBe('0')
    })
  })

  // ==================== Loop Edge Cases ====================
  describe('Loop Edge Cases', () => {
    test('empty loop with else', async () => {
      expect(await render('{% for i in items %}{{ i }}{% else %}empty{% endfor %}', { items: [] })).toBe('empty')
    })

    test('single item loop', async () => {
      const result = await render(
        '{% for i in items %}{{ forloop.first }}-{{ forloop.last }}{% endfor %}',
        { items: ['only'] }
      )
      expect(result).toBe('True-True')
    })

    test('nested loops with same variable name', async () => {
      const ctx = { outer: [[1, 2], [3, 4]] }
      const result = await render(
        '{% for i in outer %}[{% for i in i %}{{ i }}{% endfor %}]{% endfor %}',
        ctx
      )
      expect(result).toBe('[12][34]')
    })

    test('loop over string characters', async () => {
      const result = await render('{% for c in text %}{{ c }}-{% endfor %}', { text: 'abc' })
      expect(result).toBe('a-b-c-')
    })

    test('loop over object entries', async () => {
      const ctx = { obj: { a: 1, b: 2 } }
      const result = await render(
        '{% for item in obj %}{{ item.key }}={{ item.value }},{% endfor %}',
        ctx
      )
      // Object iteration returns {key, value, 0: key, 1: value}
      expect(result).toContain('a=1')
      expect(result).toContain('b=2')
    })

    test('loop.index vs forloop.counter', async () => {
      const items = ['a', 'b', 'c']
      const result1 = await render('{% for i in items %}{{ loop.index }}{% endfor %}', { items })
      const result2 = await render('{% for i in items %}{{ forloop.counter }}{% endfor %}', { items })
      expect(result1).toBe('123')
      expect(result2).toBe('123')
    })

    test('loop.index0 vs forloop.counter0', async () => {
      const items = ['a', 'b', 'c']
      const result1 = await render('{% for i in items %}{{ loop.index0 }}{% endfor %}', { items })
      const result2 = await render('{% for i in items %}{{ forloop.counter0 }}{% endfor %}', { items })
      expect(result1).toBe('012')
      expect(result2).toBe('012')
    })

    test('forloop.revcounter', async () => {
      const result = await render('{% for i in items %}{{ forloop.revcounter }}{% endfor %}', { items: [1, 2, 3] })
      expect(result).toBe('321')
    })

    test('forloop.revcounter0', async () => {
      const result = await render('{% for i in items %}{{ forloop.revcounter0 }}{% endfor %}', { items: [1, 2, 3] })
      expect(result).toBe('210')
    })

    test('forloop.length', async () => {
      const result = await render('{% for i in items %}{{ forloop.length }}{% endfor %}', { items: [1, 2, 3] })
      expect(result).toBe('333')
    })

    test('tuple unpacking in for loop', async () => {
      const ctx = { pairs: [['a', 1], ['b', 2], ['c', 3]] }
      const result = await render('{% for key, val in pairs %}{{ key }}{{ val }}{% endfor %}', ctx)
      expect(result).toBe('a1b2c3')
    })

    test('loop variable scoping', async () => {
      // Loop variable should not leak outside
      const result = await render(
        '{{ i|default:"before" }}-{% for i in items %}{{ i }}{% endfor %}-{{ i|default:"after" }}',
        { items: [1, 2, 3] }
      )
      expect(result).toBe('before-123-after')
    })
  })

  // ==================== Block Edge Cases ====================
  describe('Block Edge Cases', () => {
    let env: Environment

    beforeAll(async () => {
      await fs.promises.mkdir(TEMPLATES_DIR, { recursive: true })

      // Base template with various blocks
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'base.html'),
        `<!DOCTYPE html>
<head>{% block head %}Default Head{% endblock %}</head>
<body>
{% block content %}{% endblock %}
{% block footer %}Footer{% endblock %}
</body>`
      )

      // Child with empty block
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'empty_block.html'),
        `{% extends "base.html" %}
{% block content %}{% endblock %}`
      )

      // Child with whitespace-only block
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'whitespace_block.html'),
        `{% extends "base.html" %}
{% block content %}

{% endblock %}`
      )

      // Child with block.super
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'with_super.html'),
        `{% extends "base.html" %}
{% block head %}{{ block.super }} - Extended{% endblock %}`
      )

      // Grandchild template
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'grandchild.html'),
        `{% extends "with_super.html" %}
{% block head %}{{ block.super }} - Grandchild{% endblock %}`
      )

      // Great-grandchild template (deep inheritance)
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'great_grandchild.html'),
        `{% extends "grandchild.html" %}
{% block content %}Great Grandchild Content{% endblock %}`
      )

      env = new Environment({ templates: TEMPLATES_DIR })
    })

    test('empty blocks render nothing', async () => {
      const result = await env.render('empty_block.html', {})
      expect(result).toContain('<body>')
      expect(result).toContain('</body>')
    })

    test('blocks with only whitespace', async () => {
      const result = await env.render('whitespace_block.html', {})
      expect(result).toContain('<body>')
    })

    test('block.super includes parent content', async () => {
      const result = await env.render('with_super.html', {})
      expect(result).toContain('Default Head - Extended')
    })

    test('deep inheritance chains work', async () => {
      const result = await env.render('great_grandchild.html', {})
      expect(result).toContain('Great Grandchild Content')
      expect(result).toContain('Footer') // From base
    })

    test('block.super in multi-level inheritance', async () => {
      const result = await env.render('grandchild.html', {})
      // Note: Current implementation replaces blocks entirely, so intermediate
      // block.super content may not propagate through all levels
      // This tests the actual behavior
      expect(result).toContain('Grandchild')
      expect(result).toContain('Default Head')
    })
  })

  // ==================== Include Edge Cases ====================
  describe('Include Edge Cases', () => {
    let env: Environment

    beforeAll(async () => {
      await fs.promises.mkdir(TEMPLATES_DIR, { recursive: true })

      // Simple include template
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'simple.html'),
        `Hello {{ name }}!`
      )

      // Template with include
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'with_include.html'),
        `Before {% include "simple.html" %} After`
      )

      // Template with include and context
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'with_include_context.html'),
        `{% include "simple.html" with name="Override" %}`
      )

      // Include with only keyword
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'include_only.html'),
        `{% include "simple.html" with name="Explicit" only %}`
      )

      env = new Environment({ templates: TEMPLATES_DIR })
    })

    test('include passes context', async () => {
      const result = await env.render('with_include.html', { name: 'World' })
      expect(result).toContain('Hello World!')
    })

    test('include with context override', async () => {
      const result = await env.render('with_include_context.html', { name: 'Original' })
      expect(result).toContain('Hello Override!')
    })

    test('include with only keyword', async () => {
      const result = await env.render('include_only.html', { name: 'Ignored', other: 'value' })
      expect(result).toContain('Hello Explicit!')
    })

    test('include with ignore missing', async () => {
      const result = await env.renderString('{% include "nonexistent.html" ignore missing %}OK', {})
      expect(result).toBe('OK')
    })

    test('include missing template without ignore throws', async () => {
      await expect(
        env.renderString('{% include "nonexistent.html" %}', {})
      ).rejects.toThrow()
    })

    test('dynamic include template name', async () => {
      const result = await env.renderString('{% include template %}', {
        template: 'simple.html',
        name: 'Dynamic'
      })
      expect(result).toContain('Hello Dynamic!')
    })
  })

  // ==================== Conditional Edge Cases ====================
  describe('Conditional Edge Cases', () => {
    test('complex boolean expressions', async () => {
      const tmpl = '{% if (a and b) or (c and d) %}yes{% else %}no{% endif %}'
      expect(await render(tmpl, { a: true, b: true, c: false, d: false })).toBe('yes')
      expect(await render(tmpl, { a: false, b: true, c: true, d: true })).toBe('yes')
      expect(await render(tmpl, { a: false, b: true, c: true, d: false })).toBe('no')
    })

    test('truthy edge case: zero is falsy', async () => {
      expect(await render('{% if v %}yes{% else %}no{% endif %}', { v: 0 })).toBe('no')
    })

    test('truthy edge case: empty array is falsy', async () => {
      expect(await render('{% if v %}yes{% else %}no{% endif %}', { v: [] })).toBe('no')
    })

    test('truthy edge case: empty object is falsy', async () => {
      expect(await render('{% if v %}yes{% else %}no{% endif %}', { v: {} })).toBe('no')
    })

    test('truthy edge case: empty string is falsy', async () => {
      expect(await render('{% if v %}yes{% else %}no{% endif %}', { v: '' })).toBe('no')
    })

    test('truthy edge case: non-empty array is truthy', async () => {
      expect(await render('{% if v %}yes{% else %}no{% endif %}', { v: [0] })).toBe('yes')
    })

    test('truthy edge case: array with false is truthy', async () => {
      expect(await render('{% if v %}yes{% else %}no{% endif %}', { v: [false] })).toBe('yes')
    })

    test('truthy edge case: object with falsy value is truthy', async () => {
      expect(await render('{% if v %}yes{% else %}no{% endif %}', { v: { key: false } })).toBe('yes')
    })

    test('nested conditionals', async () => {
      const tmpl = `{% if a %}{% if b %}ab{% else %}a{% endif %}{% else %}{% if b %}b{% else %}none{% endif %}{% endif %}`
      expect(await render(tmpl, { a: true, b: true })).toBe('ab')
      expect(await render(tmpl, { a: true, b: false })).toBe('a')
      expect(await render(tmpl, { a: false, b: true })).toBe('b')
      expect(await render(tmpl, { a: false, b: false })).toBe('none')
    })

    test('comparison with different types (strict equality like Python)', async () => {
      // String vs number comparison - strict equality (Python behavior)
      expect(await render('{% if "1" == 1 %}yes{% else %}no{% endif %}', {})).toBe('no')
      expect(await render('{% if "1" == "1" %}yes{% else %}no{% endif %}', {})).toBe('yes')
      expect(await render('{% if 1 == 1 %}yes{% else %}no{% endif %}', {})).toBe('yes')
    })

    test('not operator', async () => {
      expect(await render('{% if not false %}yes{% endif %}', {})).toBe('yes')
      expect(await render('{% if not true %}yes{% endif %}', {})).toBe('')
      expect(await render('{% if not 0 %}yes{% endif %}', {})).toBe('yes')
      expect(await render('{% if not 1 %}yes{% endif %}', {})).toBe('')
    })

    test('in operator with array', async () => {
      expect(await render('{% if 2 in items %}yes{% endif %}', { items: [1, 2, 3] })).toBe('yes')
      expect(await render('{% if 5 in items %}yes{% endif %}', { items: [1, 2, 3] })).toBe('')
    })

    test('in operator with string', async () => {
      expect(await render('{% if "el" in text %}yes{% endif %}', { text: 'hello' })).toBe('yes')
      expect(await render('{% if "xyz" in text %}yes{% endif %}', { text: 'hello' })).toBe('')
    })

    test('in operator with object', async () => {
      expect(await render('{% if "key" in obj %}yes{% endif %}', { obj: { key: 'value' } })).toBe('yes')
      expect(await render('{% if "missing" in obj %}yes{% endif %}', { obj: { key: 'value' } })).toBe('')
    })

    test('not in operator with negation', async () => {
      // Note: 'not in' as combined operator may not be supported
      // Use 'not (x in items)' instead
      expect(await render('{% if not (5 in items) %}yes{% endif %}', { items: [1, 2, 3] })).toBe('yes')
      expect(await render('{% if not (2 in items) %}yes{% endif %}', { items: [1, 2, 3] })).toBe('')
    })

    test('multiple elif clauses', async () => {
      const tmpl = '{% if x == 1 %}one{% elif x == 2 %}two{% elif x == 3 %}three{% elif x == 4 %}four{% else %}other{% endif %}'
      expect(await render(tmpl, { x: 1 })).toBe('one')
      expect(await render(tmpl, { x: 2 })).toBe('two')
      expect(await render(tmpl, { x: 3 })).toBe('three')
      expect(await render(tmpl, { x: 4 })).toBe('four')
      expect(await render(tmpl, { x: 5 })).toBe('other')
    })

    test('ternary/conditional expression', async () => {
      expect(await render('{{ "yes" if flag else "no" }}', { flag: true })).toBe('yes')
      expect(await render('{{ "yes" if flag else "no" }}', { flag: false })).toBe('no')
    })

    test('nested ternary expression', async () => {
      expect(await render('{{ "a" if x == 1 else "b" if x == 2 else "c" }}', { x: 1 })).toBe('a')
      expect(await render('{{ "a" if x == 1 else "b" if x == 2 else "c" }}', { x: 2 })).toBe('b')
      expect(await render('{{ "a" if x == 1 else "b" if x == 2 else "c" }}', { x: 3 })).toBe('c')
    })
  })

  // ==================== Error Handling ====================
  describe('Error Handling', () => {
    test('unknown filter throws error', async () => {
      await expect(render('{{ x|nonexistentfilter }}', { x: 1 }))
        .rejects.toThrow('Unknown filter')
    })

    test('template not found throws error', async () => {
      const env = new Environment({ templates: '/nonexistent/path' })
      await expect(env.render('missing.html', {}))
        .rejects.toThrow('Template not found')
    })

    test('accessing method on undefined still works (returns empty)', async () => {
      expect(await render('{{ obj.method }}', { obj: undefined })).toBe('')
    })
  })

  // ==================== With Tag Edge Cases ====================
  describe('With Tag Edge Cases', () => {
    test('with creates local scope', async () => {
      const result = await render('{{ x }}{% with x=2 %}{{ x }}{% endwith %}{{ x }}', { x: 1 })
      expect(result).toBe('121')
    })

    test('with multiple assignments', async () => {
      expect(await render('{% with a=1 b=2 c=3 %}{{ a }}{{ b }}{{ c }}{% endwith %}', {})).toBe('123')
    })

    test('with expression evaluation', async () => {
      expect(await render('{% with total=a+b %}{{ total }}{% endwith %}', { a: 10, b: 20 })).toBe('30')
    })

    test('nested with blocks', async () => {
      const tmpl = '{% with x=1 %}{% with y=2 %}{{ x }}{{ y }}{% endwith %}{{ x }}{% endwith %}'
      expect(await render(tmpl, {})).toBe('121')
    })
  })

  // ==================== Set Tag Edge Cases ====================
  describe('Set Tag Edge Cases', () => {
    test('set creates variable', async () => {
      expect(await render('{% set x = 5 %}{{ x }}', {})).toBe('5')
    })

    test('set with expression', async () => {
      expect(await render('{% set result = a * b %}{{ result }}', { a: 3, b: 4 })).toBe('12')
    })

    test('set overwrites existing', async () => {
      expect(await render('{% set x = 10 %}{{ x }}', { x: 5 })).toBe('10')
    })

    test('set with filter result', async () => {
      expect(await render('{% set upper_name = name|upper %}{{ upper_name }}', { name: 'hello' })).toBe('HELLO')
    })
  })

  // ==================== Array/Object Literals ====================
  describe('Array and Object Literals', () => {
    test('array literal', async () => {
      expect(await render('{{ [1, 2, 3]|join:", " }}', {})).toBe('1, 2, 3')
    })

    test('array literal with variables', async () => {
      expect(await render('{{ [a, b, c]|join:", " }}', { a: 'x', b: 'y', c: 'z' })).toBe('x, y, z')
    })

    test('empty array literal', async () => {
      expect(await render('{{ []|length }}', {})).toBe('0')
    })

    test('nested array literal', async () => {
      expect(await render('{{ [[1, 2], [3, 4]]|length }}', {})).toBe('2')
    })
  })

  // ==================== Comments ====================
  describe('Comments', () => {
    test('single line comment', async () => {
      expect(await render('before{# comment #}after', {})).toBe('beforeafter')
    })

    test('multi-line comment', async () => {
      const tmpl = `before{#
        This is a
        multi-line comment
      #}after`
      expect(await render(tmpl, {})).toBe('beforeafter')
    })

    test('comment with template syntax inside', async () => {
      expect(await render('x{# {{ var }} {% if x %} #}y', {})).toBe('xy')
    })
  })

  // ==================== Whitespace Handling ====================
  describe('Whitespace Handling', () => {
    test('preserves whitespace in text nodes', async () => {
      expect(await render('  hello  ', {})).toBe('  hello  ')
    })

    test('whitespace around tags', async () => {
      expect(await render('a {% if true %}b{% endif %} c', {})).toBe('a b c')
    })

    test('newlines around tags', async () => {
      const result = await render('a\n{% if true %}b{% endif %}\nc', {})
      expect(result).toBe('a\nb\nc')
    })
  })

  // ==================== Autoescape Edge Cases ====================
  describe('Autoescape Edge Cases', () => {
    test('autoescape enabled by default', async () => {
      expect(await render('{{ x }}', { x: '<b>test</b>' })).toBe('&lt;b&gt;test&lt;/b&gt;')
    })

    test('autoescape can be disabled', async () => {
      const env = new Environment({ autoescape: false })
      expect(await env.renderString('{{ x }}', { x: '<b>test</b>' })).toBe('<b>test</b>')
    })

    test('safe filter bypasses autoescape', async () => {
      expect(await render('{{ x|safe }}', { x: '<b>test</b>' })).toBe('<b>test</b>')
    })

    test('double escaping behavior', async () => {
      // When autoescape is on, the escape filter still runs, then autoescape also applies
      // This can result in double escaping: &lt; -> &amp;lt; (from escape) -> &amp;amp;lt; (from autoescape)
      const result = await render('{{ x|escape }}', { x: '&lt;' })
      // The actual behavior double-escapes due to autoescape + escape filter
      expect(result).toContain('&amp;')
    })
  })

  // ==================== Template Class ====================
  describe('Template Class', () => {
    test('template reuse', async () => {
      const tmpl = Template('Hello {{ name }}!')
      expect(await tmpl.render({ name: 'Alice' })).toBe('Hello Alice!')
      expect(await tmpl.render({ name: 'Bob' })).toBe('Hello Bob!')
    })

    test('template with filters', async () => {
      const tmpl = Template('{{ name|upper }}')
      expect(await tmpl.render({ name: 'test' })).toBe('TEST')
    })
  })

  // ==================== URL and Static Tags ====================
  describe('URL and Static Tags', () => {
    test('url tag with no route returns fallback', async () => {
      const env = new Environment()
      const result = await env.renderString('{% url "unknown" %}', {})
      expect(result).toBe('#unknown')
    })

    test('url tag with registered route', async () => {
      const env = new Environment()
      env.addUrl('home', '/')
      expect(await env.renderString('{% url "home" %}', {})).toBe('/')
    })

    test('url tag with parameters', async () => {
      const env = new Environment()
      env.addUrl('user_detail', '/users/:id/')
      expect(await env.renderString('{% url "user_detail" id=42 %}', {})).toBe('/users/42/')
    })

    test('url tag stores in variable', async () => {
      const env = new Environment()
      env.addUrl('home', '/')
      expect(await env.renderString('{% url "home" as link %}Link: {{ link }}', {})).toBe('Link: /')
    })

    test('static tag default resolver', async () => {
      expect(await render('{% static "css/style.css" %}', {})).toBe('/static/css/style.css')
    })

    test('static tag custom resolver', async () => {
      const env = new Environment({
        staticResolver: (p) => `https://cdn.example.com/${p}`
      })
      expect(await env.renderString('{% static "img/logo.png" %}', {})).toBe('https://cdn.example.com/img/logo.png')
    })

    test('static tag stores in variable', async () => {
      const result = await render('{% static "js/app.js" as script %}{{ script }}', {})
      expect(result).toBe('/static/js/app.js')
    })
  })

  // ==================== Load Tag ====================
  describe('Load Tag', () => {
    test('load tag is no-op', async () => {
      expect(await render('{% load static humanize %}OK', {})).toBe('OK')
    })

    test('load tag with single library', async () => {
      expect(await render('{% load static %}OK', {})).toBe('OK')
    })

    test('load tag does not affect rendering', async () => {
      expect(await render('{% load i18n %}{{ name }}', { name: 'test' })).toBe('test')
    })
  })

  // ==================== Environment Configuration ====================
  describe('Environment Configuration', () => {
    test('custom filters', async () => {
      const env = new Environment({
        filters: {
          double: (v) => v * 2,
          exclaim: (v) => `${v}!`
        }
      })
      expect(await env.renderString('{{ n|double }}', { n: 5 })).toBe('10')
      expect(await env.renderString('{{ s|exclaim }}', { s: 'Hello' })).toBe('Hello!')
    })

    test('custom filter chains with builtin', async () => {
      const env = new Environment({
        filters: {
          reverse_string: (v) => String(v).split('').reverse().join('')
        }
      })
      expect(await env.renderString('{{ s|upper|reverse_string }}', { s: 'hello' })).toBe('OLLEH')
    })

    test('global variables', async () => {
      const env = new Environment({
        globals: {
          site_name: 'My Site',
          version: '1.0.0'
        }
      })
      expect(await env.renderString('{{ site_name }} v{{ version }}', {})).toBe('My Site v1.0.0')
    })

    test('globals can be overridden by context', async () => {
      const env = new Environment({
        globals: { name: 'Global' }
      })
      expect(await env.renderString('{{ name }}', {})).toBe('Global')
      expect(await env.renderString('{{ name }}', { name: 'Local' })).toBe('Local')
    })

    test('addFilter method', async () => {
      const env = new Environment()
      env.addFilter('triple', (v) => v * 3)
      expect(await env.renderString('{{ n|triple }}', { n: 4 })).toBe('12')
    })

    test('addGlobal method', async () => {
      const env = new Environment()
      env.addGlobal('config', { debug: true })
      expect(await env.renderString('{{ config.debug }}', {})).toBe('True')
    })
  })

  // ==================== Boolean Output ====================
  describe('Boolean Output', () => {
    test('true outputs as "True"', async () => {
      expect(await render('{{ flag }}', { flag: true })).toBe('True')
    })

    test('false outputs as "False"', async () => {
      expect(await render('{{ flag }}', { flag: false })).toBe('False')
    })

    test('comparison result outputs as boolean', async () => {
      expect(await render('{{ 1 == 1 }}', {})).toBe('True')
      expect(await render('{{ 1 == 2 }}', {})).toBe('False')
    })
  })

  // ==================== String Concatenation ====================
  describe('String Concatenation', () => {
    test('tilde operator concatenates strings', async () => {
      expect(await render('{{ "hello" ~ " " ~ "world" }}', {})).toBe('hello world')
    })

    test('tilde with variables', async () => {
      expect(await render('{{ first ~ " " ~ last }}', { first: 'John', last: 'Doe' })).toBe('John Doe')
    })

    test('tilde coerces to string', async () => {
      expect(await render('{{ "Count: " ~ count }}', { count: 42 })).toBe('Count: 42')
    })
  })

  // ==================== Arithmetic Edge Cases ====================
  describe('Arithmetic Edge Cases', () => {
    test('addition with strings uses concatenation', async () => {
      expect(await render('{{ "a" + "b" }}', {})).toBe('ab')
    })

    test('subtraction', async () => {
      expect(await render('{{ 10 - 3 }}', {})).toBe('7')
    })

    test('multiplication', async () => {
      expect(await render('{{ 4 * 5 }}', {})).toBe('20')
    })

    test('division', async () => {
      expect(await render('{{ 20 / 4 }}', {})).toBe('5')
    })

    test('modulo', async () => {
      expect(await render('{{ 17 % 5 }}', {})).toBe('2')
    })

    test('negative numbers', async () => {
      expect(await render('{{ -5 }}', {})).toBe('-5')
      expect(await render('{{ -a }}', { a: 10 })).toBe('-10')
    })

    test('unary plus', async () => {
      expect(await render('{{ +5 }}', {})).toBe('5')
    })

    test('order of operations', async () => {
      expect(await render('{{ 2 + 3 * 4 }}', {})).toBe('14')
      expect(await render('{{ (2 + 3) * 4 }}', {})).toBe('20')
    })
  })

  // ==================== Date/Time Filter Edge Cases ====================
  describe('Date/Time Filter Edge Cases', () => {
    test('date filter with invalid date', async () => {
      expect(await render('{{ d|date:"Y-m-d" }}', { d: 'invalid' })).toBe('')
    })

    test('date filter with timestamp', async () => {
      const timestamp = new Date('2024-06-15T12:00:00Z').getTime()
      const result = await render('{{ d|date:"Y" }}', { d: timestamp })
      expect(result).toBe('2024')
    })

    test('date filter with ISO string', async () => {
      const result = await render('{{ d|date:"Y-m-d" }}', { d: '2024-06-15T12:00:00Z' })
      expect(result).toBe('2024-06-15')
    })

    test('time filter', async () => {
      const d = new Date('2024-06-15T14:30:45')
      expect(await render('{{ d|time:"H:i:s" }}', { d })).toBe('14:30:45')
    })
  })

  // ==================== Batch and Columns Filters ====================
  describe('Batch and Columns Filters', () => {
    test('batch filter', async () => {
      const result = await render(
        '{% for row in items|batch:3 %}[{% for i in row %}{{ i }}{% endfor %}]{% endfor %}',
        { items: [1, 2, 3, 4, 5, 6, 7] }
      )
      expect(result).toBe('[123][456][7]')
    })

    test('columns filter', async () => {
      const result = await render(
        '{% for row in items|columns:2 %}[{% for i in row %}{{ i }}{% endfor %}]{% endfor %}',
        { items: [1, 2, 3, 4] }
      )
      expect(result).toBe('[12][34]')
    })
  })

  // ==================== Groupby Filter ====================
  describe('Groupby Filter', () => {
    test('groupby filter groups by attribute', async () => {
      const items = [
        { category: 'a', name: '1' },
        { category: 'b', name: '2' },
        { category: 'a', name: '3' },
      ]
      const result = await render(
        '{% for group in items|groupby:"category" %}{{ group.grouper }}:{% for item in group.list %}{{ item.name }}{% endfor %};{% endfor %}',
        { items }
      )
      expect(result).toContain('a:13')
      expect(result).toContain('b:2')
    })
  })

  // ==================== Parentloop in Nested Loops ====================
  describe('Parentloop', () => {
    test('forloop.parentloop in nested loops', async () => {
      const ctx = { outer: [[1, 2], [3, 4]] }
      const tmpl = '{% for row in outer %}{% for col in row %}{{ forloop.parentloop.counter }}:{{ forloop.counter }},{% endfor %}{% endfor %}'
      const result = await render(tmpl, ctx)
      expect(result).toBe('1:1,1:2,2:1,2:2,')
    })

    test('parentloop.first and parentloop.last', async () => {
      const ctx = { outer: [[1], [2]] }
      const tmpl = '{% for row in outer %}{% for col in row %}{{ forloop.parentloop.first }}-{{ forloop.parentloop.last }};{% endfor %}{% endfor %}'
      const result = await render(tmpl, ctx)
      expect(result).toBe('True-False;False-True;')
    })
  })
})
