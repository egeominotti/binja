/**
 * Filters Tests - Based on Jinja2 test_filters.py
 */
import { describe, test, expect } from 'bun:test'
import { render } from '../src'

describe('Filters', () => {
  describe('String Filters', () => {
    test('upper', async () => {
      expect(await render('{{ s|upper }}', { s: 'hello' })).toBe('HELLO')
    })

    test('lower', async () => {
      expect(await render('{{ s|lower }}', { s: 'HELLO' })).toBe('hello')
    })

    test('capitalize', async () => {
      expect(await render('{{ s|capitalize }}', { s: 'hELLO' })).toBe('Hello')
    })

    test('capfirst', async () => {
      expect(await render('{{ s|capfirst }}', { s: 'hello world' })).toBe('Hello world')
    })

    test('title', async () => {
      expect(await render('{{ s|title }}', { s: 'hello world' })).toBe('Hello World')
    })

    test('trim', async () => {
      expect(await render('{{ s|trim }}', { s: '  hello  ' })).toBe('hello')
    })

    test('striptags', async () => {
      expect(await render('{{ s|striptags }}', { s: '<b>hello</b>' })).toBe('hello')
    })

    test('escape', async () => {
      const result = await render('{{ s|escape }}', { s: '<script>alert(1)</script>' })
      expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    })

    test('safe', async () => {
      const result = await render('{{ s|safe }}', { s: '<b>bold</b>' })
      expect(result).toBe('<b>bold</b>')
    })

    test('escapejs', async () => {
      const result = await render('{{ s|escapejs }}', { s: 'hello\n"world"' })
      expect(result).toContain('hello')
    })

    test('linebreaks', async () => {
      const result = await render('{{ s|linebreaks }}', { s: 'hello\n\nworld' })
      expect(result).toContain('<p>')
    })

    test('linebreaksbr', async () => {
      const result = await render('{{ s|linebreaksbr }}', { s: 'hello\nworld' })
      expect(result).toBe('hello<br>world')
    })

    test('truncatechars', async () => {
      const result = await render('{{ s|truncatechars:10 }}', { s: 'hello world foo bar' })
      expect(result.length).toBeLessThanOrEqual(10)
      expect(result).toContain('...')
    })

    test('truncatewords', async () => {
      const result = await render('{{ s|truncatewords:2 }}', { s: 'one two three four' })
      expect(result).toBe('one two...')
    })

    test('wordcount', async () => {
      expect(await render('{{ s|wordcount }}', { s: 'hello world foo' })).toBe('3')
    })

    test('center', async () => {
      const result = await render('{{ s|center:11 }}', { s: 'hello' })
      expect(result.length).toBe(11)
    })

    test('ljust', async () => {
      const result = await render('{{ s|ljust:10 }}', { s: 'hello' })
      expect(result).toBe('hello     ')
    })

    test('rjust', async () => {
      const result = await render('{{ s|rjust:10 }}', { s: 'hello' })
      expect(result).toBe('     hello')
    })

    test('cut', async () => {
      expect(await render('{{ s|cut:" " }}', { s: 'hello world' })).toBe('helloworld')
    })

    test('slugify', async () => {
      expect(await render('{{ s|slugify }}', { s: 'Hello World!' })).toBe('hello-world')
    })
  })

  describe('Number Filters', () => {
    test('abs', async () => {
      expect(await render('{{ n|abs }}', { n: -5 })).toBe('5')
    })

    test('round', async () => {
      expect(await render('{{ n|round:2 }}', { n: 3.14159 })).toBe('3.14')
    })

    test('int', async () => {
      expect(await render('{{ n|int }}', { n: '42' })).toBe('42')
    })

    test('float', async () => {
      expect(await render('{{ n|float }}', { n: '3.14' })).toBe('3.14')
    })

    test('floatformat with decimals', async () => {
      expect(await render('{{ n|floatformat:2 }}', { n: 3.14159 })).toBe('3.14')
    })

    test('floatformat without decimals', async () => {
      expect(await render('{{ n|floatformat }}', { n: 34.0 })).toBe('34')
    })

    test('add with numbers', async () => {
      expect(await render('{{ n|add:5 }}', { n: 10 })).toBe('15')
    })

    test('add with strings', async () => {
      expect(await render('{{ s|add:"!" }}', { s: 'hello' })).toBe('hello!')
    })

    test('divisibleby true', async () => {
      expect(await render('{{ n|divisibleby:3 }}', { n: 9 })).toBe('True')
    })

    test('divisibleby false', async () => {
      expect(await render('{{ n|divisibleby:4 }}', { n: 9 })).toBe('False')
    })

    test('filesizeformat', async () => {
      const result = await render('{{ n|filesizeformat }}', { n: 1024 })
      expect(result).toContain('KB')
    })
  })

  describe('List/Array Filters', () => {
    test('length with array', async () => {
      expect(await render('{{ l|length }}', { l: [1, 2, 3] })).toBe('3')
    })

    test('length with string', async () => {
      expect(await render('{{ s|length }}', { s: 'hello' })).toBe('5')
    })

    test('length_is true', async () => {
      expect(await render('{{ l|length_is:3 }}', { l: [1, 2, 3] })).toBe('True')
    })

    test('first', async () => {
      expect(await render('{{ l|first }}', { l: [1, 2, 3] })).toBe('1')
    })

    test('last', async () => {
      expect(await render('{{ l|last }}', { l: [1, 2, 3] })).toBe('3')
    })

    test('join', async () => {
      expect(await render('{{ l|join:", " }}', { l: ['a', 'b', 'c'] })).toBe('a, b, c')
    })

    test('slice start:end', async () => {
      const result = await render('{{ l|slice:":2"|join:"," }}', { l: [1, 2, 3, 4] })
      expect(result).toBe('1,2')
    })

    test('slice with start', async () => {
      const result = await render('{{ l|slice:"1:3"|join:"," }}', { l: [1, 2, 3, 4] })
      expect(result).toBe('2,3')
    })

    test('reverse', async () => {
      const result = await render('{{ l|reverse|join:"," }}', { l: [1, 2, 3] })
      expect(result).toBe('3,2,1')
    })

    test('sort', async () => {
      const result = await render('{{ l|sort|join:"," }}', { l: [3, 1, 2] })
      expect(result).toBe('1,2,3')
    })

    test('unique', async () => {
      const result = await render('{{ l|unique|join:"," }}', { l: [1, 2, 2, 3, 3, 3] })
      expect(result).toBe('1,2,3')
    })

    test('make_list', async () => {
      const result = await render('{{ s|make_list|join:"," }}', { s: 'abc' })
      expect(result).toBe('a,b,c')
    })

    test('dictsort', async () => {
      const result = await render(
        '{% for item in l|dictsort:"name" %}{{ item.name }}{% endfor %}',
        { l: [{ name: 'c' }, { name: 'a' }, { name: 'b' }] }
      )
      expect(result).toBe('abc')
    })

    test('columns (custom)', async () => {
      const result = await render(
        '{% for row in l|columns:2 %}[{% for i in row %}{{ i }}{% endfor %}]{% endfor %}',
        { l: [1, 2, 3, 4] }
      )
      expect(result).toBe('[12][34]')
    })

    test('batch', async () => {
      const result = await render(
        '{% for row in l|batch:2 %}[{% for i in row %}{{ i }}{% endfor %}]{% endfor %}',
        { l: [1, 2, 3, 4, 5] }
      )
      expect(result).toBe('[12][34][5]')
    })

    test('random', async () => {
      const result = await render('{{ l|random }}', { l: [1, 2, 3] })
      expect(['1', '2', '3']).toContain(result)
    })
  })

  describe('Date/Time Filters', () => {
    test('date with format', async () => {
      const d = new Date('2024-01-15')
      const result = await render('{{ d|date:"Y-m-d" }}', { d })
      expect(result).toBe('2024-01-15')
    })

    test('date with day name', async () => {
      const d = new Date('2024-01-15') // Monday
      const result = await render('{{ d|date:"D" }}', { d })
      expect(result).toBe('Mon')
    })

    test('date with month name', async () => {
      const d = new Date('2024-01-15')
      const result = await render('{{ d|date:"F" }}', { d })
      expect(result).toBe('January')
    })

    test('time', async () => {
      const d = new Date('2024-01-15T14:30:00')
      const result = await render('{{ d|time:"H:i" }}', { d })
      expect(result).toBe('14:30')
    })

    test('timesince', async () => {
      const d = new Date(Date.now() - 86400000) // 1 day ago
      const result = await render('{{ d|timesince }}', { d })
      expect(result).toContain('day')
    })

    test('timeuntil', async () => {
      const d = new Date(Date.now() + 86400000) // 1 day from now
      const result = await render('{{ d|timeuntil }}', { d })
      expect(result).toContain('day')
    })
  })

  describe('Default/Conditional Filters', () => {
    test('default with null', async () => {
      expect(await render('{{ v|default:"N/A" }}', { v: null })).toBe('N/A')
    })

    test('default with undefined', async () => {
      expect(await render('{{ v|default:"N/A" }}', {})).toBe('N/A')
    })

    test('default with empty string', async () => {
      expect(await render('{{ v|default:"N/A" }}', { v: '' })).toBe('N/A')
    })

    test('default with value', async () => {
      expect(await render('{{ v|default:"N/A" }}', { v: 'hello' })).toBe('hello')
    })

    test('default_if_none', async () => {
      expect(await render('{{ v|default_if_none:"N/A" }}', { v: null })).toBe('N/A')
      expect(await render('{{ v|default_if_none:"N/A" }}', { v: '' })).toBe('')
    })

    test('yesno true', async () => {
      expect(await render('{{ v|yesno:"yes,no" }}', { v: true })).toBe('yes')
    })

    test('yesno false', async () => {
      expect(await render('{{ v|yesno:"yes,no" }}', { v: false })).toBe('no')
    })

    test('yesno maybe', async () => {
      expect(await render('{{ v|yesno:"yes,no,maybe" }}', { v: null })).toBe('maybe')
    })

    test('pluralize singular', async () => {
      expect(await render('{{ n }} item{{ n|pluralize }}', { n: 1 })).toBe('1 item')
    })

    test('pluralize plural', async () => {
      expect(await render('{{ n }} item{{ n|pluralize }}', { n: 5 })).toBe('5 items')
    })

    test('pluralize custom', async () => {
      expect(await render('{{ n }} cherr{{ n|pluralize:"y,ies" }}', { n: 2 })).toBe('2 cherries')
    })
  })

  describe('URL Filters', () => {
    test('urlencode', async () => {
      expect(await render('{{ s|urlencode }}', { s: 'hello world' })).toBe('hello%20world')
    })

    test('urlize', async () => {
      const result = await render('{{ s|urlize }}', { s: 'Visit https://example.com' })
      expect(result).toContain('<a href="https://example.com">')
    })
  })

  describe('JSON Filters', () => {
    test('json', async () => {
      const result = await render('{{ o|json }}', { o: { a: 1 } })
      expect(result).toBe('{"a":1}')
    })

    test('json with indent', async () => {
      const result = await render('{{ o|json:2 }}', { o: { a: 1 } })
      expect(result).toContain('\n')
    })
  })

  describe('Filter Chaining', () => {
    test('chains multiple filters', async () => {
      const result = await render('{{ s|lower|truncatechars:10|upper }}', { s: 'HELLO WORLD FOO BAR' })
      expect(result).toBe('HELLO W...')
    })

    test('chains with arguments', async () => {
      const result = await render('{{ l|sort|slice:":2"|join:", " }}', { l: [3, 1, 2] })
      expect(result).toBe('1, 2')
    })
  })
})
