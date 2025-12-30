/**
 * LRU Cache Tests
 * Tests for template cache with LRU eviction
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { Environment } from '../src'
import * as fs from 'fs'
import * as path from 'path'

describe('LRU Template Cache', () => {
  const testDir = '/tmp/binja-cache-test-' + Date.now()

  beforeEach(() => {
    // Create test directory with templates
    fs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Cleanup test directory
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  // Helper to create a test template
  const createTemplate = (name: string, content: string) => {
    fs.writeFileSync(path.join(testDir, name), content)
  }

  describe('Basic Cache Operations', () => {
    test('caches templates by default', async () => {
      createTemplate('test.html', 'Hello {{ name }}')
      const env = new Environment({ templates: testDir })

      // First render - cache miss
      await env.render('test.html', { name: 'World' })
      expect(env.cacheSize()).toBe(1)

      // Second render - cache hit
      await env.render('test.html', { name: 'Bun' })
      expect(env.cacheSize()).toBe(1)

      const stats = env.cacheStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
    })

    test('clearCache removes all entries and resets stats', async () => {
      createTemplate('a.html', 'A')
      createTemplate('b.html', 'B')
      const env = new Environment({ templates: testDir })

      await env.render('a.html', {})
      await env.render('b.html', {})
      expect(env.cacheSize()).toBe(2)

      env.clearCache()
      expect(env.cacheSize()).toBe(0)
      expect(env.cacheStats().hits).toBe(0)
      expect(env.cacheStats().misses).toBe(0)
    })

    test('cache can be disabled', async () => {
      createTemplate('test.html', 'Test')
      const env = new Environment({ templates: testDir, cache: false })

      await env.render('test.html', {})
      await env.render('test.html', {})
      expect(env.cacheSize()).toBe(0)
    })
  })

  describe('LRU Eviction', () => {
    test('evicts oldest template when cache is full', async () => {
      // Create 5 templates
      for (let i = 1; i <= 5; i++) {
        createTemplate(`t${i}.html`, `Template ${i}`)
      }

      // Set max cache size to 3
      const env = new Environment({ templates: testDir, cacheMaxSize: 3 })

      // Load templates 1, 2, 3
      await env.render('t1.html', {})
      await env.render('t2.html', {})
      await env.render('t3.html', {})
      expect(env.cacheSize()).toBe(3)

      // Load template 4 - should evict t1 (oldest)
      await env.render('t4.html', {})
      expect(env.cacheSize()).toBe(3)

      // Load template 5 - should evict t2
      await env.render('t5.html', {})
      expect(env.cacheSize()).toBe(3)

      // Access t3 again (cache hit, moves to end)
      await env.render('t3.html', {})

      // Load t1 again - should evict t4 (oldest after t3 was moved)
      await env.render('t1.html', {})
      expect(env.cacheSize()).toBe(3)
    })

    test('recently accessed templates are preserved', async () => {
      for (let i = 1; i <= 4; i++) {
        createTemplate(`t${i}.html`, `Template ${i}`)
      }

      const env = new Environment({ templates: testDir, cacheMaxSize: 3 })

      // Load templates 1, 2, 3
      await env.render('t1.html', {})
      await env.render('t2.html', {})
      await env.render('t3.html', {})

      // Access t1 (moves to end, becomes most recently used)
      await env.render('t1.html', {})

      // Load t4 - should evict t2 (oldest after t1 was moved)
      await env.render('t4.html', {})

      // Verify stats
      const stats = env.cacheStats()
      expect(stats.size).toBe(3)
      expect(stats.maxSize).toBe(3)
      expect(stats.hits).toBe(1) // t1 was a hit
      expect(stats.misses).toBe(4) // t1, t2, t3, t4 were misses
    })

    test('cache size of 1 works correctly', async () => {
      createTemplate('a.html', 'A')
      createTemplate('b.html', 'B')

      const env = new Environment({ templates: testDir, cacheMaxSize: 1 })

      await env.render('a.html', {})
      expect(env.cacheSize()).toBe(1)

      await env.render('b.html', {})
      expect(env.cacheSize()).toBe(1)

      // a.html should be evicted, b.html should be in cache
      await env.render('a.html', {})
      expect(env.cacheStats().misses).toBe(3) // all were misses
    })
  })

  describe('Cache Statistics', () => {
    test('tracks hit rate correctly', async () => {
      createTemplate('test.html', 'Test')
      const env = new Environment({ templates: testDir })

      // 1 miss
      await env.render('test.html', {})
      expect(env.cacheStats().hitRate).toBe(0)

      // 1 hit, 1 miss = 50%
      await env.render('test.html', {})
      expect(env.cacheStats().hitRate).toBe(50)

      // 2 hits, 1 miss = 66.67%
      await env.render('test.html', {})
      expect(env.cacheStats().hitRate).toBeCloseTo(66.67, 1)

      // 3 hits, 1 miss = 75%
      await env.render('test.html', {})
      expect(env.cacheStats().hitRate).toBe(75)
    })

    test('cacheStats returns correct structure', async () => {
      const env = new Environment({ templates: testDir, cacheMaxSize: 50 })
      const stats = env.cacheStats()

      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('maxSize')
      expect(stats).toHaveProperty('hits')
      expect(stats).toHaveProperty('misses')
      expect(stats).toHaveProperty('hitRate')
      expect(stats.maxSize).toBe(50)
    })

    test('empty cache has 0% hit rate', () => {
      const env = new Environment({ templates: testDir })
      expect(env.cacheStats().hitRate).toBe(0)
    })
  })

  describe('Default Configuration', () => {
    test('default cacheMaxSize is 100', () => {
      const env = new Environment({ templates: testDir })
      expect(env.cacheStats().maxSize).toBe(100)
    })

    test('can set custom cacheMaxSize', () => {
      const env = new Environment({ templates: testDir, cacheMaxSize: 500 })
      expect(env.cacheStats().maxSize).toBe(500)
    })
  })

  describe('Edge Cases', () => {
    test('handles many templates beyond cache size', async () => {
      // Create 20 templates
      for (let i = 1; i <= 20; i++) {
        createTemplate(`t${i}.html`, `Template ${i}: {{ value }}`)
      }

      const env = new Environment({ templates: testDir, cacheMaxSize: 5 })

      // Load all 20 templates
      for (let i = 1; i <= 20; i++) {
        const result = await env.render(`t${i}.html`, { value: i })
        expect(result).toBe(`Template ${i}: ${i}`)
      }

      // Cache should only have 5 templates
      expect(env.cacheSize()).toBe(5)

      // Should have 20 misses (all new loads)
      expect(env.cacheStats().misses).toBe(20)
    })

    test('cache handles concurrent-like access', async () => {
      for (let i = 1; i <= 5; i++) {
        createTemplate(`t${i}.html`, `${i}`)
      }

      const env = new Environment({ templates: testDir, cacheMaxSize: 3 })

      // Simulate rapid access pattern
      const templates = ['t1.html', 't2.html', 't3.html', 't1.html', 't4.html', 't1.html', 't5.html']

      for (const t of templates) {
        await env.render(t, {})
      }

      expect(env.cacheSize()).toBe(3)
      // t1 should still be in cache (accessed frequently)
    })

    test('renderString does not use cache', async () => {
      const env = new Environment({ templates: testDir })

      await env.renderString('{{ x }}', { x: 1 })
      await env.renderString('{{ x }}', { x: 2 })

      expect(env.cacheSize()).toBe(0)
      expect(env.cacheStats().hits).toBe(0)
      expect(env.cacheStats().misses).toBe(0)
    })
  })
})
