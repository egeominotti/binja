/**
 * Debug Panel Tests
 */
import { describe, test, expect, beforeAll } from 'bun:test'
import { Environment } from '../src'
import {
  renderWithDebug,
  renderStringWithDebug,
  generateDebugPanel,
  createDebugRenderer,
} from '../src/debug'
import { DebugCollector } from '../src/debug/collector'
import * as fs from 'fs'
import * as path from 'path'

const TEMPLATES_DIR = '/tmp/binja-debug-test'

describe('Debug Panel', () => {
  let env: Environment

  beforeAll(async () => {
    await fs.promises.mkdir(TEMPLATES_DIR, { recursive: true })

    await fs.promises.writeFile(
      path.join(TEMPLATES_DIR, 'page.html'),
      `<!DOCTYPE html>
<html>
<head><title>{{ title }}</title></head>
<body>
<h1>{{ heading|upper }}</h1>
<ul>
{% for item in items %}
  <li>{{ item }}</li>
{% endfor %}
</ul>
</body>
</html>`
    )

    env = new Environment({ templates: TEMPLATES_DIR })
  })

  describe('DebugCollector', () => {
    test('captures timing information', () => {
      const collector = new DebugCollector()

      collector.startLexer()
      collector.endLexer()
      collector.startParser()
      collector.endParser()
      collector.startRender()
      collector.endRender()

      const data = collector.getData()
      expect(data.lexerTime).toBeDefined()
      expect(data.parserTime).toBeDefined()
      expect(data.renderTime).toBeDefined()
      expect(data.totalTime).toBeDefined()
    })

    test('captures context variables', () => {
      const collector = new DebugCollector()

      collector.captureContext({
        name: 'John',
        age: 30,
        items: [1, 2, 3],
        user: { id: 1, active: true },
      })

      const data = collector.getData()
      expect(data.contextKeys).toContain('name')
      expect(data.contextKeys).toContain('age')
      expect(data.contextKeys).toContain('items')
      expect(data.contextKeys).toContain('user')

      expect(data.contextSnapshot.name.type).toBe('string')
      expect(data.contextSnapshot.age.type).toBe('number')
      expect(data.contextSnapshot.items.type).toBe('Array(3)')
      expect(data.contextSnapshot.user.type).toBe('Object')
    })

    test('tracks template chain', () => {
      const collector = new DebugCollector()

      collector.addTemplate('page.html', 'root')
      collector.addTemplate('base.html', 'extends', 'page.html')
      collector.addTemplate('nav.html', 'include')

      const data = collector.getData()
      expect(data.templateChain).toHaveLength(3)
      expect(data.templateChain[0].name).toBe('page.html')
      expect(data.templateChain[1].type).toBe('extends')
      expect(data.templateChain[2].type).toBe('include')
    })

    test('tracks filter usage', () => {
      const collector = new DebugCollector()

      collector.recordFilter('upper')
      collector.recordFilter('upper')
      collector.recordFilter('lower')

      const data = collector.getData()
      expect(data.filtersUsed.get('upper')).toBe(2)
      expect(data.filtersUsed.get('lower')).toBe(1)
    })

    test('tracks cache stats', () => {
      const collector = new DebugCollector()

      collector.recordCacheHit()
      collector.recordCacheHit()
      collector.recordCacheMiss()

      const data = collector.getData()
      expect(data.cacheHits).toBe(2)
      expect(data.cacheMisses).toBe(1)
    })

    test('collects warnings', () => {
      const collector = new DebugCollector()

      collector.addWarning('Dynamic include not optimized')
      collector.addWarning('Template not cached')

      const data = collector.getData()
      expect(data.warnings).toHaveLength(2)
    })
  })

  describe('generateDebugPanel', () => {
    test('generates HTML panel', () => {
      const collector = new DebugCollector()
      collector.captureContext({ title: 'Test' })
      collector.startRender()
      collector.endRender()
      const data = collector.getData()

      const html = generateDebugPanel(data)

      expect(html).toContain('Binja Debug Panel')
      expect(html).toContain('binja-dbg-')
      expect(html).toContain('<style>')
      expect(html).toContain('<script>')
    })

    test('respects dark mode option', () => {
      const collector = new DebugCollector()
      collector.endRender()
      const data = collector.getData()

      const darkHtml = generateDebugPanel(data, { dark: true })
      const lightHtml = generateDebugPanel(data, { dark: false })

      expect(darkHtml).toContain('#1e1e1e') // Dark bg (VS Code style)
      expect(lightHtml).toContain('#f3f3f3') // Light bg
    })

    test('shows performance breakdown', () => {
      const collector = new DebugCollector()
      collector.startLexer()
      collector.endLexer()
      collector.startParser()
      collector.endParser()
      collector.startRender()
      collector.endRender()
      const data = collector.getData()

      const html = generateDebugPanel(data)

      expect(html).toContain('Performance')
      expect(html).toContain('Lexer')
      expect(html).toContain('Parser')
      expect(html).toContain('Render')
    })
  })

  describe('renderWithDebug', () => {
    test('injects debug panel into HTML', async () => {
      const result = await renderWithDebug(env, 'page.html', {
        title: 'Debug Test',
        heading: 'Hello',
        items: [1, 2, 3],
      })

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<title>Debug Test</title>')
      expect(result).toContain('Binja Debug Panel')
      expect(result).toContain('</body>')
    })

    test('panel appears before closing body tag', async () => {
      const result = await renderWithDebug(env, 'page.html', {
        title: 'Test',
        heading: 'H',
        items: [],
      })

      const panelStart = result.indexOf('Binja Debug Panel')
      const bodyEnd = result.indexOf('</body>')

      expect(panelStart).toBeLessThan(bodyEnd)
    })

    test('shows context variables in panel', async () => {
      const result = await renderWithDebug(env, 'page.html', {
        title: 'Context Test',
        heading: 'Hello',
        items: ['a', 'b', 'c'],
      })

      expect(result).toContain('Context')
      expect(result).toContain('title')
      expect(result).toContain('heading')
      expect(result).toContain('items')
    })
  })

  describe('renderStringWithDebug', () => {
    test('works with string templates', async () => {
      const result = await renderStringWithDebug(env, '<html><body>{{ name }}</body></html>', {
        name: 'World',
      })

      expect(result).toContain('World')
      expect(result).toContain('Binja Debug Panel')
    })

    test('skips non-HTML content when htmlOnly is true', async () => {
      const result = await renderStringWithDebug(
        env,
        '{{ name }}',
        { name: 'World' },
        { htmlOnly: true }
      )

      expect(result).toBe('World')
      expect(result).not.toContain('Binja Debug Panel')
    })
  })

  describe('createDebugRenderer', () => {
    test('creates debug-enabled render functions', async () => {
      const debug = createDebugRenderer(env)

      const result = await debug.render('page.html', {
        title: 'Test',
        heading: 'Hi',
        items: [],
      })

      expect(result).toContain('Binja Debug Panel')
    })
  })
})
