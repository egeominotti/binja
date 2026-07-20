/**
 * Regression tests for defects found in the codebase audit.
 * Grouped by cluster: quick-wins, security, per-render state, AOT.
 */
import { describe, test, expect } from 'bun:test'
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { render, Environment, compile } from '../src'
import { builtinTests } from '../src/tests'
import * as liquid from '../src/engines/liquid'

describe('audit: quick wins', () => {
  describe('builtinTests undefined/defined (no global shadow)', () => {
    test('defined() is correct for present values', () => {
      expect(builtinTests.defined(1, undefined)).toBe(true)
      expect(builtinTests.defined('', undefined)).toBe(true)
      expect(builtinTests.defined(null, undefined)).toBe(true)
    })

    test('defined() is false for undefined', () => {
      expect(builtinTests.defined(undefined, undefined)).toBe(false)
    })

    test('undefined test is true only for undefined', () => {
      expect(builtinTests.undefined(undefined, undefined)).toBe(true)
      expect(builtinTests.undefined(1, undefined)).toBe(false)
      expect(builtinTests.undefined(null, undefined)).toBe(false)
    })
  })

  describe('Liquid contains', () => {
    test('array contains item (true/false)', async () => {
      expect(
        await liquid.render('{% if tags contains "sale" %}Y{% else %}N{% endif %}', {
          tags: ['new', 'sale'],
        })
      ).toBe('Y')
      expect(
        await liquid.render('{% if tags contains "x" %}Y{% else %}N{% endif %}', {
          tags: ['new', 'sale'],
        })
      ).toBe('N')
    })

    test('string contains substring (true/false)', async () => {
      expect(
        await liquid.render('{% if name contains "ell" %}Y{% else %}N{% endif %}', {
          name: 'hello',
        })
      ).toBe('Y')
      expect(
        await liquid.render('{% if name contains "zzz" %}Y{% else %}N{% endif %}', {
          name: 'hello',
        })
      ).toBe('N')
    })
  })
})

describe('audit: security', () => {
  describe('XSS — HTML-producing filters escape user content', () => {
    test('linebreaks escapes markup', async () => {
      const out = String(await render('{{ s|linebreaks }}', { s: '<script>alert(1)</script>' }))
      expect(out).not.toContain('<script>')
      expect(out).toContain('&lt;script&gt;')
    })

    test('linebreaksbr escapes markup', async () => {
      const out = String(
        await render('{{ s|linebreaksbr }}', { s: '<img src=x onerror=alert(1)>' })
      )
      expect(out).not.toContain('<img')
      expect(out).toContain('&lt;img')
    })

    test('urlize escapes surrounding text and href (no attribute breakout)', async () => {
      const out = String(
        await render('{{ s|urlize }}', { s: 'http://x.com/"onmouseover=alert(1)' })
      )
      // The injected quote must be escaped so it cannot break out of href="...".
      expect(out).toContain('&quot;onmouseover')
      expect(out).not.toContain('"onmouseover=alert')
    })

    test('urlize escapes non-URL text', async () => {
      const out = String(await render('{{ s|urlize }}', { s: '<b>x</b> http://x.com' }))
      expect(out).toContain('&lt;b&gt;')
      expect(out).not.toContain('<b>')
    })

    test('urlizetrunc escapes injected markup', async () => {
      const out = String(
        await render('{{ s|urlizetrunc:10 }}', { s: 'http://evil.com/"><script>' })
      )
      expect(out).not.toContain('<script>')
      expect(out).toContain('&quot;&gt;&lt;script&gt;')
    })

    test('unordered_list escapes each item', async () => {
      const out = String(
        await render('{{ s|unordered_list }}', { s: ['<script>x</script>', 'ok'] })
      )
      expect(out).not.toContain('<script>')
      expect(out).toContain('<li>&lt;script&gt;')
      expect(out).toContain('<li>ok</li>')
    })

    test('plain inputs are unaffected', async () => {
      expect(String(await render('{{ s|linebreaksbr }}', { s: 'a\nb' }))).toBe('a<br>b')
      expect(String(await render('{{ s|urlize }}', { s: 'go https://example.com' }))).toBe(
        'go <a href="https://example.com">https://example.com</a>'
      )
    })
  })

  describe('Path traversal containment', () => {
    const root = '/tmp/binja-audit-tt/views'
    mkdirSync(root, { recursive: true })
    writeFileSync(`${root}/ok.html`, 'OK {{ x }}')
    writeFileSync('/tmp/binja-audit-tt/secret.txt', 'SECRET')
    const env = new Environment({ templates: root })

    test('legitimate template renders', async () => {
      expect(await env.render('ok', { x: 1 })).toBe('OK 1')
    })

    test('rejects ../ escape', async () => {
      await expect(env.render('../secret.txt', {})).rejects.toThrow()
    })

    test('rejects absolute path escape', async () => {
      await expect(env.render('/etc/hostname', {})).rejects.toThrow()
    })

    test('does not leak file contents on traversal', async () => {
      let leaked = false
      try {
        const r = await env.render('../secret.txt', {})
        leaked = String(r).includes('SECRET')
      } catch {
        /* expected */
      }
      expect(leaked).toBe(false)
    })

    test('rejects a template symlink that escapes the root', async () => {
      const outside = '/tmp/binja-audit-tt/symlink-secret.html'
      const link = `${root}/linked.html`
      writeFileSync(outside, 'SYMLINK SECRET')
      try {
        symlinkSync(outside, link)
      } catch {
        // The link may already exist from a previous interrupted run.
      }

      await expect(env.render('linked', {})).rejects.toThrow()
    })
  })
})

describe('audit: per-render state', () => {
  test('cycle restarts on each render (no cross-render leak)', async () => {
    const env = new Environment({ autoescape: false })
    const tpl = '{% for i in items %}{% cycle "a" "b" %}{% endfor %}'
    const r1 = await env.renderString(tpl, { items: [1, 2, 3] })
    const r2 = await env.renderString(tpl, { items: [1, 2, 3] })
    expect(r1).toBe('aba')
    expect(r2).toBe('aba') // would be 'bab'/'aba'-shifted if state leaked
  })

  test('ifchanged restarts on each render', async () => {
    const env = new Environment({ autoescape: false })
    const tpl = '{% for i in items %}{% ifchanged %}{{ i }}{% endifchanged %}{% endfor %}'
    const r1 = await env.renderString(tpl, { items: [1, 1, 2, 2] })
    const r2 = await env.renderString(tpl, { items: [1, 1, 2, 2] })
    expect(r1).toBe('12')
    expect(r2).toBe('12') // first item would be suppressed if last value leaked
  })

  test('block.super still works after lazy-render change', async () => {
    const d = '/tmp/binja-audit-super'
    mkdirSync(d, { recursive: true })
    writeFileSync(`${d}/base.html`, '{% block c %}BASE{% endblock %}')
    writeFileSync(
      `${d}/child.html`,
      '{% extends "base.html" %}{% block c %}[{{ block.super }}]{% endblock %}'
    )
    const env = new Environment({ templates: d, autoescape: false })
    expect(await env.render('child', {})).toBe('[BASE]')
  })

  test('overridden block without super does not double-render parent side effects', async () => {
    // Parent block contains a cycle; child overrides without calling super. The
    // parent body must NOT be rendered (which would advance the cycle).
    const d = '/tmp/binja-audit-nosuper'
    mkdirSync(d, { recursive: true })
    writeFileSync(
      `${d}/base2.html`,
      '{% for i in items %}{% block c %}{% cycle "x" "y" %}{% endblock %}{% endfor %}'
    )
    writeFileSync(`${d}/child2.html`, '{% extends "base2.html" %}{% block c %}Z{% endblock %}')
    const env = new Environment({ templates: d, autoescape: false })
    expect(await env.render('child2', { items: [1, 2] })).toBe('ZZ')
  })
})

describe('audit: AOT compiler', () => {
  test('{% set %} top-level registers as local', () => {
    expect(compile('{% set x = 5 %}{{ x }}')({})).toBe('5')
    expect(compile('{% set n = 3 %}{{ n + 1 }}')({})).toBe('4')
  })

  test('loop body no longer mangles vars sharing the loop-var prefix', () => {
    // Was: __ctx.username -> username (ReferenceError) due to substring regex.
    expect(
      compile('{% for u in xs %}{{ username }}{% endfor %}')({ xs: [1], username: 'BOB' })
    ).toBe('BOB')
    expect(compile('{% for u in xs %}{{ u }}{% endfor %}')({ xs: [1, 2, 3] })).toBe('123')
  })

  test('reserved-word targets do not crash new Function', () => {
    expect(compile('{% set class = 9 %}{{ class }}')({})).toBe('9')
    expect(compile('{% for class in xs %}{{ class }}{% endfor %}')({ xs: [7, 8] })).toBe('78')
  })

  test('function calls compile (were silently undefined)', () => {
    expect(compile('{{ greet(name) }}')({ greet: (n: string) => `Hi ${n}`, name: 'A' })).toBe(
      'Hi A'
    )
  })

  test('in operator handles objects, arrays and strings (membership, not JS in)', () => {
    // object RHS (worked even with raw JS `in`)
    expect(compile('{% if "a" in o %}Y{% else %}N{% endif %}')({ o: { a: 1 } })).toBe('Y')
    expect(compile('{% if "z" in o %}Y{% else %}N{% endif %}')({ o: { a: 1 } })).toBe('N')
    // array RHS: must be membership, not index lookup (raw JS `in` was wrong)
    expect(compile('{% if v in xs %}Y{% else %}N{% endif %}')({ v: 5, xs: [1, 2, 5] })).toBe('Y')
    expect(compile('{% if v in xs %}Y{% else %}N{% endif %}')({ v: 2, xs: [10, 20, 30] })).toBe('N')
    // string RHS: substring (raw JS `in` threw on a primitive)
    expect(compile('{% if v in s %}Y{% else %}N{% endif %}')({ v: 'ell', s: 'hello' })).toBe('Y')
    // not in
    expect(compile('{% if v not in xs %}Y{% else %}N{% endif %}')({ v: 9, xs: [1, 2] })).toBe('Y')
  })

  test('unsupported constructs fail loudly in AOT', () => {
    // Inheritance/url tags are explicitly unsupported by the AOT path and must
    // throw (loud failure) rather than silently produce wrong output.
    expect(() => compile('{% block x %}a{% endblock %}')).toThrow()
    expect(() => compile('{% extends "base.html" %}')).toThrow()
  })

  describe('runtime ↔ AOT parity', () => {
    const cases: Array<[string, Record<string, any>]> = [
      ['{% set x = 2 %}{{ x }}{{ x * 3 }}', {}],
      ['{% for i in xs %}{{ i }}-{{ loop.index }};{% endfor %}', { xs: ['a', 'b'] }],
      ['{{ n|round(2) }}', { n: Math.PI }],
      ['{{ s|default("X") }}', { s: '' }],
      ['{{ items|length }}', { items: [1, 2, 3] }],
      ['{{ items|last }}', { items: [1, 2, 3] }],
      ['{% if "a" in o %}Y{% else %}N{% endif %}', { o: { a: 1 } }],
      ['{% if v in xs %}Y{% else %}N{% endif %}', { v: 5, xs: [1, 2, 5] }],
      ['{% if v in xs %}Y{% else %}N{% endif %}', { v: 2, xs: [10, 20, 30] }],
      ['{% if v in s %}Y{% else %}N{% endif %}', { v: 'ell', s: 'hello' }],
      ['{% if v not in xs %}Y{% else %}N{% endif %}', { v: 9, xs: [1, 2] }],
      ['{% for u in xs %}{{ username }}{% endfor %}', { xs: [1], username: 'Z' }],
    ]

    for (const [tpl, ctx] of cases) {
      test(`parity: ${tpl}`, async () => {
        const runtimeOut = await render(tpl, ctx)
        const aotOut = compile(tpl)(ctx)
        expect(aotOut).toBe(runtimeOut)
      })
    }
  })
})
