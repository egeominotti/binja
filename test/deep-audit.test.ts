import { describe, expect, test } from 'bun:test'
import {
  Environment,
  Lexer,
  Parser,
  Runtime,
  Template,
  TemplateNotFoundError,
  TokenType,
  compile,
  render,
} from '../src'
import { DebugCollector } from '../src/debug'
import * as handlebars from '../src/engines/handlebars'
import * as liquid from '../src/engines/liquid'
import * as twig from '../src/engines/twig'
import { builtinFilters } from '../src/filters'
import type { TemplateNode } from '../src/parser/nodes'

function parse(source: string): TemplateNode {
  return new Parser(new Lexer(source).tokenize(), source).parse()
}

describe('deep audit regressions', () => {
  describe('safe property and mapping access', () => {
    test('blocks prototype escape primitives in runtime and AOT', async () => {
      const source = '{{ constructor }}|{{ value.constructor }}|{{ value["__proto__"] }}'
      const context = { constructor: Function, value: {} }
      expect(await render(source, context)).toBe('||')
      expect(compile(source)(context)).toBe('||')
    })

    test('mapping membership ignores inherited keys', async () => {
      const mapping = Object.create({ inherited: true })
      mapping.own = true
      const source =
        '{% if "inherited" in mapping %}bad{% endif %}{% if "own" in mapping %}good{% endif %}'
      expect(await render(source, { mapping })).toBe('good')
      expect(compile(source)({ mapping })).toBe('good')
    })

    test('groupby handles prototype-like values without object-key hazards', () => {
      const item = Object.assign(Object.create(null), { category: '__proto__' })
      expect(builtinFilters.groupby([item], 'category')).toEqual([
        { grouper: '__proto__', list: [item] },
      ])
    })
  })

  describe('HTML and JavaScript embedding', () => {
    test('json and json_script neutralize script closing sequences', async () => {
      const value = { text: '</script><img src=x onerror=alert(1)>' }
      const json = await render('{{ value|json }}', { value })
      const script = await render('{{ value|json_script:"payload" }}', { value })
      expect(json).not.toContain('</script>')
      expect(json).toContain('\\u003C/script\\u003E')
      expect(script).not.toContain('</script><img')
      expect(script).toContain('type="application/json"')
    })

    test('json_script escapes its id attribute', async () => {
      const output = await render('{{ value|json_script:elementId }}', {
        value: { ok: true },
        elementId: 'x" onload="alert(1)',
      })
      expect(output).toContain('id="x&quot; onload=&quot;alert(1)"')
      expect(output).not.toContain('id="x" onload=')
    })

    test('debug, pprint, addslashes and HTML truncation do not mark input trusted', async () => {
      const dangerous = '<script>alert(1)</script>'
      expect(await render('{% debug %}', { dangerous })).not.toContain('<script>')
      expect(await render('{{ dangerous|pprint }}', { dangerous })).not.toContain('<script>')
      expect(await render('{{ dangerous|addslashes }}', { dangerous })).not.toContain('<script>')
      expect(await render('{{ dangerous|truncatechars_html:100 }}', { dangerous })).not.toContain(
        '<script>'
      )
      expect(await render('{{ dangerous|truncatewords_html:100 }}', { dangerous })).not.toContain(
        '<script>'
      )
    })

    test('escapejs prevents an HTML script break-out', async () => {
      const output = await render('{{ value|escapejs }}', { value: '</script>' })
      expect(output).not.toContain('</script>')
      expect(output).toContain('\\u003C')
    })

    test('xmlattr rejects unsafe attribute names', async () => {
      await expect(
        render('{{ attrs|xmlattr }}', { attrs: { 'x onload': 'alert(1)' } })
      ).rejects.toThrow('Invalid character in attribute name')
    })

    test('csrf_token uses and escapes an application-provided token', async () => {
      expect(await render('{% csrf_token %}', {})).toBe('')
      const output = await render('{% csrf_token %}', { csrf_token: 'a"<b>' })
      expect(output).toContain('value="a&quot;&lt;b&gt;"')
      expect(output).not.toContain('PLACEHOLDER')
    })

    test('url and static tags autoescape resolver output', async () => {
      const payload = 'asset" onerror="alert(1)'
      expect(await render('<img src="{% static path %}">', { path: payload })).toBe(
        '<img src="/static/asset&quot; onerror=&quot;alert(1)">'
      )

      const env = new Environment({ urlResolver: () => `/users/${payload}` })
      expect(await env.renderString('<a href="{% url "profile" %}">x</a>')).toBe(
        '<a href="/users/asset&quot; onerror=&quot;alert(1)">x</a>'
      )
    })
  })

  describe('parser and lexer correctness', () => {
    test('supports delimiter families that do not start with a brace', () => {
      const lexer = new Lexer('Hello [[ name ]]!', {
        variableStart: '[[',
        variableEnd: ']]',
      })
      const tokens = lexer.tokenize()
      expect(tokens.map((token) => token.type)).toContain(TokenType.VARIABLE_START)
    })

    test('rejects unknown tags, empty cycles and unclosed comments', async () => {
      await expect(render('{% iff value %}x{% endif %}', { value: true })).rejects.toThrow(
        "Unknown template tag 'iff'"
      )
      await expect(render('{% cycle %}', {})).rejects.toThrow('requires at least one value')
      expect(() => new Lexer('{# unfinished').tokenize()).toThrow('Unclosed template comment')
    })

    test('autoescape and spaceless blocks execute their bodies', async () => {
      const source =
        '{% autoescape false %}<p>{{ html }}</p>{% endautoescape %}' +
        '{% spaceless %}<div>  </div>\n <span>x</span>{% endspaceless %}'
      const expected = '<p><b>x</b></p><div></div><span>x</span>'
      expect(await render(source, { html: '<b>x</b>' })).toBe(expected)
      expect(compile(source)({ html: '<b>x</b>' })).toBe(expected)
    })
  })

  describe('custom filter contracts', () => {
    test('rejects Promise-returning filters instead of rendering a Promise object', async () => {
      await expect(
        render(
          '{{ value|lookup }}',
          { value: 'x' },
          {
            filters: { lookup: async (value) => value.toUpperCase() },
          }
        )
      ).rejects.toThrow("Async filter 'lookup' is not supported")
    })

    test('prototype names are not treated as registered filters or tests', async () => {
      const filterSource = '{{ "value"|constructor }}'
      await expect(render(filterSource)).rejects.toThrow("Unknown filter 'constructor'")
      expect(() => compile(filterSource)({})).toThrow('Unknown filter: constructor')

      const testSource = '{% if value is constructor %}wrong{% endif %}'
      await expect(render(testSource, { value: 1 })).rejects.toThrow('Unknown test')
      expect(() => compile(testSource)({ value: 1 })).toThrow('Unknown test: constructor')
    })
  })

  describe('runtime and AOT parity', () => {
    const parityCases = [
      '{{ 3 < 2 < 1 }}',
      '{{ [] or "fallback" }}',
      '{{ {} and "wrong" }}',
      '{% if enabled %}{% set value = "yes" %}{% endif %}{{ value|default("no") }}',
      '{% for item in items %}{{ item }}{% else %}{% set value = "empty" %}{{ value }}{% endfor %}{{ value|default("missing") }}',
    ]

    for (const source of parityCases) {
      test(`matches for ${source}`, async () => {
        const context = { enabled: true, items: [] }
        expect(compile(source)(context)).toBe(await render(source, context))
      })
    }

    test('custom function names execute and invalid names are rejected', () => {
      expect(compile('ok', { functionName: 'renderAudit' })({})).toBe('ok')
      expect(() => compile('ok', { functionName: 'x);globalThis.bad=true;//' })).toThrow(
        'Invalid JavaScript function name'
      )
    })

    test('collection tests use the same semantics', async () => {
      const source = '{{ value is iterable }}|{{ value is empty }}'
      const value = new Set([1])
      expect(compile(source)({ value })).toBe(await render(source, { value }))
    })
  })

  describe('template loading failures', () => {
    test('ignore missing suppresses only not-found failures', async () => {
      const missingRuntime = new Runtime({
        templateLoader: async (name) => {
          throw new TemplateNotFoundError(name)
        },
      })
      expect(await missingRuntime.render(parse('{% include "missing" ignore missing %}'))).toBe('')

      const brokenRuntime = new Runtime({
        templateLoader: async () => {
          throw new Error('template parse failed')
        },
      })
      await expect(
        brokenRuntime.render(parse('{% include "broken" ignore missing %}'))
      ).rejects.toThrow('template parse failed')
    })

    test('detects circular includes', async () => {
      const templates = new Map([
        ['a', parse('A{% include "b" %}')],
        ['b', parse('B{% include "a" %}')],
      ])
      const runtime = new Runtime({
        templateLoader: async (name) => templates.get(name)!,
      })
      await expect(runtime.render(templates.get('a')!)).rejects.toThrow('Circular template include')
    })
  })

  describe('secondary engines', () => {
    test('Twig ternary, coalesce, elseif and tests work', async () => {
      expect(await twig.render('{{ enabled ? "yes" : "no" }}', { enabled: true })).toBe('yes')
      expect(await twig.render('{{ missing ?? "fallback" }}')).toBe('fallback')
      expect(
        await twig.render('{% if a %}A{% elseif b %}B{% else %}C{% endif %}', { b: true })
      ).toBe('B')
      expect(await twig.render('{{ value is null }}', { value: null })).toBe('True')
      expect(await twig.render('{{ value is divisible by(3) }}', { value: 9 })).toBe('True')
    })

    test('Liquid standard aliases, ranges, capture and counters work', async () => {
      expect(await liquid.render('{{ name | upcase }}', { name: 'liquid' })).toBe('LIQUID')
      expect(await liquid.render('{% for n in (1..3) %}{{ n }}{% endfor %}')).toBe('123')
      expect(
        await liquid.render('{% capture x %}<b>{{ name }}</b>{% endcapture %}{{ x }}', {
          name: 'A',
        })
      ).toBe('<b>A</b>')
      expect(await liquid.render('{% increment x %},{% increment x %},{% decrement y %}')).toBe(
        '0,1,-1'
      )
    })

    test('Handlebars unless supports else and block mismatches fail', async () => {
      expect(
        await handlebars.render('{{#unless hidden}}shown{{else}}hidden{{/unless}}', {
          hidden: true,
        })
      ).toBe('hidden')
      await expect(handlebars.render('{{#if ok}}x{{/each}}', { ok: true })).rejects.toThrow(
        'Mismatched closing block'
      )
    })
  })

  test('debug context capture tolerates cycles and invalid dates', () => {
    const collector = new DebugCollector()
    const cyclic: any[] = []
    cyclic.push(cyclic)
    collector.captureContext({ cyclic, invalidDate: new Date(Number.NaN) })
    expect(collector.getData().contextSnapshot.cyclic.children?.['0'].preview).toBe('[Circular]')
    expect(collector.getData().contextSnapshot.invalidDate.preview).toBe('Invalid Date')
  })

  test('size-like filters reject non-positive and non-finite progress values', async () => {
    expect(() => builtinFilters.batch([1, 2], -1)).toThrow('positive integer')
    expect(() => builtinFilters.batch([1, 2], Number.POSITIVE_INFINITY, 'x')).toThrow(
      'positive integer'
    )
    expect(() => builtinFilters.columns([1, 2], 0)).not.toThrow()
    expect(() => builtinFilters.columns([1, 2], -2)).toThrow('positive integer')
    expect(() => builtinFilters.columns([1, 2], Number.POSITIVE_INFINITY)).toThrow(
      'positive integer'
    )
    expect(() => builtinFilters.wordwrap('long word', 0)).toThrow('positive integer')
    expect(() => builtinFilters.wordwrap('long word', Number.POSITIVE_INFINITY)).toThrow(
      'positive integer'
    )
    await expect(
      render('{{ items|batch(size, "x") }}', { items: [1, 2], size: -1 })
    ).rejects.toThrow('positive integer')
  })

  test('Template timezone option is forwarded to its reusable runtime', async () => {
    const template = Template('{{ date|date:"Y-m-d H:i" }}', { timezone: 'UTC' })
    expect(await template.render({ date: new Date(0) })).toBe('1970-01-01 00:00')
  })
})
