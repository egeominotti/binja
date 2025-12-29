/**
 * Template Inheritance Tests - Based on Jinja2 test_inheritance.py
 */
import { describe, test, expect, beforeAll } from 'bun:test'
import { Environment } from '../src'
import * as fs from 'fs'
import * as path from 'path'

const TEMPLATES_DIR = '/tmp/jinja-bun-test-templates'

describe('Template Inheritance', () => {
  let env: Environment

  beforeAll(async () => {
    // Create test templates directory
    await fs.promises.mkdir(TEMPLATES_DIR, { recursive: true })

    // Create base template
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'base.html'),
      `<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}Default Title{% endblock %}</title>
</head>
<body>
  <header>{% block header %}Header{% endblock %}</header>
  <main>{% block content %}{% endblock %}</main>
  <footer>{% block footer %}Footer{% endblock %}</footer>
</body>
</html>`
    )

    // Create child template
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'child.html'),
      `{% extends "base.html" %}
{% block title %}Child Page{% endblock %}
{% block content %}
  <h1>Hello World</h1>
  <p>This is the child content.</p>
{% endblock %}`
    )

    // Create grandchild template
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'grandchild.html'),
      `{% extends "child.html" %}
{% block title %}Grandchild Page{% endblock %}
{% block content %}
  <h1>Grandchild</h1>
  <p>This overrides child content.</p>
{% endblock %}`
    )

    // Create template with super
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'with_super.html'),
      `{% extends "base.html" %}
{% block header %}
  {{ block.super }}
  <nav>Navigation</nav>
{% endblock %}`
    )

    // Create include test templates
    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'header.html'),
      `<header>{{ title }}</header>`
    )

    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'with_include.html'),
      `{% include "header.html" %}
<main>Content</main>`
    )

    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'with_include_context.html'),
      `{% include "header.html" with title="Custom Title" %}`
    )

    env = new Environment({ templates: TEMPLATES_DIR })
  })

  describe('Extends', () => {
    test('inherits from base template', async () => {
      const result = await env.render('child.html', {})
      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<title>Child Page</title>')
      expect(result).toContain('Hello World')
    })

    test('uses default block content when not overridden', async () => {
      const result = await env.render('child.html', {})
      expect(result).toContain('Header')
      expect(result).toContain('Footer')
    })

    test('supports multi-level inheritance', async () => {
      const result = await env.render('grandchild.html', {})
      expect(result).toContain('<title>Grandchild Page</title>')
      expect(result).toContain('Grandchild')
      expect(result).not.toContain('Hello World') // Overridden
    })
  })

  describe('Block Super', () => {
    test('includes parent block content', async () => {
      const result = await env.render('with_super.html', {})
      expect(result).toContain('Header')
      expect(result).toContain('Navigation')
    })
  })

  describe('Include', () => {
    test('includes another template', async () => {
      const result = await env.render('with_include.html', { title: 'Page Title' })
      expect(result).toContain('<header>Page Title</header>')
      expect(result).toContain('<main>Content</main>')
    })

    test('passes context with "with"', async () => {
      const result = await env.render('with_include_context.html', {})
      expect(result).toContain('<header>Custom Title</header>')
    })

    test('handles missing template with ignore missing', async () => {
      const result = await env.renderString('{% include "nonexistent.html" ignore missing %}OK', {})
      expect(result).toBe('OK')
    })
  })

  describe('Dynamic Templates', () => {
    test('supports variable template name in extends', async () => {
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'dynamic_extends.html'),
        `{% extends parent %}{% block content %}Dynamic{% endblock %}`
      )
      const result = await env.render('dynamic_extends.html', { parent: 'base.html' })
      expect(result).toContain('Dynamic')
    })

    test('supports variable template name in include', async () => {
      const result = await env.renderString('{% include template_name %}', {
        template_name: 'header.html',
        title: 'Dynamic Include',
      })
      expect(result).toContain('Dynamic Include')
    })
  })

  describe('Block Scoping', () => {
    test('block variables are scoped correctly', async () => {
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'block_scope.html'),
        `{% extends "base.html" %}
{% block content %}
  {% for item in items %}{{ item }}{% endfor %}
{% endblock %}`
      )
      const result = await env.render('block_scope.html', { items: [1, 2, 3] })
      expect(result).toContain('123')
    })
  })

  describe('Multiple Blocks', () => {
    test('can override multiple blocks', async () => {
      await fs.promises.writeFile(
        path.join(TEMPLATES_DIR, 'multi_block.html'),
        `{% extends "base.html" %}
{% block title %}Multi Block{% endblock %}
{% block header %}Custom Header{% endblock %}
{% block content %}Custom Content{% endblock %}
{% block footer %}Custom Footer{% endblock %}`
      )
      const result = await env.render('multi_block.html', {})
      expect(result).toContain('<title>Multi Block</title>')
      expect(result).toContain('Custom Header')
      expect(result).toContain('Custom Content')
      expect(result).toContain('Custom Footer')
    })
  })
})
