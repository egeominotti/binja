/**
 * Extended Filters Tests - Additional Jinja2/Django filters
 */
import { describe, test, expect } from 'bun:test'
import { render } from '../src'

describe('Extended Filters', () => {
  describe('wordwrap', () => {
    test('wraps text at specified width', async () => {
      const result = await render('{{ text|wordwrap(10) }}', {
        text: 'hello world foo bar'
      })
      expect(result).toBe('hello\nworld foo\nbar')
    })

    test('handles long words', async () => {
      const result = await render('{{ text|wordwrap(5) }}', {
        text: 'abcdefghij'
      })
      expect(result).toBe('abcde\nfghij')
    })

    test('uses default width of 79', async () => {
      const result = await render('{{ text|wordwrap }}', {
        text: 'short'
      })
      expect(result).toBe('short')
    })
  })

  describe('indent', () => {
    test('indents lines with spaces', async () => {
      const result = await render('{{ text|indent(2) }}', {
        text: 'line1\nline2\nline3'
      })
      expect(result).toBe('line1\n  line2\n  line3')
    })

    test('indents first line when first=true', async () => {
      const result = await render('{{ text|indent(2, true) }}', {
        text: 'line1\nline2'
      })
      expect(result).toBe('  line1\n  line2')
    })

    test('uses default indent of 4', async () => {
      const result = await render('{{ text|indent }}', {
        text: 'a\nb'
      })
      expect(result).toBe('a\n    b')
    })
  })

  describe('replace', () => {
    test('replaces all occurrences', async () => {
      const result = await render('{{ text|replace("o", "0") }}', {
        text: 'hello world'
      })
      expect(result).toBe('hell0 w0rld')
    })

    test('replaces limited occurrences', async () => {
      const result = await render('{{ text|replace("o", "0", 1) }}', {
        text: 'hello world'
      })
      expect(result).toBe('hell0 world')
    })
  })

  describe('format', () => {
    test('formats with positional args', async () => {
      const result = await render('{{ "%s is %s"|format("sky", "blue") }}', {})
      expect(result).toBe('sky is blue')
    })
  })

  describe('string', () => {
    test('converts number to string', async () => {
      const result = await render('{{ num|string }}', { num: 42 })
      expect(result).toBe('42')
    })

    test('converts boolean to string', async () => {
      const result = await render('{{ val|string }}', { val: true })
      expect(result).toBe('true')
    })
  })

  describe('list', () => {
    test('converts string to list of chars', async () => {
      const result = await render('{{ text|list|join("-") }}', { text: 'abc' })
      expect(result).toBe('a-b-c')
    })

    test('returns array as-is', async () => {
      const result = await render('{{ arr|list|join }}', { arr: [1, 2, 3] })
      expect(result).toBe('123')
    })
  })

  describe('map', () => {
    test('extracts attribute from objects', async () => {
      const result = await render('{{ items|map("name")|join(", ") }}', {
        items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
      })
      expect(result).toBe('a, b, c')
    })
  })

  describe('select', () => {
    test('filters truthy values', async () => {
      const result = await render('{{ items|select|join }}', {
        items: [0, 1, '', 'a', null, true, false]
      })
      expect(result).toBe('1atrue')
    })
  })

  describe('reject', () => {
    test('filters falsy values', async () => {
      const result = await render('{{ items|reject|length }}', {
        items: [0, 1, '', 'a', null, true, false]
      })
      expect(result).toBe('4') // 0, '', null, false
    })
  })

  describe('selectattr', () => {
    test('filters by truthy attribute', async () => {
      const result = await render('{{ items|selectattr("active")|length }}', {
        items: [
          { name: 'a', active: true },
          { name: 'b', active: false },
          { name: 'c', active: true }
        ]
      })
      expect(result).toBe('2')
    })

    test('filters by attribute equality', async () => {
      const result = await render('{{ items|selectattr("type", "eq", "admin")|length }}', {
        items: [
          { name: 'a', type: 'admin' },
          { name: 'b', type: 'user' },
          { name: 'c', type: 'admin' }
        ]
      })
      expect(result).toBe('2')
    })
  })

  describe('rejectattr', () => {
    test('rejects by truthy attribute', async () => {
      const result = await render('{{ items|rejectattr("active")|length }}', {
        items: [
          { name: 'a', active: true },
          { name: 'b', active: false },
          { name: 'c', active: true }
        ]
      })
      expect(result).toBe('1')
    })
  })

  describe('attr', () => {
    test('gets attribute from object', async () => {
      const result = await render('{{ obj|attr("name") }}', {
        obj: { name: 'test', value: 42 }
      })
      expect(result).toBe('test')
    })

    test('returns undefined for missing attribute', async () => {
      const result = await render('{{ obj|attr("missing")|default("none") }}', {
        obj: { name: 'test' }
      })
      expect(result).toBe('none')
    })
  })

  describe('max', () => {
    test('returns maximum number', async () => {
      const result = await render('{{ nums|max }}', { nums: [3, 1, 4, 1, 5] })
      expect(result).toBe('5')
    })

    test('returns max object by attribute', async () => {
      const result = await render('{{ (items|max("score")).score }}', {
        items: [{ score: 10 }, { score: 50 }, { score: 30 }]
      })
      expect(result).toBe('50')
    })

    test('returns default for empty array', async () => {
      const result = await render('{{ nums|max("x", 0) }}', { nums: [] })
      expect(result).toBe('0')
    })
  })

  describe('min', () => {
    test('returns minimum number', async () => {
      const result = await render('{{ nums|min }}', { nums: [3, 1, 4, 1, 5] })
      expect(result).toBe('1')
    })

    test('returns min object by attribute', async () => {
      const result = await render('{{ (items|min("score")).score }}', {
        items: [{ score: 10 }, { score: 50 }, { score: 30 }]
      })
      expect(result).toBe('10')
    })
  })

  describe('sum', () => {
    test('sums numbers', async () => {
      const result = await render('{{ nums|sum }}', { nums: [1, 2, 3, 4, 5] })
      expect(result).toBe('15')
    })

    test('sums by attribute', async () => {
      const result = await render('{{ items|sum("value") }}', {
        items: [{ value: 10 }, { value: 20 }, { value: 30 }]
      })
      expect(result).toBe('60')
    })

    test('uses start value', async () => {
      const result = await render('{{ nums|sum("x", 100) }}', { nums: [1, 2, 3] })
      expect(result).toBe('100') // No attribute, so returns start
    })
  })

  describe('pprint', () => {
    test('pretty prints object', async () => {
      const result = await render('{{ obj|pprint }}', { obj: { a: 1 } })
      expect(result).toContain('"a"')
      expect(result).toContain('1')
    })
  })

  describe('forceescape', () => {
    test('escapes even safe strings', async () => {
      const result = await render('{{ html|safe|forceescape }}', {
        html: '<b>bold</b>'
      })
      expect(result).toBe('&lt;b&gt;bold&lt;/b&gt;')
    })
  })

  describe('phone2numeric', () => {
    test('converts letters to phone numbers', async () => {
      const result = await render('{{ phone|phone2numeric }}', {
        phone: '1-800-COLLECT'
      })
      expect(result).toBe('1-800-2655328')
    })
  })

  describe('linenumbers', () => {
    test('adds line numbers', async () => {
      const result = await render('{{ text|linenumbers }}', {
        text: 'line1\nline2\nline3'
      })
      expect(result).toBe('1. line1\n2. line2\n3. line3')
    })

    test('pads line numbers for many lines', async () => {
      const lines = Array.from({ length: 12 }, (_, i) => `line${i + 1}`).join('\n')
      const result = await render('{{ text|linenumbers }}', { text: lines })
      expect(result).toContain(' 1. line1')
      expect(result).toContain('12. line12')
    })
  })

  describe('unordered_list', () => {
    test('creates HTML list', async () => {
      const result = await render('{{ items|unordered_list }}', {
        items: ['a', 'b', 'c']
      })
      expect(result).toContain('<li>a</li>')
      expect(result).toContain('<li>b</li>')
      expect(result).toContain('<li>c</li>')
    })

    test('handles nested lists', async () => {
      const result = await render('{{ items|unordered_list }}', {
        items: ['a', ['b', 'c']]
      })
      expect(result).toContain('<li>a')
      expect(result).toContain('<ul>')
      expect(result).toContain('<li>b</li>')
    })
  })

  describe('groupby', () => {
    test('groups array by attribute', async () => {
      const result = await render(
        '{% for group in items|groupby("category") %}{{ group.grouper }}:{% for item in group.list %}{{ item.name }}{% endfor %};{% endfor %}',
        {
          items: [
            { name: 'apple', category: 'fruit' },
            { name: 'banana', category: 'fruit' },
            { name: 'carrot', category: 'vegetable' },
            { name: 'broccoli', category: 'vegetable' }
          ]
        }
      )
      expect(result).toBe('fruit:applebanana;vegetable:carrotbroccoli;')
    })

    test('groups by value when no attribute specified', async () => {
      const result = await render(
        '{% for group in items|groupby %}{{ group.grouper }}({{ group.list|length }}){% endfor %}',
        { items: ['a', 'a', 'b', 'b', 'b', 'c'] }
      )
      expect(result).toBe('a(2)b(3)c(1)')
    })

    test('returns empty array for non-array input', async () => {
      const result = await render('{{ items|groupby("x")|length }}', { items: 'string' })
      expect(result).toBe('0')
    })

    test('handles empty array', async () => {
      const result = await render('{{ items|groupby("x")|length }}', { items: [] })
      expect(result).toBe('0')
    })

    test('handles items with missing attribute', async () => {
      const result = await render(
        '{% for g in items|groupby("cat") %}{{ g.grouper }}:{{ g.list|length }};{% endfor %}',
        {
          items: [
            { name: 'a', cat: 'x' },
            { name: 'b' }, // missing cat
            { name: 'c', cat: 'x' }
          ]
        }
      )
      expect(result).toContain('x:2')
      expect(result).toContain('undefined:1')
    })
  })

  describe('dictsortreversed', () => {
    test('sorts array of objects by key in reverse order', async () => {
      const result = await render(
        '{% for item in items|dictsortreversed("name") %}{{ item.name }}{% endfor %}',
        {
          items: [
            { name: 'cherry' },
            { name: 'apple' },
            { name: 'banana' }
          ]
        }
      )
      expect(result).toBe('cherrybananaapple')
    })

    test('sorts by value when no key specified', async () => {
      const result = await render(
        '{{ items|dictsortreversed|join(",") }}',
        { items: [1, 3, 2, 5, 4] }
      )
      expect(result).toBe('5,4,3,2,1')
    })

    test('returns non-array as-is', async () => {
      const result = await render('{{ value|dictsortreversed }}', { value: 'string' })
      expect(result).toBe('string')
    })

    test('handles empty array', async () => {
      const result = await render('{{ items|dictsortreversed|join }}', { items: [] })
      expect(result).toBe('')
    })

    test('handles numeric keys', async () => {
      const result = await render(
        '{% for item in items|dictsortreversed("score") %}{{ item.score }}{% endfor %}',
        {
          items: [
            { name: 'a', score: 50 },
            { name: 'b', score: 100 },
            { name: 'c', score: 25 }
          ]
        }
      )
      expect(result).toBe('1005025')
    })
  })
})
