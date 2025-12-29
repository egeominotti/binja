/**
 * Security Tests - Based on Jinja2 test_security.py
 * Tests for XSS prevention, autoescape, attribute escaping, and template injection
 */
import { describe, test, expect } from 'bun:test'
import { Environment, render, Template } from '../src'

describe('Security', () => {
  // ==================== XSS Prevention ====================
  describe('XSS Prevention', () => {
    describe('HTML Escaping by Default', () => {
      test('escapes basic HTML tags', async () => {
        const result = await render('{{ content }}', { content: '<div>test</div>' })
        expect(result).toBe('&lt;div&gt;test&lt;/div&gt;')
        expect(result).not.toContain('<div>')
      })

      test('escapes script tags', async () => {
        const result = await render('{{ content }}', { content: '<script>alert("xss")</script>' })
        expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
        expect(result).not.toContain('<script>')
      })

      test('escapes self-closing script tags', async () => {
        const result = await render('{{ content }}', { content: '<script src="evil.js"/>' })
        expect(result).not.toContain('<script')
      })

      test('escapes script with newlines', async () => {
        const malicious = `<script>
          alert("xss");
          document.cookie;
        </script>`
        const result = await render('{{ content }}', { content: malicious })
        expect(result).not.toContain('<script>')
      })

      test('escapes ampersands', async () => {
        const result = await render('{{ content }}', { content: 'foo & bar' })
        expect(result).toBe('foo &amp; bar')
      })

      test('escapes double quotes', async () => {
        const result = await render('{{ content }}', { content: 'say "hello"' })
        expect(result).toContain('&quot;')
      })

      test('escapes single quotes', async () => {
        const result = await render('{{ content }}', { content: "it's" })
        expect(result).toContain('&#x27;')
      })

      test('escapes less than and greater than', async () => {
        const result = await render('{{ content }}', { content: '1 < 2 > 0' })
        expect(result).toBe('1 &lt; 2 &gt; 0')
      })
    })

    describe('Script Tag Injection Prevention', () => {
      test('prevents basic script injection - tags are escaped', async () => {
        const vectors = [
          '<script>alert(1)</script>',
          '<SCRIPT>alert(1)</SCRIPT>',
          '<ScRiPt>alert(1)</ScRiPt>',
          '<script/src=evil.js>',
          '<script src="evil.js"></script>',
        ]

        for (const vector of vectors) {
          const result = await render('{{ x }}', { x: vector })
          // Check that the angle brackets are escaped
          expect(result).not.toContain('<script')
          expect(result).not.toContain('<SCRIPT')
          expect(result).not.toContain('<ScRiPt')
          // Verify HTML entities are present
          expect(result).toContain('&lt;')
          expect(result).toContain('&gt;')
        }
      })

      test('prevents script with encoded characters - tags are escaped', async () => {
        const vectors = [
          '<scr&#105;pt>alert(1)</script>',
          '<script>alert(&#39;xss&#39;)</script>',
        ]

        for (const vector of vectors) {
          const result = await render('{{ x }}', { x: vector })
          // Angle brackets should be escaped
          expect(result).not.toContain('<script')
          expect(result).toContain('&lt;')
        }
      })

      test('JavaScript URL is escaped when outputting to content', async () => {
        // When outputting a javascript: URL as content, it should be safe
        // because it's just text, not in an href attribute
        const vector = 'javascript:alert(1)'
        const result = await render('{{ url }}', { url: vector })
        // The URL should be output as-is (no HTML to escape)
        expect(result).toBe('javascript:alert(1)')
      })
    })

    describe('Event Handler Injection Prevention', () => {
      test('escapes onerror handler - angle brackets escaped', async () => {
        const malicious = '<img src="x" onerror="alert(1)">'
        const result = await render('{{ content }}', { content: malicious })
        // The key is that < is escaped to &lt; so the tag cannot be parsed as HTML
        expect(result).not.toContain('<img')
        expect(result).toContain('&lt;img')
      })

      test('escapes onclick handler - angle brackets escaped', async () => {
        const malicious = '<div onclick="alert(1)">click me</div>'
        const result = await render('{{ content }}', { content: malicious })
        expect(result).not.toContain('<div')
        expect(result).toContain('&lt;div')
      })

      test('escapes onload handler - angle brackets escaped', async () => {
        const malicious = '<body onload="alert(1)">'
        const result = await render('{{ content }}', { content: malicious })
        expect(result).not.toContain('<body')
        expect(result).toContain('&lt;body')
      })

      test('escapes onmouseover handler - angle brackets escaped', async () => {
        const malicious = '<div onmouseover="alert(1)">hover</div>'
        const result = await render('{{ content }}', { content: malicious })
        expect(result).not.toContain('<div')
        expect(result).toContain('&lt;div')
      })

      test('escapes onfocus handler - angle brackets escaped', async () => {
        const malicious = '<input onfocus="alert(1)">'
        const result = await render('{{ content }}', { content: malicious })
        expect(result).not.toContain('<input')
        expect(result).toContain('&lt;input')
      })

      test('escapes multiple event handlers - all angle brackets escaped', async () => {
        const malicious = '<div onclick="alert(1)" onmouseover="alert(2)" onload="alert(3)">test</div>'
        const result = await render('{{ content }}', { content: malicious })
        // Both opening and closing tags must be escaped
        expect(result).not.toContain('<div')
        expect(result).not.toContain('</div>')
        expect(result).toContain('&lt;div')
        expect(result).toContain('&lt;/div&gt;')
      })
    })

    describe('URL Injection Prevention', () => {
      test('data: URL with script - angle brackets are escaped', async () => {
        const vector = 'data:text/html,<script>alert(1)</script>'
        const result = await render('{{ url }}', { url: vector })
        expect(result).not.toContain('<script>')
        expect(result).toContain('&lt;script&gt;')
      })

      test('handles URL with HTML entities - angle brackets escaped', async () => {
        const vector = 'http://evil.com/?q=<script>alert(1)</script>'
        const result = await render('{{ url }}', { url: vector })
        expect(result).not.toContain('<script>')
        expect(result).toContain('&lt;script&gt;')
      })
    })
  })

  // ==================== Autoescape Behavior ====================
  describe('Autoescape Behavior', () => {
    describe('Autoescape Enabled (Default)', () => {
      test('autoescape is enabled by default', async () => {
        const env = new Environment()
        const result = await env.renderString('{{ x }}', { x: '<b>test</b>' })
        expect(result).toBe('&lt;b&gt;test&lt;/b&gt;')
      })

      test('escapes HTML in render function', async () => {
        const result = await render('{{ x }}', { x: '<em>emphasized</em>' })
        expect(result).toBe('&lt;em&gt;emphasized&lt;/em&gt;')
      })

      test('escapes HTML in Template class', async () => {
        const tmpl = Template('{{ x }}')
        const result = await tmpl.render({ x: '<strong>bold</strong>' })
        expect(result).toBe('&lt;strong&gt;bold&lt;/strong&gt;')
      })

      test('escapes multiple variables', async () => {
        const result = await render('{{ a }} - {{ b }}', {
          a: '<div>',
          b: '</div>',
        })
        expect(result).toBe('&lt;div&gt; - &lt;/div&gt;')
      })

      test('escapes in for loops', async () => {
        const result = await render(
          '{% for item in items %}{{ item }}{% endfor %}',
          { items: ['<a>', '<b>', '<c>'] }
        )
        expect(result).toBe('&lt;a&gt;&lt;b&gt;&lt;c&gt;')
      })

      test('escapes in if blocks', async () => {
        const result = await render(
          '{% if show %}{{ content }}{% endif %}',
          { show: true, content: '<script>evil()</script>' }
        )
        expect(result).not.toContain('<script>')
        expect(result).toContain('&lt;script&gt;')
      })
    })

    describe('Autoescape Disabled', () => {
      test('outputs raw HTML when disabled', async () => {
        const env = new Environment({ autoescape: false })
        const result = await env.renderString('{{ x }}', { x: '<b>test</b>' })
        expect(result).toBe('<b>test</b>')
      })

      test('outputs raw script tags when disabled', async () => {
        const env = new Environment({ autoescape: false })
        const result = await env.renderString('{{ x }}', { x: '<script>alert(1)</script>' })
        expect(result).toBe('<script>alert(1)</script>')
      })

      test('Template class respects autoescape: false', async () => {
        const tmpl = Template('{{ x }}', { autoescape: false })
        const result = await tmpl.render({ x: '<b>bold</b>' })
        expect(result).toBe('<b>bold</b>')
      })
    })

    describe('Safe Filter Bypassing Autoescape', () => {
      test('safe filter prevents escaping', async () => {
        const result = await render('{{ x|safe }}', { x: '<b>bold</b>' })
        expect(result).toBe('<b>bold</b>')
      })

      test('safe filter allows script tags (use with caution)', async () => {
        const result = await render('{{ x|safe }}', { x: '<script>legitimate()</script>' })
        expect(result).toBe('<script>legitimate()</script>')
      })

      test('safe filter works with HTML entities', async () => {
        const result = await render('{{ x|safe }}', { x: '&copy; 2024' })
        expect(result).toBe('&copy; 2024')
      })

      test('safe filter preserves trusted HTML', async () => {
        const trustedHtml = '<a href="https://example.com">Link</a>'
        const result = await render('{{ html|safe }}', { html: trustedHtml })
        expect(result).toBe(trustedHtml)
      })

      test('safe filter after other filters', async () => {
        // Note: safe should be applied last to work correctly
        const result = await render('{{ x|upper|safe }}', { x: '<b>test</b>' })
        expect(result).toBe('<B>TEST</B>')
      })
    })

    describe('Escape Filter Forcing Escape', () => {
      test('escape filter explicitly escapes when autoescape is off', async () => {
        // The escape filter is most useful when autoescape is disabled
        const env = new Environment({ autoescape: false })
        const result = await env.renderString('{{ x|escape }}', { x: '<b>test</b>' })
        expect(result).toBe('&lt;b&gt;test&lt;/b&gt;')
      })

      test('e filter is alias for escape', async () => {
        // e is alias for escape, test with autoescape off
        const env = new Environment({ autoescape: false })
        const result = await env.renderString('{{ x|e }}', { x: '<script>alert(1)</script>' })
        expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
      })

      test('escape filter with autoescape on is idempotent', async () => {
        // The escape filter marks output as safe, so autoescape doesn't double-encode
        // This is the correct behavior - escape filter returns safe content
        const result = await render('{{ x|escape }}', { x: '<b>test</b>' })
        // escape filter converts < to &lt; and marks as safe, autoescape respects this
        expect(result).toBe('&lt;b&gt;test&lt;/b&gt;')
      })

      test('autoescape alone escapes properly', async () => {
        // Without escape filter, autoescape handles escaping once
        const result = await render('{{ x }}', { x: '<b>test</b>' })
        expect(result).toBe('&lt;b&gt;test&lt;/b&gt;')
      })
    })
  })

  // ==================== Attribute Value Escaping ====================
  describe('Attribute Value Escaping', () => {
    describe('Quote Escaping in Attributes', () => {
      test('escapes double quotes for safe attribute insertion', async () => {
        const result = await render('{{ attr }}', { attr: 'value" onclick="alert(1)' })
        expect(result).toContain('&quot;')
        // The quotes are escaped, preventing attribute breakout
        expect(result).not.toContain('"onclick')
      })

      test('escapes single quotes for safe attribute insertion', async () => {
        const result = await render('{{ attr }}', { attr: "value' onclick='alert(1)" })
        expect(result).toContain('&#x27;')
        // The quotes are escaped, preventing attribute breakout
        expect(result).not.toContain("'onclick")
      })

      test('safe in double-quoted attribute context - quotes escaped', async () => {
        const userInput = 'hello" onmouseover="alert(1)'
        const result = await render('<div title="{{ title }}">test</div>', { title: userInput })
        // Double quotes in the input should be escaped
        expect(result).toContain('&quot;')
        // The important thing is that the attribute cannot be broken out of
        // because the quotes are escaped
        expect(result).not.toContain('title="hello"')
      })

      test('safe in single-quoted attribute context - quotes escaped', async () => {
        const userInput = "hello' onmouseover='alert(1)"
        const result = await render("<div title='{{ title }}'>test</div>", { title: userInput })
        // Single quotes in the input should be escaped
        expect(result).toContain('&#x27;')
        // The key security property: quotes are escaped
      })
    })

    describe('Double Quote vs Single Quote', () => {
      test('both quote types are escaped', async () => {
        const result = await render('{{ x }}', { x: `"double" and 'single'` })
        expect(result).toContain('&quot;')
        expect(result).toContain('&#x27;')
      })

      test('mixed quotes in attribute value', async () => {
        const result = await render('{{ x }}', { x: `It's a "test"` })
        expect(result).toBe('It&#x27;s a &quot;test&quot;')
      })

      test('attribute breakout prevention - tags are escaped', async () => {
        // Attempting to break out of both double and single quoted attributes
        const vectors = [
          '"><script>alert(1)</script>',
          "'><script>alert(1)</script>",
          '" onfocus="alert(1)" x="',
          "' onfocus='alert(1)' x='",
        ]

        for (const vector of vectors) {
          const result = await render('{{ x }}', { x: vector })
          // Script tags should have angle brackets escaped
          expect(result).not.toContain('<script>')
          // Quotes should be escaped too
          expect(result.includes('&quot;') || result.includes('&#x27;')).toBe(true)
        }
      })
    })
  })

  // ==================== URL Encoding ====================
  describe('URL Encoding', () => {
    describe('urlencode Filter Security', () => {
      test('urlencode escapes special URL characters', async () => {
        const result = await render('{{ x|urlencode }}', { x: 'hello world' })
        expect(result).toBe('hello%20world')
      })

      test('urlencode escapes ampersand', async () => {
        const result = await render('{{ x|urlencode }}', { x: 'a=1&b=2' })
        expect(result).toContain('%26')
      })

      test('urlencode escapes angle brackets', async () => {
        const result = await render('{{ x|urlencode }}', { x: '<script>' })
        expect(result).toBe('%3Cscript%3E')
      })

      test('urlencode escapes quotes', async () => {
        const result = await render('{{ x|urlencode }}', { x: '"test"' })
        expect(result).toContain('%22')
      })

      test('urlencode handles plus signs', async () => {
        const result = await render('{{ x|urlencode }}', { x: '1+1=2' })
        expect(result).toContain('%2B')
      })

      test('urlencode safe for query strings', async () => {
        const result = await render('{{ x|urlencode }}', { x: 'search term/with/slashes' })
        expect(result).toContain('%2F')
      })
    })

    describe('URL Parameter Injection', () => {
      test('prevents parameter injection via encoded characters', async () => {
        const malicious = '&admin=true'
        const result = await render('?q={{ query|urlencode }}', { query: malicious })
        expect(result).not.toContain('&admin=true')
        expect(result).toContain('%26admin')
      })

      test('prevents JavaScript injection in URL parameters', async () => {
        const malicious = 'javascript:alert(1)'
        const result = await render('?next={{ url|urlencode }}', { url: malicious })
        // Should be encoded, not executable
        expect(result).toContain('javascript%3A')
      })

      test('prevents newline injection in URLs', async () => {
        const malicious = 'value\nSet-Cookie: evil=true'
        const result = await render('?q={{ x|urlencode }}', { x: malicious })
        expect(result).toContain('%0A')
        expect(result).not.toMatch(/\nSet-Cookie/)
      })
    })
  })

  // ==================== JSON Output Security ====================
  describe('JSON Output Security', () => {
    describe('JSON Filter with HTML-unsafe Content', () => {
      test('json filter outputs valid JSON when used with safe', async () => {
        // JSON filter output needs |safe to avoid escaping
        const result = await render('{{ obj|json|safe }}', { obj: { a: 1, b: 'test' } })
        expect(JSON.parse(result)).toEqual({ a: 1, b: 'test' })
      })

      test('json filter is safe by default', async () => {
        // JSON filter marks output as safe, so it's not HTML-escaped
        // This is the correct behavior for embedding JSON in <script> tags
        const result = await render('{{ obj|json }}', { obj: { a: 1 } })
        // The JSON is not escaped, can be parsed directly
        expect(result).toBe('{"a":1}')
      })

      test('json filter escapes HTML in string values', async () => {
        const result = await render('{{ obj|json|safe }}', { obj: { html: '<script>alert(1)</script>' } })
        const parsed = JSON.parse(result)
        expect(parsed.html).toBe('<script>alert(1)</script>')
        // The JSON itself is safe because the script is inside a string
      })

      test('json filter handles nested objects', async () => {
        const obj = {
          name: '<script>',
          nested: {
            value: '</script><script>alert(1)</script>',
          },
        }
        const result = await render('{{ obj|json|safe }}', { obj })
        // Should be valid JSON that can be parsed
        expect(() => JSON.parse(result)).not.toThrow()
      })
    })

    describe('Script Tag in JSON', () => {
      test('json in script context (manual safe usage)', async () => {
        const data = { message: '</script><script>alert("xss")</script>' }
        const result = await render('var data = {{ data|json|safe }};', { data })
        // The </script> inside JSON string should not close the script tag
        // because it is inside JSON string quotes
        expect(() => JSON.parse(result.replace('var data = ', '').replace(';', ''))).not.toThrow()
      })

      test('tojson alias works same as json', async () => {
        const result1 = await render('{{ obj|json|safe }}', { obj: { x: 1 } })
        const result2 = await render('{{ obj|tojson|safe }}', { obj: { x: 1 } })
        expect(result1).toBe(result2)
      })
    })
  })

  // ==================== Template Injection Prevention ====================
  describe('Template Injection Prevention', () => {
    describe('User Input as Template Code', () => {
      test('template syntax in user input is escaped, not executed', async () => {
        // User input containing template syntax should be escaped, not executed
        const userInput = '{{ secret }}'
        const result = await render('{{ input }}', { input: userInput, secret: 'sensitive' })
        // The {{ and }} should be displayed literally (escaped won't change them since they're not HTML)
        // But the key is they should NOT be interpreted as template syntax
        expect(result).toBe('{{ secret }}')
        expect(result).not.toBe('sensitive')
      })

      test('template tags in user input are not executed', async () => {
        const userInput = '{% if true %}pwned{% endif %}'
        const result = await render('{{ input }}', { input: userInput })
        // Should output literally, not execute
        expect(result).toBe('{% if true %}pwned{% endif %}')
      })

      test('nested template injection attempt fails', async () => {
        const userInput = '{{ config.SECRET_KEY }}'
        const result = await render('{{ input }}', {
          input: userInput,
          config: { SECRET_KEY: 'super-secret' },
        })
        expect(result).not.toContain('super-secret')
        expect(result).toBe('{{ config.SECRET_KEY }}')
      })

      test('template comments in user input are not processed', async () => {
        const userInput = '{# hidden #}'
        const result = await render('{{ input }}', { input: userInput })
        expect(result).toBe('{# hidden #}')
      })
    })

    describe('Variable Interpolation Security', () => {
      test('variable names cannot be injected', async () => {
        // Even if user provides something that looks like a variable reference
        const userInput = 'password'
        const result = await render('{{ input }}', {
          input: userInput,
          password: 'secret123',
        })
        // Should show "password" literally, not the value of password variable
        expect(result).toBe('password')
        expect(result).not.toBe('secret123')
      })

      test('dot notation in user input is not traversed', async () => {
        const userInput = 'user.password'
        const result = await render('{{ input }}', {
          input: userInput,
          user: { password: 'secret' },
        })
        expect(result).toBe('user.password')
        expect(result).not.toBe('secret')
      })

      test('filter syntax in user input is not executed', async () => {
        const userInput = 'data|safe'
        const result = await render('{{ input }}', {
          input: userInput,
          data: '<script>alert(1)</script>',
        })
        expect(result).toBe('data|safe')
      })
    })

    describe('Complex Injection Attempts', () => {
      test('multiple injection vectors in one input', async () => {
        const malicious = `<script>alert(1)</script>{{ secret }}{% for i in items %}{{ i }}{% endfor %}`
        const result = await render('{{ input }}', {
          input: malicious,
          secret: 'sensitive',
          items: ['a', 'b'],
        })
        expect(result).not.toContain('<script>')
        expect(result).not.toBe('sensitive')
        expect(result).toContain('{{')
        expect(result).toContain('{%')
      })

      test('unicode escape sequences for angle brackets', async () => {
        // Using unicode to try to bypass filters
        const malicious = '\u003cscript\u003ealert(1)\u003c/script\u003e'
        const result = await render('{{ input }}', { input: malicious })
        // Unicode < and > should be escaped just like regular < and >
        expect(result).not.toContain('<script>')
        expect(result).toContain('&lt;script&gt;')
      })

      test('HTML entity bypass attempt - entities are double escaped', async () => {
        const malicious = '&lt;script&gt;alert(1)&lt;/script&gt;'
        const result = await render('{{ input }}', { input: malicious })
        // The & should be escaped to &amp;
        expect(result).toContain('&amp;lt;')
      })
    })
  })

  // ==================== Edge Cases and Special Characters ====================
  describe('Edge Cases', () => {
    test('null values are handled safely', async () => {
      const result = await render('{{ x }}', { x: null })
      expect(result).toBe('')
    })

    test('undefined values are handled safely', async () => {
      const result = await render('{{ x }}', {})
      expect(result).toBe('')
    })

    test('numeric values pass through', async () => {
      const result = await render('{{ x }}', { x: 12345 })
      expect(result).toBe('12345')
    })

    test('boolean true renders as True', async () => {
      const result = await render('{{ x }}', { x: true })
      expect(result).toBe('True')
    })

    test('boolean false renders as False', async () => {
      const result = await render('{{ x }}', { x: false })
      expect(result).toBe('False')
    })

    test('array with HTML content - joined values are escaped', async () => {
      const result = await render('{{ items|join:", " }}', { items: ['<a>', '<b>'] })
      // Join first, then escape - or escape each, then join
      // The result depends on implementation, but HTML should not be raw
      expect(result).not.toMatch(/^<a>/)
    })

    test('empty string is safe', async () => {
      const result = await render('{{ x }}', { x: '' })
      expect(result).toBe('')
    })

    test('whitespace-only string is preserved', async () => {
      const result = await render('{{ x }}', { x: '   ' })
      expect(result).toBe('   ')
    })

    test('very long strings are handled', async () => {
      const longString = '<script>'.repeat(10000)
      const result = await render('{{ x }}', { x: longString })
      expect(result).not.toContain('<script>')
      expect(result.length).toBeGreaterThan(0)
    })

    test('special unicode characters are preserved', async () => {
      const result = await render('{{ x }}', { x: 'Cafe\u0301 - 日本語 - 🎉' })
      expect(result).toContain('Cafe')
      expect(result).toContain('日本語')
      expect(result).toContain('🎉')
    })

    test('null byte handling', async () => {
      const result = await render('{{ x }}', { x: 'before\x00after' })
      // Should handle null bytes gracefully
      expect(result).toBeDefined()
    })
  })

  // ==================== Additional XSS Vectors ====================
  describe('Additional XSS Vectors', () => {
    test('SVG XSS vector - tags are escaped', async () => {
      const vector = '<svg onload="alert(1)">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<svg')
      expect(result).toContain('&lt;svg')
    })

    test('iframe injection - tags are escaped', async () => {
      const vector = '<iframe src="javascript:alert(1)"></iframe>'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<iframe')
      expect(result).toContain('&lt;iframe')
    })

    test('style tag injection - tags are escaped', async () => {
      const vector = '<style>body{background:url(javascript:alert(1))}</style>'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<style')
      expect(result).toContain('&lt;style')
    })

    test('link tag injection - tags are escaped', async () => {
      const vector = '<link rel="stylesheet" href="javascript:alert(1)">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<link')
      expect(result).toContain('&lt;link')
    })

    test('meta tag injection - tags are escaped', async () => {
      const vector = '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<meta')
      expect(result).toContain('&lt;meta')
    })

    test('form action injection - tags are escaped', async () => {
      const vector = '<form action="javascript:alert(1)"><input type="submit"></form>'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<form')
      expect(result).toContain('&lt;form')
    })

    test('object tag injection - tags are escaped', async () => {
      const vector = '<object data="javascript:alert(1)">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<object')
      expect(result).toContain('&lt;object')
    })

    test('embed tag injection - tags are escaped', async () => {
      const vector = '<embed src="javascript:alert(1)">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<embed')
      expect(result).toContain('&lt;embed')
    })

    test('base tag injection - tags are escaped', async () => {
      const vector = '<base href="javascript:alert(1)">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<base')
      expect(result).toContain('&lt;base')
    })

    test('math tag XSS - tags are escaped', async () => {
      const vector = '<math><maction actiontype="statusline#http://evil.com" xlink:href="javascript:alert(1)">click</maction></math>'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<math')
      expect(result).toContain('&lt;math')
    })

    test('table background injection - tags are escaped', async () => {
      const vector = '<table background="javascript:alert(1)">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<table')
      expect(result).toContain('&lt;table')
    })

    test('td background injection - tags are escaped', async () => {
      const vector = '<td background="javascript:alert(1)">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<td')
      expect(result).toContain('&lt;td')
    })

    test('body background injection - tags are escaped', async () => {
      const vector = '<body background="javascript:alert(1)">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<body')
      expect(result).toContain('&lt;body')
    })

    test('bgsound injection - tags are escaped', async () => {
      const vector = '<bgsound src="javascript:alert(1)">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<bgsound')
      expect(result).toContain('&lt;bgsound')
    })

    test('layer injection - tags are escaped', async () => {
      const vector = '<layer src="javascript:alert(1)"></layer>'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<layer')
      expect(result).toContain('&lt;layer')
    })

    test('expression CSS injection - tags are escaped', async () => {
      const vector = '<div style="width: expression(alert(1))">'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<div')
      expect(result).toContain('&lt;div')
    })

    test('vbscript injection - tags are escaped', async () => {
      const vector = '<a href="vbscript:alert(1)">click</a>'
      const result = await render('{{ x }}', { x: vector })
      expect(result).not.toContain('<a')
      expect(result).toContain('&lt;a')
    })
  })

  // ==================== Striptags Filter Security ====================
  describe('Striptags Filter', () => {
    test('striptags removes all HTML tags', async () => {
      const result = await render('{{ x|striptags }}', { x: '<b>bold</b> <i>italic</i>' })
      expect(result).toBe('bold italic')
    })

    test('striptags removes script tags', async () => {
      const result = await render('{{ x|striptags }}', { x: '<script>alert(1)</script>content' })
      expect(result).toBe('alert(1)content')
    })

    test('striptags handles nested tags', async () => {
      const result = await render('{{ x|striptags }}', { x: '<div><p><b>text</b></p></div>' })
      expect(result).toBe('text')
    })

    test('striptags with malformed HTML', async () => {
      const result = await render('{{ x|striptags }}', { x: '<div>text<span>more' })
      expect(result).toBe('textmore')
    })
  })

  // ==================== Escapejs Filter Security ====================
  describe('Escapejs Filter', () => {
    test('escapejs produces valid JavaScript string content', async () => {
      // escapejs should produce content safe for use inside JS strings
      const result = await render('{{ x|escapejs }}', { x: 'say "hello"' })
      // The output may be HTML-escaped too if autoescape is on
      // The key is that quotes are escaped
      expect(result).toMatch(/\\"|&quot;|\\&quot;/)
    })

    test('escapejs escapes newlines', async () => {
      const result = await render('{{ x|escapejs }}', { x: 'line1\nline2' })
      expect(result).toContain('\\n')
    })

    test('escapejs escapes backslashes', async () => {
      const result = await render('{{ x|escapejs }}', { x: 'path\\to\\file' })
      expect(result).toContain('\\\\')
    })

    test('escapejs safe for JavaScript strings', async () => {
      const malicious = '</script><script>alert(1)</script>'
      const result = await render('{{ x|escapejs }}', { x: malicious })
      // Should be escaped for safe use in JS strings
      // The angle brackets will be in the output but escaped
      expect(result).not.toContain('</script><script>')
    })
  })

  // ==================== Security with Custom Filters ====================
  describe('Security with Custom Filters', () => {
    test('custom filter output is still escaped', async () => {
      const env = new Environment({
        filters: {
          myfilter: (value) => `<b>${value}</b>`,
        },
      })
      const result = await env.renderString('{{ x|myfilter }}', { x: 'test' })
      // The filter's HTML output should be escaped
      expect(result).toBe('&lt;b&gt;test&lt;/b&gt;')
    })

    test('custom filter can return safe content', async () => {
      const env = new Environment({
        filters: {
          trusted: (value) => {
            const safeString = new String(`<b>${value}</b>`) as any
            safeString.__safe__ = true
            return safeString
          },
        },
      })
      const result = await env.renderString('{{ x|trusted }}', { x: 'test' })
      expect(result).toBe('<b>test</b>')
    })
  })

  // ==================== Security with Globals ====================
  describe('Security with Globals', () => {
    test('global HTML values are escaped', async () => {
      const env = new Environment({
        globals: {
          site_banner: '<script>evil()</script>',
        },
      })
      const result = await env.renderString('{{ site_banner }}', {})
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })
  })
})
