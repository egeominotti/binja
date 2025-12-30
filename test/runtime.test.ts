/**
 * Runtime Tests - Based on Jinja2 test_runtime.py and test_core_tags.py
 */
import { describe, test, expect } from 'bun:test'
import { Environment, render, Template } from '../src'

describe('Runtime', () => {
  describe('Variable Output', () => {
    test('outputs string variable', async () => {
      expect(await render('{{ name }}', { name: 'World' })).toBe('World')
    })

    test('outputs number variable', async () => {
      expect(await render('{{ count }}', { count: 42 })).toBe('42')
    })

    test('outputs boolean as True/False', async () => {
      expect(await render('{{ flag }}', { flag: true })).toBe('True')
      expect(await render('{{ flag }}', { flag: false })).toBe('False')
    })

    test('outputs null as empty string', async () => {
      expect(await render('{{ value }}', { value: null })).toBe('')
    })

    test('outputs undefined as empty string', async () => {
      expect(await render('{{ nonexistent }}', {})).toBe('')
    })

    test('auto-escapes HTML', async () => {
      const result = await render('{{ html }}', { html: '<script>alert(1)</script>' })
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })

    test('respects safe filter', async () => {
      const result = await render('{{ html|safe }}', { html: '<b>bold</b>' })
      expect(result).toBe('<b>bold</b>')
    })
  })

  describe('Attribute Access', () => {
    test('accesses object attribute', async () => {
      expect(await render('{{ user.name }}', { user: { name: 'John' } })).toBe('John')
    })

    test('accesses nested attribute', async () => {
      const ctx = { a: { b: { c: 'deep' } } }
      expect(await render('{{ a.b.c }}', ctx)).toBe('deep')
    })

    test('accesses array index (DTL style)', async () => {
      expect(await render('{{ items.0 }}', { items: ['first', 'second'] })).toBe('first')
      expect(await render('{{ items.1 }}', { items: ['first', 'second'] })).toBe('second')
    })

    test('accesses array with subscript', async () => {
      expect(await render('{{ items[0] }}', { items: ['first', 'second'] })).toBe('first')
    })

    test('accesses object key with subscript', async () => {
      expect(await render('{{ obj["key"] }}', { obj: { key: 'value' } })).toBe('value')
    })

    test('handles missing attribute gracefully', async () => {
      expect(await render('{{ user.missing }}', { user: {} })).toBe('')
    })

    test('handles null object gracefully', async () => {
      expect(await render('{{ user.name }}', { user: null })).toBe('')
    })
  })

  describe('If Statement', () => {
    test('renders if true', async () => {
      expect(await render('{% if show %}yes{% endif %}', { show: true })).toBe('yes')
    })

    test('skips if false', async () => {
      expect(await render('{% if show %}yes{% endif %}', { show: false })).toBe('')
    })

    test('renders else', async () => {
      expect(await render('{% if show %}yes{% else %}no{% endif %}', { show: false })).toBe('no')
    })

    test('renders elif', async () => {
      const tmpl = '{% if x == 1 %}one{% elif x == 2 %}two{% else %}other{% endif %}'
      expect(await render(tmpl, { x: 1 })).toBe('one')
      expect(await render(tmpl, { x: 2 })).toBe('two')
      expect(await render(tmpl, { x: 3 })).toBe('other')
    })

    test('handles truthy values', async () => {
      expect(await render('{% if v %}yes{% endif %}', { v: 1 })).toBe('yes')
      expect(await render('{% if v %}yes{% endif %}', { v: 'str' })).toBe('yes')
      expect(await render('{% if v %}yes{% endif %}', { v: [1] })).toBe('yes')
      expect(await render('{% if v %}yes{% endif %}', { v: { a: 1 } })).toBe('yes')
    })

    test('handles falsy values', async () => {
      expect(await render('{% if v %}yes{% endif %}', { v: 0 })).toBe('')
      expect(await render('{% if v %}yes{% endif %}', { v: '' })).toBe('')
      expect(await render('{% if v %}yes{% endif %}', { v: [] })).toBe('')
      expect(await render('{% if v %}yes{% endif %}', { v: {} })).toBe('')
      expect(await render('{% if v %}yes{% endif %}', { v: null })).toBe('')
    })

    test('supports comparison operators', async () => {
      expect(await render('{% if a == b %}yes{% endif %}', { a: 1, b: 1 })).toBe('yes')
      expect(await render('{% if a != b %}yes{% endif %}', { a: 1, b: 2 })).toBe('yes')
      expect(await render('{% if a < b %}yes{% endif %}', { a: 1, b: 2 })).toBe('yes')
      expect(await render('{% if a > b %}yes{% endif %}', { a: 2, b: 1 })).toBe('yes')
      expect(await render('{% if a <= b %}yes{% endif %}', { a: 1, b: 1 })).toBe('yes')
      expect(await render('{% if a >= b %}yes{% endif %}', { a: 2, b: 2 })).toBe('yes')
    })

    test('supports logical operators', async () => {
      expect(await render('{% if a and b %}yes{% endif %}', { a: true, b: true })).toBe('yes')
      expect(await render('{% if a and b %}yes{% endif %}', { a: true, b: false })).toBe('')
      expect(await render('{% if a or b %}yes{% endif %}', { a: false, b: true })).toBe('yes')
      expect(await render('{% if not a %}yes{% endif %}', { a: false })).toBe('yes')
    })

    test('supports in operator', async () => {
      expect(await render('{% if "a" in items %}yes{% endif %}', { items: ['a', 'b'] })).toBe('yes')
      expect(await render('{% if "c" in items %}yes{% endif %}', { items: ['a', 'b'] })).toBe('')
    })

    test('supports complex expressions', async () => {
      const tmpl = '{% if (a > 0 and b > 0) or c %}yes{% endif %}'
      expect(await render(tmpl, { a: 1, b: 1, c: false })).toBe('yes')
      expect(await render(tmpl, { a: 0, b: 0, c: true })).toBe('yes')
      expect(await render(tmpl, { a: 0, b: 0, c: false })).toBe('')
    })
  })

  describe('For Loop', () => {
    test('iterates over array', async () => {
      expect(await render('{% for i in items %}{{ i }}{% endfor %}', { items: [1, 2, 3] })).toBe('123')
    })

    test('provides forloop.counter (1-indexed)', async () => {
      const result = await render('{% for i in items %}{{ forloop.counter }}{% endfor %}', { items: ['a', 'b', 'c'] })
      expect(result).toBe('123')
    })

    test('provides forloop.counter0 (0-indexed)', async () => {
      const result = await render('{% for i in items %}{{ forloop.counter0 }}{% endfor %}', { items: ['a', 'b', 'c'] })
      expect(result).toBe('012')
    })

    test('provides loop.index (Jinja2 alias)', async () => {
      const result = await render('{% for i in items %}{{ loop.index }}{% endfor %}', { items: ['a', 'b', 'c'] })
      expect(result).toBe('123')
    })

    test('provides forloop.first', async () => {
      const result = await render('{% for i in items %}{% if forloop.first %}F{% endif %}{{ i }}{% endfor %}', { items: [1, 2, 3] })
      expect(result).toBe('F123')
    })

    test('provides forloop.last', async () => {
      const result = await render('{% for i in items %}{{ i }}{% if forloop.last %}L{% endif %}{% endfor %}', { items: [1, 2, 3] })
      expect(result).toBe('123L')
    })

    test('provides forloop.length', async () => {
      const result = await render('{% for i in items %}{{ forloop.length }}{% endfor %}', { items: ['a', 'b', 'c'] })
      expect(result).toBe('333')
    })

    test('provides forloop.revcounter', async () => {
      const result = await render('{% for i in items %}{{ forloop.revcounter }}{% endfor %}', { items: ['a', 'b', 'c'] })
      expect(result).toBe('321')
    })

    test('supports tuple unpacking', async () => {
      const ctx = { pairs: [['a', 1], ['b', 2]] }
      const result = await render('{% for k, v in pairs %}{{ k }}={{ v }},{% endfor %}', ctx)
      expect(result).toBe('a=1,b=2,')
    })

    test('renders empty block when empty', async () => {
      expect(await render('{% for i in items %}{{ i }}{% empty %}none{% endfor %}', { items: [] })).toBe('none')
    })

    test('renders else block when empty (Jinja style)', async () => {
      expect(await render('{% for i in items %}{{ i }}{% else %}none{% endfor %}', { items: [] })).toBe('none')
    })

    test('handles nested loops', async () => {
      const ctx = { outer: [[1, 2], [3, 4]] }
      const result = await render('{% for row in outer %}{% for col in row %}{{ col }}{% endfor %}{% endfor %}', ctx)
      expect(result).toBe('1234')
    })

    test('supports forloop.parentloop', async () => {
      const ctx = { outer: [[1, 2], [3, 4]] }
      const tmpl = '{% for row in outer %}{% for col in row %}{{ forloop.parentloop.counter }}{% endfor %}{% endfor %}'
      const result = await render(tmpl, ctx)
      expect(result).toBe('1122')
    })
  })

  describe('With Tag', () => {
    test('creates local variable', async () => {
      expect(await render('{% with x=1 %}{{ x }}{% endwith %}', {})).toBe('1')
    })

    test('creates multiple variables', async () => {
      expect(await render('{% with x=1 y=2 %}{{ x }}+{{ y }}{% endwith %}', {})).toBe('1+2')
    })

    test('shadows outer variable', async () => {
      const result = await render('{{ x }}{% with x=2 %}{{ x }}{% endwith %}{{ x }}', { x: 1 })
      expect(result).toBe('121')
    })

    test('evaluates expressions', async () => {
      expect(await render('{% with total=a+b %}{{ total }}{% endwith %}', { a: 1, b: 2 })).toBe('3')
    })
  })

  describe('Set Tag', () => {
    test('sets variable', async () => {
      expect(await render('{% set x = 1 %}{{ x }}', {})).toBe('1')
    })

    test('sets expression result', async () => {
      expect(await render('{% set x = a + b %}{{ x }}', { a: 1, b: 2 })).toBe('3')
    })
  })

  describe('Expressions', () => {
    test('arithmetic operations', async () => {
      expect(await render('{{ 1 + 2 }}', {})).toBe('3')
      expect(await render('{{ 5 - 3 }}', {})).toBe('2')
      expect(await render('{{ 3 * 4 }}', {})).toBe('12')
      expect(await render('{{ 10 / 2 }}', {})).toBe('5')
      expect(await render('{{ 10 % 3 }}', {})).toBe('1')
    })

    test('string concatenation with tilde', async () => {
      expect(await render('{{ "hello" ~ " " ~ "world" }}', {})).toBe('hello world')
    })

    test('array literal', async () => {
      expect(await render('{{ [1, 2, 3]|join:"," }}', {})).toBe('1,2,3')
    })

    test('conditional expression', async () => {
      expect(await render('{{ "yes" if flag else "no" }}', { flag: true })).toBe('yes')
      expect(await render('{{ "yes" if flag else "no" }}', { flag: false })).toBe('no')
    })
  })

  describe('URL Tag', () => {
    test('resolves simple URL', async () => {
      const env = new Environment()
      env.addUrl('home', '/')
      expect(await env.renderString('{% url "home" %}', {})).toBe('/')
    })

    test('resolves URL with parameters', async () => {
      const env = new Environment()
      env.addUrl('user', '/users/:id/')
      expect(await env.renderString('{% url "user" id=123 %}', {})).toBe('/users/123/')
    })

    test('stores URL in variable with as', async () => {
      const env = new Environment()
      env.addUrl('home', '/')
      expect(await env.renderString('{% url "home" as link %}{{ link }}', {})).toBe('/')
    })
  })

  describe('Static Tag', () => {
    test('resolves static path', async () => {
      expect(await render('{% static "css/style.css" %}', {})).toBe('/static/css/style.css')
    })

    test('stores static URL in variable', async () => {
      expect(await render('{% static "img/logo.png" as logo %}{{ logo }}', {})).toBe('/static/img/logo.png')
    })

    test('uses custom static resolver', async () => {
      const env = new Environment({
        staticResolver: (path) => `https://cdn.example.com/${path}`,
      })
      expect(await env.renderString('{% static "js/app.js" %}', {})).toBe('https://cdn.example.com/js/app.js')
    })
  })

  describe('Load Tag', () => {
    test('is no-op (does not error)', async () => {
      expect(await render('{% load static humanize %}Hello', {})).toBe('Hello')
    })
  })

  describe('Now Tag', () => {
    test('renders current year', async () => {
      const result = await render('{% now "Y" %}', {})
      const currentYear = new Date().getFullYear().toString()
      expect(result).toBe(currentYear)
    })

    test('renders current month', async () => {
      const result = await render('{% now "m" %}', {})
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0')
      expect(result).toBe(currentMonth)
    })

    test('renders current day', async () => {
      const result = await render('{% now "d" %}', {})
      const currentDay = String(new Date().getDate()).padStart(2, '0')
      expect(result).toBe(currentDay)
    })

    test('renders full date format', async () => {
      const result = await render('{% now "Y-m-d" %}', {})
      const d = new Date()
      const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      expect(result).toBe(expected)
    })

    test('renders day name short', async () => {
      const result = await render('{% now "D" %}', {})
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      expect(dayNames).toContain(result)
    })

    test('renders day name long', async () => {
      const result = await render('{% now "l" %}', {})
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      expect(dayNames).toContain(result)
    })

    test('renders month name short', async () => {
      const result = await render('{% now "M" %}', {})
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      expect(monthNames).toContain(result)
    })

    test('renders month name long', async () => {
      const result = await render('{% now "F" %}', {})
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      expect(monthNames).toContain(result)
    })

    test('stores result in variable with as', async () => {
      const result = await render('{% now "Y" as year %}Year: {{ year }}', {})
      const currentYear = new Date().getFullYear().toString()
      expect(result).toBe(`Year: ${currentYear}`)
    })

    test('as variable does not output directly', async () => {
      const result = await render('{% now "Y" as year %}', {})
      expect(result).toBe('')
    })

    test('renders time format', async () => {
      const result = await render('{% now "H:i" %}', {})
      // Just check it matches time format HH:MM
      expect(result).toMatch(/^\d{1,2}:\d{2}$/)
    })

    test('renders AM/PM format', async () => {
      const result = await render('{% now "A" %}', {})
      expect(['AM', 'PM']).toContain(result)
    })

    test('renders 12-hour format', async () => {
      const result = await render('{% now "g" %}', {})
      const hour = parseInt(result, 10)
      expect(hour).toBeGreaterThanOrEqual(1)
      expect(hour).toBeLessThanOrEqual(12)
    })

    test('handles combined format string', async () => {
      const result = await render('{% now "D, F j, Y" %}', {})
      // Should contain day name, month name, day number, and year
      expect(result).toMatch(/^\w{3}, \w+ \d{1,2}, \d{4}$/)
    })

    test('works with timezone option', async () => {
      const env = new Environment({ timezone: 'UTC' })
      const result = await env.renderString('{% now "Y" %}', {})
      // Should be a valid year
      expect(result).toMatch(/^\d{4}$/)
    })
  })

  describe('Environment', () => {
    test('allows custom filters', async () => {
      const env = new Environment({
        filters: {
          double: (v) => v * 2,
        },
      })
      expect(await env.renderString('{{ n|double }}', { n: 5 })).toBe('10')
    })

    test('allows global variables', async () => {
      const env = new Environment({
        globals: {
          site_name: 'My Site',
        },
      })
      expect(await env.renderString('{{ site_name }}', {})).toBe('My Site')
    })

    test('can disable autoescape', async () => {
      const env = new Environment({ autoescape: false })
      expect(await env.renderString('{{ html }}', { html: '<b>bold</b>' })).toBe('<b>bold</b>')
    })
  })

  describe('Template Class', () => {
    test('creates reusable template', async () => {
      const tmpl = Template('Hello {{ name }}!')
      expect(await tmpl.render({ name: 'World' })).toBe('Hello World!')
      expect(await tmpl.render({ name: 'Bun' })).toBe('Hello Bun!')
    })
  })
})
