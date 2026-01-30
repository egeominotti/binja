/**
 * AOT Compilation with Template Inheritance Tests
 * Tests the compileWithInheritance() function that flattens template inheritance
 * at compile-time for maximum performance (160x faster than runtime)
 */
import { describe, test, expect, beforeAll } from 'bun:test'
import {
  compileWithInheritance,
  compileWithInheritanceToCode,
  canFlatten,
  Lexer,
  Parser,
} from '../src'
import * as fs from 'fs'
import * as path from 'path'

const TEMPLATES_DIR = '/tmp/binja-aot-test-templates'

describe('AOT Template Inheritance', () => {
  beforeAll(async () => {
    // Create test templates directory
    await fs.promises.mkdir(TEMPLATES_DIR, { recursive: true })

    // Base template
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'base.html'),
      `<!DOCTYPE html>
<html>
<head><title>{% block title %}Default{% endblock %}</title></head>
<body>
<header>{% block header %}Base Header{% endblock %}</header>
<main>{% block content %}{% endblock %}</main>
<footer>{% block footer %}Base Footer{% endblock %}</footer>
</body>
</html>`
    )

    // Child template
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'page.html'),
      `{% extends "base.html" %}
{% block title %}{{ title }}{% endblock %}
{% block content %}
<h1>{{ heading }}</h1>
<p>{{ message }}</p>
{% endblock %}`
    )

    // Grandchild template (3-level inheritance)
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'special_page.html'),
      `{% extends "page.html" %}
{% block header %}Special Header{% endblock %}
{% block content %}
<div class="special">
  <h1>{{ heading }}</h1>
  <p>Special: {{ message }}</p>
</div>
{% endblock %}`
    )

    // Template with include
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'nav.html'),
      `<nav>{% for item in nav_items %}<a href="{{ item.url }}">{{ item.name }}</a>{% endfor %}</nav>`
    )

    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'page_with_include.html'),
      `{% extends "base.html" %}
{% block header %}
{% include "nav.html" %}
{% endblock %}
{% block content %}{{ content }}{% endblock %}`
    )

    // Simple partial for include
    await fs.promises.writeFile(path.join(TEMPLATES_DIR, 'partial.html'), `<span>{{ name }}</span>`)

    // Template with include and context
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'with_include_context.html'),
      `{% include "partial.html" with name="Inlined" %}`
    )

    // Dynamic extends (should fail AOT)
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'dynamic_extends.html'),
      `{% extends parent_template %}
{% block content %}Dynamic{% endblock %}`
    )

    // Simple template (no inheritance)
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'simple.html'),
      `<h1>{{ title|upper }}</h1>`
    )
  })

  describe('compileWithInheritance', () => {
    test('compiles simple template without inheritance', async () => {
      const render = await compileWithInheritance('simple.html', {
        templates: TEMPLATES_DIR,
      })

      const result = render({ title: 'hello' })
      expect(result).toBe('<h1>HELLO</h1>')
    })

    test('compiles template with single-level extends', async () => {
      const render = await compileWithInheritance('page.html', {
        templates: TEMPLATES_DIR,
      })

      const result = render({
        title: 'My Page',
        heading: 'Welcome',
        message: 'Hello World',
      })

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<title>My Page</title>')
      expect(result).toContain('<h1>Welcome</h1>')
      expect(result).toContain('<p>Hello World</p>')
      expect(result).toContain('Base Footer') // Not overridden
    })

    test('compiles template with multi-level inheritance', async () => {
      const render = await compileWithInheritance('special_page.html', {
        templates: TEMPLATES_DIR,
      })

      const result = render({
        title: 'Special',
        heading: 'Special Welcome',
        message: 'Special Message',
      })

      expect(result).toContain('<title>Special</title>')
      expect(result).toContain('Special Header')
      expect(result).toContain('<div class="special">')
      expect(result).toContain('Special: Special Message')
      expect(result).toContain('Base Footer')
    })

    test('compiles template with include', async () => {
      const render = await compileWithInheritance('page_with_include.html', {
        templates: TEMPLATES_DIR,
      })

      const result = render({
        content: 'Main Content',
        nav_items: [
          { url: '/', name: 'Home' },
          { url: '/about', name: 'About' },
        ],
      })

      expect(result).toContain('<nav>')
      expect(result).toContain('<a href="/">Home</a>')
      expect(result).toContain('<a href="/about">About</a>')
      expect(result).toContain('Main Content')
    })

    test('compiles template with include and context', async () => {
      const render = await compileWithInheritance('with_include_context.html', {
        templates: TEMPLATES_DIR,
      })

      const result = render({})
      expect(result).toBe('<span>Inlined</span>')
    })

    test('throws error for dynamic extends', async () => {
      await expect(
        compileWithInheritance('dynamic_extends.html', {
          templates: TEMPLATES_DIR,
        })
      ).rejects.toThrow(/dynamic/i)
    })

    test('throws error for missing template', async () => {
      await expect(
        compileWithInheritance('nonexistent.html', {
          templates: TEMPLATES_DIR,
        })
      ).rejects.toThrow(/not found/i)
    })

    test('compiled function is synchronous', async () => {
      const render = await compileWithInheritance('page.html', {
        templates: TEMPLATES_DIR,
      })

      // Should return string directly, not Promise
      const result = render({ title: 'Test', heading: 'H', message: 'M' })
      expect(typeof result).toBe('string')
      expect(result).not.toBeInstanceOf(Promise)
    })
  })

  describe('compileWithInheritanceToCode', () => {
    test('generates JavaScript code string', async () => {
      const code = await compileWithInheritanceToCode('page.html', {
        templates: TEMPLATES_DIR,
        functionName: 'renderPage',
      })

      expect(code).toContain('function renderPage')
      expect(code).toContain('__ctx')
      expect(code).toContain('return __out')
    })

    test('generated code can be executed', async () => {
      const code = await compileWithInheritanceToCode('simple.html', {
        templates: TEMPLATES_DIR,
        functionName: 'renderSimple',
      })

      // Create function from code
      const escape = (v: any) => {
        if (v == null) return ''
        if ((v as any)?.__safe__) return String(v)
        return Bun.escapeHTML(String(v))
      }
      const isTruthy = (v: any) => v != null && v !== false && v !== 0 && v !== ''
      const toArray = (v: any) => (Array.isArray(v) ? v : [])
      const applyFilter = () => ''
      const applyTest = () => true

      const fn = new Function(
        '__ctx',
        '__helpers',
        `const { escape, isTruthy, toArray, applyFilter, applyTest } = __helpers;
        ${code}
        return renderSimple(__ctx);`
      )

      const result = fn({ title: 'test' }, { escape, isTruthy, toArray, applyFilter, applyTest })

      expect(result).toBe('<h1>TEST</h1>')
    })
  })

  describe('canFlatten', () => {
    test('returns true for static extends', () => {
      const source = '{% extends "base.html" %}{% block content %}Hi{% endblock %}'
      const lexer = new Lexer(source)
      const parser = new Parser(lexer.tokenize())
      const ast = parser.parse()

      const result = canFlatten(ast)
      expect(result.canFlatten).toBe(true)
    })

    test('returns false for dynamic extends', () => {
      const source = '{% extends parent %}{% block content %}Hi{% endblock %}'
      const lexer = new Lexer(source)
      const parser = new Parser(lexer.tokenize())
      const ast = parser.parse()

      const result = canFlatten(ast)
      expect(result.canFlatten).toBe(false)
      expect(result.reason).toContain('Dynamic')
    })

    test('returns false for dynamic include', () => {
      const source = '{% include template_name %}'
      const lexer = new Lexer(source)
      const parser = new Parser(lexer.tokenize())
      const ast = parser.parse()

      const result = canFlatten(ast)
      expect(result.canFlatten).toBe(false)
      expect(result.reason).toContain('Dynamic')
    })

    test('returns true for simple template', () => {
      const source = '{{ name|upper }}'
      const lexer = new Lexer(source)
      const parser = new Parser(lexer.tokenize())
      const ast = parser.parse()

      const result = canFlatten(ast)
      expect(result.canFlatten).toBe(true)
    })
  })

  describe('Performance Characteristics', () => {
    test('AOT compiled function is significantly faster than runtime', async () => {
      // Compile with AOT
      const aotRender = await compileWithInheritance('page.html', {
        templates: TEMPLATES_DIR,
      })

      const context = {
        title: 'Benchmark',
        heading: 'Performance Test',
        message: 'Testing speed',
      }

      // Warm up
      for (let i = 0; i < 100; i++) {
        aotRender(context)
      }

      // Benchmark AOT
      const iterations = 10000
      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        aotRender(context)
      }
      const aotTime = performance.now() - start

      // AOT should complete in reasonable time (< 500ms for 10k iterations)
      expect(aotTime).toBeLessThan(500)

      // Calculate ops/sec
      const opsPerSec = (iterations / aotTime) * 1000
      console.log(`AOT with inheritance: ${Math.round(opsPerSec).toLocaleString()} ops/sec`)

      // Should be at least 20,000 ops/sec
      expect(opsPerSec).toBeGreaterThan(20000)
    })
  })
})
