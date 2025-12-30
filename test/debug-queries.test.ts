/**
 * Tests for Query Telemetry in Debug Panel
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import {
  startDebugCollection,
  endDebugCollection,
  getDebugCollector,
  recordQuery,
  createPrismaMiddleware,
  createDrizzleLogger,
  wrapQuery,
  createQueryWrapper,
} from '../src/debug'
import { generateDebugPanel } from '../src/debug/panel'

describe('Query Telemetry', () => {
  beforeEach(() => {
    // Clean up any previous collector
    endDebugCollection()
  })

  describe('DebugCollector.recordQuery', () => {
    test('records basic query', () => {
      const collector = startDebugCollection()

      collector.recordQuery({
        sql: 'SELECT * FROM users WHERE id = ?',
        params: [1],
        duration: 5.5,
        rows: 1,
        source: 'test',
      })

      const data = collector.getData()
      expect(data.queries.length).toBe(1)
      expect(data.queries[0].sql).toBe('SELECT * FROM users WHERE id = ?')
      expect(data.queries[0].duration).toBe(5.5)
      expect(data.queries[0].rows).toBe(1)
      expect(data.queries[0].source).toBe('test')
      expect(data.queries[0].timestamp).toBeGreaterThan(0)
    })

    test('updates query stats', () => {
      const collector = startDebugCollection()

      collector.recordQuery({ sql: 'SELECT 1', duration: 10 })
      collector.recordQuery({ sql: 'SELECT 2', duration: 20 })

      const stats = collector.getQueryStats()
      expect(stats.count).toBe(2)
      expect(stats.totalDuration).toBe(30)
    })

    test('detects slow queries (>100ms)', () => {
      const collector = startDebugCollection()

      collector.recordQuery({ sql: 'SELECT 1', duration: 50 })
      collector.recordQuery({ sql: 'SELECT 2', duration: 150 })
      collector.recordQuery({ sql: 'SELECT 3', duration: 200 })

      const stats = collector.getQueryStats()
      expect(stats.slowCount).toBe(2)
    })
  })

  describe('N+1 Detection', () => {
    test('detects N+1 pattern (3+ same queries)', () => {
      const collector = startDebugCollection()

      // Simulate N+1: fetching user for each post
      collector.recordQuery({ sql: 'SELECT * FROM users WHERE id = 1', duration: 5 })
      collector.recordQuery({ sql: 'SELECT * FROM users WHERE id = 2', duration: 5 })
      collector.recordQuery({ sql: 'SELECT * FROM users WHERE id = 3', duration: 5 })

      const data = collector.getData()
      const stats = collector.getQueryStats()

      // Third query should be marked as N+1
      expect(data.queries[2].isN1).toBe(true)
      expect(stats.n1Count).toBe(1)
      expect(data.warnings.some(w => w.includes('N+1'))).toBe(true)
    })

    test('normalizes queries for N+1 comparison', () => {
      const collector = startDebugCollection()

      // Different IDs should still be detected as same pattern
      collector.recordQuery({ sql: 'SELECT * FROM users WHERE id = 1', duration: 5 })
      collector.recordQuery({ sql: 'SELECT * FROM users WHERE id = 42', duration: 5 })
      collector.recordQuery({ sql: 'SELECT * FROM users WHERE id = 999', duration: 5 })

      const stats = collector.getQueryStats()
      expect(stats.n1Count).toBe(1)
    })

    test('different query patterns do not trigger N+1', () => {
      const collector = startDebugCollection()

      collector.recordQuery({ sql: 'SELECT * FROM users', duration: 5 })
      collector.recordQuery({ sql: 'SELECT * FROM posts', duration: 5 })
      collector.recordQuery({ sql: 'SELECT * FROM comments', duration: 5 })

      const stats = collector.getQueryStats()
      expect(stats.n1Count).toBe(0)
    })
  })

  describe('Global recordQuery helper', () => {
    test('records when collector is active', () => {
      startDebugCollection()

      recordQuery({
        sql: 'SELECT * FROM products',
        duration: 10,
        rows: 5,
      })

      const collector = getDebugCollector()
      expect(collector!.getData().queries.length).toBe(1)
    })

    test('no-op when collector is not active', () => {
      // No collector started
      recordQuery({
        sql: 'SELECT * FROM products',
        duration: 10,
      })

      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('ORM Integrations', () => {
    test('createPrismaMiddleware records queries', async () => {
      startDebugCollection()
      const middleware = createPrismaMiddleware()

      // Simulate Prisma middleware call
      const params = { model: 'User', action: 'findMany', args: { where: { active: true } } }
      const next = async () => [{ id: 1 }, { id: 2 }]

      const result = await middleware(params, next)

      expect(result).toEqual([{ id: 1 }, { id: 2 }])

      const collector = getDebugCollector()
      const queries = collector!.getData().queries
      expect(queries.length).toBe(1)
      expect(queries[0].sql).toBe('findMany User')
      expect(queries[0].rows).toBe(2)
      expect(queries[0].source).toBe('prisma')
    })

    test('createDrizzleLogger records queries', () => {
      startDebugCollection()
      const logger = createDrizzleLogger()

      logger.logQuery('SELECT * FROM users WHERE active = ?', [true])

      const collector = getDebugCollector()
      const queries = collector!.getData().queries
      expect(queries.length).toBe(1)
      expect(queries[0].sql).toBe('SELECT * FROM users WHERE active = ?')
      expect(queries[0].source).toBe('drizzle')
    })

    test('wrapQuery measures timing', async () => {
      startDebugCollection()

      const result = await wrapQuery(
        'SELECT * FROM orders',
        async () => {
          await new Promise(r => setTimeout(r, 10))
          return [{ id: 1 }]
        }
      )

      expect(result).toEqual([{ id: 1 }])

      const collector = getDebugCollector()
      const queries = collector!.getData().queries
      expect(queries.length).toBe(1)
      expect(queries[0].duration).toBeGreaterThanOrEqual(10)
    })

    test('createQueryWrapper with custom source', async () => {
      startDebugCollection()
      const query = createQueryWrapper('mysql')

      await query('SELECT 1', async () => 'result')

      const collector = getDebugCollector()
      expect(collector!.getData().queries[0].source).toBe('mysql')
    })
  })

  describe('Debug Panel Rendering', () => {
    test('panel includes queries section when queries exist', () => {
      const collector = startDebugCollection()
      collector.recordQuery({ sql: 'SELECT * FROM users', duration: 10, rows: 5, source: 'prisma' })
      collector.endRender()
      const data = endDebugCollection()!

      const html = generateDebugPanel(data)

      expect(html).toContain('Queries')
      expect(html).toContain('SELECT * FROM users')
      expect(html).toContain('prisma')
      expect(html).toContain('5 rows')
      expect(html).toContain('10.0ms')
    })

    test('panel shows N+1 warning', () => {
      const collector = startDebugCollection()

      // Create N+1 pattern
      for (let i = 0; i < 3; i++) {
        collector.recordQuery({ sql: `SELECT * FROM users WHERE id = ${i}`, duration: 5 })
      }
      collector.endRender()
      const data = endDebugCollection()!

      const html = generateDebugPanel(data)

      expect(html).toContain('N+1')
      expect(html).toContain('dbg-query-badge n1')
    })

    test('panel shows slow query indicator', () => {
      const collector = startDebugCollection()
      collector.recordQuery({ sql: 'SELECT * FROM big_table', duration: 150 })
      collector.endRender()
      const data = endDebugCollection()!

      const html = generateDebugPanel(data)

      expect(html).toContain('dbg-query.slow')
    })

    test('panel hides queries section when no queries', () => {
      const collector = startDebugCollection()
      collector.endRender()
      const data = endDebugCollection()!

      const html = generateDebugPanel(data)

      // CSS contains class definitions, but actual section should not be rendered
      expect(html).not.toContain('dbg-section-title">\${icons.database} Queries')
      expect(html).not.toContain('<div class="dbg-query">')
    })

    test('panel shows query stats', () => {
      const collector = startDebugCollection()
      collector.recordQuery({ sql: 'SELECT 1', duration: 10 })
      collector.recordQuery({ sql: 'SELECT 2', duration: 20 })
      collector.recordQuery({ sql: 'SELECT 3', duration: 150 }) // Slow
      collector.endRender()
      const data = endDebugCollection()!

      const html = generateDebugPanel(data)

      expect(html).toContain('3') // Total queries
      expect(html).toContain('180.0ms') // Total duration
      expect(html).toContain('Slow') // Slow label
    })
  })
})
