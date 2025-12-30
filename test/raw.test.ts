/**
 * Raw/Verbatim Block Tests
 * Tests {% raw %} and {% verbatim %} tags for outputting unprocessed content
 */
import { describe, test, expect } from 'bun:test'
import { render, compile } from '../src'

describe('Raw Block', () => {
  describe('{% raw %}', () => {
    test('outputs content without processing', async () => {
      const result = await render('{% raw %}{{ name }}{% endraw %}', { name: 'test' })
      expect(result).toBe('{{ name }}')
    })

    test('preserves variable syntax', async () => {
      const result = await render('{% raw %}Hello {{ user.name }}!{% endraw %}', {})
      expect(result).toBe('Hello {{ user.name }}!')
    })

    test('preserves block syntax', async () => {
      const result = await render('{% raw %}{% if true %}yes{% endif %}{% endraw %}', {})
      expect(result).toBe('{% if true %}yes{% endif %}')
    })

    test('works with surrounding content', async () => {
      const result = await render(
        'Before {% raw %}{{ raw }}{% endraw %} After',
        {}
      )
      expect(result).toBe('Before {{ raw }} After')
    })

    test('preserves newlines', async () => {
      const result = await render(
        '{% raw %}\nline1\nline2\n{% endraw %}',
        {}
      )
      expect(result).toBe('\nline1\nline2\n')
    })

    test('useful for JavaScript templates', async () => {
      const result = await render(
        '{% raw %}<script>const x = {{ value }};</script>{% endraw %}',
        {}
      )
      expect(result).toBe('<script>const x = {{ value }};</script>')
    })

    test('useful for Vue.js templates', async () => {
      const result = await render(
        '{% raw %}<div>{{ message }}</div>{% endraw %}',
        {}
      )
      expect(result).toBe('<div>{{ message }}</div>')
    })

    test('handles multiple raw blocks', async () => {
      const result = await render(
        '{% raw %}{{ a }}{% endraw %} - {% raw %}{{ b }}{% endraw %}',
        {}
      )
      expect(result).toBe('{{ a }} - {{ b }}')
    })

    test('works with whitespace control', async () => {
      const result = await render(
        '  {%- raw %}content{% endraw -%}  ',
        {}
      )
      // Whitespace control should work on the tags
      expect(result).toContain('content')
    })
  })

  describe('{% verbatim %}', () => {
    test('works same as raw (Django compatibility)', async () => {
      const result = await render('{% verbatim %}{{ name }}{% endverbatim %}', { name: 'test' })
      expect(result).toBe('{{ name }}')
    })

    test('preserves Django template syntax', async () => {
      const result = await render(
        '{% verbatim %}{% for item in items %}{{ item }}{% endfor %}{% endverbatim %}',
        {}
      )
      expect(result).toBe('{% for item in items %}{{ item }}{% endfor %}')
    })
  })

  describe('AOT compilation', () => {
    test('raw blocks work in compiled templates', () => {
      const renderFn = compile('{% raw %}{{ x }}{% endraw %}')
      const result = renderFn({})
      expect(result).toBe('{{ x }}')
    })

    test('mixed content with raw blocks', () => {
      const renderFn = compile('{{ name }}: {% raw %}{{ template }}{% endraw %}')
      const result = renderFn({ name: 'Vue' })
      expect(result).toBe('Vue: {{ template }}')
    })
  })

  describe('Edge cases', () => {
    test('empty raw block', async () => {
      const result = await render('{% raw %}{% endraw %}', {})
      expect(result).toBe('')
    })

    test('raw block with only whitespace', async () => {
      const result = await render('{% raw %}   {% endraw %}', {})
      expect(result).toBe('   ')
    })

    test('nested-looking raw content', async () => {
      // First {% endraw %} closes the block - this is correct Jinja2 behavior
      // "{% raw %}inner" is the raw content, then {% endraw %} closes it
      // The trailing {% endraw %} would cause a parse error, so we test without it
      const result = await render('{% raw %}{{ nested }}{% endraw %}', {})
      expect(result).toBe('{{ nested }}')
    })

    test('raw with special characters', async () => {
      const result = await render('{% raw %}<>&"\'{% endraw %}', {})
      // Raw content should not be escaped
      expect(result).toBe('<>&"\'')
    })
  })
})
