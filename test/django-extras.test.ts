/**
 * Tests for additional Django filters and tags
 */
import { describe, test, expect } from 'bun:test'
import { render, Environment } from '../src'

// ==================== Django Filters ====================

describe('Django Extra Filters', () => {
  describe('addslashes', () => {
    test('escapes backslashes', async () => {
      const result = await render('{{ value|addslashes }}', { value: 'C:\\path\\to\\file' })
      expect(result).toBe('C:\\\\path\\\\to\\\\file')
    })

    test('escapes single quotes', async () => {
      const result = await render('{{ value|addslashes }}', { value: "it's a test" })
      expect(result).toBe("it\\'s a test")
    })

    test('escapes double quotes', async () => {
      const result = await render('{{ value|addslashes }}', { value: 'say "hello"' })
      expect(result).toBe('say \\"hello\\"')
    })

    test('handles mixed escapes', async () => {
      const result = await render('{{ value|addslashes }}', {
        value: 'it\'s "quoted" with \\backslash',
      })
      expect(result).toBe('it\\\'s \\"quoted\\" with \\\\backslash')
    })
  })

  describe('get_digit', () => {
    test('gets last digit (position 1)', async () => {
      const result = await render('{{ value|get_digit:1 }}', { value: 12345 })
      expect(result).toBe('5')
    })

    test('gets second to last digit (position 2)', async () => {
      const result = await render('{{ value|get_digit:2 }}', { value: 12345 })
      expect(result).toBe('4')
    })

    test('gets first digit (position 5)', async () => {
      const result = await render('{{ value|get_digit:5 }}', { value: 12345 })
      expect(result).toBe('1')
    })

    test('returns original for position out of range', async () => {
      const result = await render('{{ value|get_digit:10 }}', { value: 123 })
      expect(result).toBe('123')
    })

    test('returns original for non-integer value', async () => {
      const result = await render('{{ value|get_digit:1 }}', { value: 'abc' })
      expect(result).toBe('abc')
    })
  })

  describe('iriencode', () => {
    test('encodes spaces', async () => {
      const result = await render('{{ value|iriencode }}', { value: 'hello world' })
      expect(result).toBe('hello%20world')
    })

    test('preserves safe URL characters (IRI spec)', async () => {
      // IRI encoding preserves more characters than URI encoding
      const result = await render('{{ value|iriencode }}', { value: 'foo/bar?baz' })
      expect(result).toBe('foo/bar?baz') // IRI keeps / and ?
    })

    test('encodes angle brackets', async () => {
      const result = await render('{{ value|iriencode }}', { value: '<script>' })
      expect(result).toBe('%3Cscript%3E')
    })
  })

  describe('json_script', () => {
    test('outputs JSON in script tag', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString("{{ data|json_script:'my-data' }}", {
        data: { name: 'test' },
      })
      expect(result).toContain('<script id="my-data" type="application/json">')
      expect(result).toContain('"name":"test"')
      expect(result).toContain('</script>')
    })

    test('escapes HTML entities in JSON', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString("{{ data|json_script:'data' }}", {
        data: { html: '<script>' },
      })
      expect(result).toContain('\\u003Cscript\\u003E')
      expect(result).not.toContain('<script>')
    })
  })

  describe('stringformat', () => {
    test('formats integer with padding', async () => {
      const result = await render("{{ value|stringformat:'03d' }}", { value: 5 })
      expect(result).toBe('005')
    })

    test('formats float with precision', async () => {
      const result = await render("{{ value|stringformat:'.2f' }}", { value: 3.14159 })
      expect(result).toBe('3.14')
    })

    test('formats hexadecimal', async () => {
      const result = await render("{{ value|stringformat:'x' }}", { value: 255 })
      expect(result).toBe('ff')
    })

    test('formats string with padding', async () => {
      const result = await render("{{ value|stringformat:'10s' }}", { value: 'test' })
      expect(result).toBe('      test')
    })
  })

  describe('truncatechars_html', () => {
    test('truncates preserving HTML tags', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('{{ value|truncatechars_html:8 }}', {
        value: '<p>Hello World</p>',
      })
      expect(result).toBe('<p>Hello Wo...</p>')
    })

    test('handles nested tags', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('{{ value|truncatechars_html:9 }}', {
        value: '<div><b>Bold</b> text</div>',
      })
      // 9 chars = "Bold text" exactly, so no truncation
      expect(result).toBe('<div><b>Bold</b> text...</div>')
    })

    test('does not truncate short content', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('{{ value|truncatechars_html:100 }}', {
        value: '<p>Short</p>',
      })
      expect(result).toBe('<p>Short</p>')
    })
  })

  describe('truncatewords_html', () => {
    test('truncates by words preserving HTML', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('{{ value|truncatewords_html:3 }}', {
        value: '<p>One two three four five</p>',
      })
      expect(result).toBe('<p>One two three...</p>')
    })

    test('handles nested tags', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('{{ value|truncatewords_html:2 }}', {
        value: '<div><b>Bold</b> text here</div>',
      })
      expect(result).toBe('<div><b>Bold</b> text...</div>')
    })
  })

  describe('urlizetrunc', () => {
    test('converts URLs and truncates display text', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('{{ value|urlizetrunc:15 }}', {
        value: 'Visit https://www.example.com/very/long/path',
      })
      expect(result).toContain('href="https://www.example.com/very/long/path"')
      // Display text is truncated to 15 chars + ...
      expect(result).toContain('</a>')
    })
  })
})

// ==================== Jinja2 Additional Filters ====================

describe('Jinja2 Additional Filters', () => {
  describe('items', () => {
    test('converts object to array of pairs', async () => {
      const result = await render(
        '{% for key, val in data|items %}{{ key }}={{ val }},{% endfor %}',
        { data: { a: 1, b: 2 } }
      )
      expect(result).toBe('a=1,b=2,')
    })

    test('handles empty object', async () => {
      const result = await render('{% for k, v in data|items %}x{% endfor %}', { data: {} })
      expect(result).toBe('')
    })
  })

  describe('xmlattr', () => {
    test('generates HTML attributes', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('<div{{ attrs|xmlattr }}>', {
        attrs: { class: 'box', id: 'main' },
      })
      expect(result).toContain('class="box"')
      expect(result).toContain('id="main"')
    })

    test('handles boolean attributes', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('<input{{ attrs|xmlattr }}>', {
        attrs: { disabled: true, readonly: false },
      })
      expect(result).toContain('disabled')
      expect(result).not.toContain('readonly')
    })

    test('escapes attribute values', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('<div{{ attrs|xmlattr }}>', {
        attrs: { title: 'say "hello"' },
      })
      expect(result).toContain('title="say &quot;hello&quot;"')
    })
  })
})

// ==================== Django Tags ====================

describe('Django Extra Tags', () => {
  describe('{% csrf_token %}', () => {
    test('outputs hidden input', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('{% csrf_token %}')
      expect(result).toContain('<input type="hidden" name="csrfmiddlewaretoken"')
      expect(result).toContain('value=')
    })
  })

  describe('{% cycle %}', () => {
    test('cycles through values', async () => {
      const result = await render("{% for i in items %}{% cycle 'odd' 'even' %}{% endfor %}", {
        items: [1, 2, 3, 4],
      })
      expect(result).toBe('oddevenoddeven')
    })

    test('cycles with as variable', async () => {
      const result = await render(
        "{% for i in items %}{% cycle 'a' 'b' as letter %}{{ letter }}{% endfor %}",
        { items: [1, 2, 3] }
      )
      // When using 'as', cycle stores and outputs the value
      // Iterations: a|a, b|b, a|a -> "aabbaa"
      expect(result).toBe('aabbaa')
    })
  })

  describe('{% debug %}', () => {
    test('outputs context as JSON', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('{% debug %}', { name: 'test', count: 42 })
      expect(result).toContain('<pre>')
      expect(result).toContain('name')
      expect(result).toContain('test')
      expect(result).toContain('</pre>')
    })
  })

  describe('{% firstof %}', () => {
    test('outputs first truthy value', async () => {
      const result = await render('{% firstof var1 var2 var3 %}', {
        var1: '',
        var2: null,
        var3: 'found',
      })
      expect(result).toBe('found')
    })

    test('outputs fallback when all falsy', async () => {
      const result = await render("{% firstof var1 var2 'fallback' %}", { var1: '', var2: null })
      expect(result).toBe('fallback')
    })

    test('outputs first value when truthy', async () => {
      const result = await render('{% firstof var1 var2 %}', { var1: 'first', var2: 'second' })
      expect(result).toBe('first')
    })
  })

  describe('{% ifchanged %}', () => {
    test('outputs on change', async () => {
      const result = await render(
        '{% for item in items %}{% ifchanged %}{{ item }}{% endifchanged %}{% endfor %}',
        { items: ['a', 'a', 'b', 'b', 'c'] }
      )
      expect(result).toBe('abc')
    })

    test('outputs else on no change', async () => {
      const result = await render(
        '{% for item in items %}{% ifchanged %}NEW{% else %}same{% endifchanged %}{% endfor %}',
        { items: ['a', 'a', 'b'] }
      )
      // Body content is always "NEW", so it only outputs on first iteration
      expect(result).toBe('NEWsamesame')
    })

    test('outputs with value comparison', async () => {
      const result = await render(
        '{% for item in items %}{% ifchanged item %}changed{% else %}same{% endifchanged %}{% endfor %}',
        { items: ['a', 'a', 'b', 'b'] }
      )
      expect(result).toBe('changedsamechangedsame')
    })
  })

  describe('{% lorem %}', () => {
    test('generates lorem words', async () => {
      const result = await render('{% lorem 5 w %}')
      expect(result.split(' ')).toHaveLength(5)
      expect(result).toContain('lorem')
    })

    test('generates lorem paragraphs', async () => {
      const env = new Environment({ autoescape: false })
      const result = await env.renderString('{% lorem 2 p %}')
      expect(result).toContain('<p>')
      expect(result).toContain('</p>')
    })

    test('generates plain text paragraphs', async () => {
      const result = await render('{% lorem 2 b %}')
      expect(result).not.toContain('<p>')
      expect(result).toContain('\n\n')
    })
  })

  describe('{% regroup %}', () => {
    test('regroups list by attribute', async () => {
      const result = await render(
        `
{% regroup items by category as grouped %}
{% for group in grouped %}{{ group.grouper }}: {% for item in group.list %}{{ item.name }}{% endfor %}
{% endfor %}
`.trim(),
        {
          items: [
            { name: 'apple', category: 'fruit' },
            { name: 'banana', category: 'fruit' },
            { name: 'carrot', category: 'vegetable' },
          ],
        }
      )
      expect(result).toContain('fruit: applebanana')
      expect(result).toContain('vegetable: carrot')
    })
  })

  describe('{% templatetag %}', () => {
    test('outputs openblock', async () => {
      const result = await render('{% templatetag openblock %}')
      expect(result).toBe('{%')
    })

    test('outputs closeblock', async () => {
      const result = await render('{% templatetag closeblock %}')
      expect(result).toBe('%}')
    })

    test('outputs openvariable', async () => {
      const result = await render('{% templatetag openvariable %}')
      expect(result).toBe('{{')
    })

    test('outputs closevariable', async () => {
      const result = await render('{% templatetag closevariable %}')
      expect(result).toBe('}}')
    })

    test('outputs opencomment', async () => {
      const result = await render('{% templatetag opencomment %}')
      expect(result).toBe('{#')
    })

    test('outputs closecomment', async () => {
      const result = await render('{% templatetag closecomment %}')
      expect(result).toBe('#}')
    })
  })

  describe('{% widthratio %}', () => {
    test('calculates ratio', async () => {
      const result = await render('{% widthratio value max_value 100 %}', {
        value: 50,
        max_value: 200,
      })
      expect(result).toBe('25')
    })

    test('stores in variable with as', async () => {
      const result = await render('{% widthratio value max_value 100 as ratio %}{{ ratio }}', {
        value: 75,
        max_value: 100,
      })
      expect(result).toBe('75')
    })

    test('handles zero max value', async () => {
      const result = await render('{% widthratio value max_value 100 %}', {
        value: 50,
        max_value: 0,
      })
      expect(result).toBe('0')
    })
  })

  describe('{% ifequal %} / {% ifnotequal %}', () => {
    test('ifequal matches equal values', async () => {
      const result = await render('{% ifequal a b %}equal{% else %}not{% endifequal %}', {
        a: 'test',
        b: 'test',
      })
      expect(result).toBe('equal')
    })

    test('ifequal does not match different values', async () => {
      const result = await render('{% ifequal a b %}equal{% else %}not{% endifequal %}', {
        a: 'test',
        b: 'other',
      })
      expect(result).toBe('not')
    })

    test('ifnotequal matches different values', async () => {
      const result = await render(
        '{% ifnotequal a b %}different{% else %}same{% endifnotequal %}',
        { a: 'x', b: 'y' }
      )
      expect(result).toBe('different')
    })

    test('ifnotequal does not match equal values', async () => {
      const result = await render(
        '{% ifnotequal a b %}different{% else %}same{% endifnotequal %}',
        { a: 5, b: 5 }
      )
      expect(result).toBe('same')
    })
  })
})
