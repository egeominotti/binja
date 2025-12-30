/**
 * ORM Integrations for Query Telemetry
 *
 * Provides helpers for Prisma, Drizzle, and Bun SQL
 */

import { getDebugCollector } from './collector'
import type { QueryInfo } from './collector'

type QueryInput = Omit<QueryInfo, 'timestamp' | 'isN1'>

/**
 * Record a query manually (works with any database)
 */
export function recordQuery(query: QueryInput): void {
  const collector = getDebugCollector()
  if (collector) {
    collector.recordQuery(query)
  }
}

// ==================== Prisma Integration ====================

/**
 * Create Prisma middleware for query telemetry
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client'
 * import { createPrismaMiddleware } from 'binja/debug'
 *
 * const prisma = new PrismaClient()
 * prisma.$use(createPrismaMiddleware())
 * ```
 */
export function createPrismaMiddleware() {
  return async (params: any, next: (params: any) => Promise<any>) => {
    const collector = getDebugCollector()
    const start = performance.now()

    const result = await next(params)

    const duration = performance.now() - start

    if (collector) {
      const sql = `${params.action} ${params.model}`
      collector.recordQuery({
        sql,
        params: params.args ? [JSON.stringify(params.args)] : undefined,
        duration,
        rows: Array.isArray(result) ? result.length : (result ? 1 : 0),
        source: 'prisma',
      })
    }

    return result
  }
}

/**
 * Setup Prisma query event logging
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client'
 * import { setupPrismaLogging } from 'binja/debug'
 *
 * const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] })
 * setupPrismaLogging(prisma)
 * ```
 */
export function setupPrismaLogging(prisma: any): void {
  prisma.$on('query', (e: any) => {
    const collector = getDebugCollector()
    if (collector) {
      collector.recordQuery({
        sql: e.query,
        params: e.params ? JSON.parse(e.params) : undefined,
        duration: e.duration,
        source: 'prisma',
      })
    }
  })
}

// ==================== Drizzle Integration ====================

/**
 * Create Drizzle logger for query telemetry
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-orm/...'
 * import { createDrizzleLogger } from 'binja/debug'
 *
 * const db = drizzle(client, { logger: createDrizzleLogger() })
 * ```
 */
export function createDrizzleLogger() {
  return {
    logQuery(query: string, params: unknown[]): void {
      const collector = getDebugCollector()
      if (collector) {
        // Note: Drizzle logger doesn't provide timing
        // For accurate timing, use wrapDrizzleQuery instead
        collector.recordQuery({
          sql: query,
          params: params as any[],
          duration: 0, // Will be updated if using wrapper
          source: 'drizzle',
        })
      }
    }
  }
}

/**
 * Wrap a Drizzle query for accurate timing
 *
 * @example
 * ```typescript
 * import { wrapDrizzleQuery } from 'binja/debug'
 *
 * const users = await wrapDrizzleQuery(
 *   db.select().from(usersTable).where(eq(usersTable.id, 1))
 * )
 * ```
 */
export async function wrapDrizzleQuery<T>(
  query: Promise<T>,
  sql?: string
): Promise<T> {
  const collector = getDebugCollector()
  const start = performance.now()

  const result = await query

  const duration = performance.now() - start

  if (collector) {
    collector.recordQuery({
      sql: sql || 'Drizzle Query',
      duration,
      rows: Array.isArray(result) ? result.length : (result ? 1 : 0),
      source: 'drizzle',
    })
  }

  return result
}

// ==================== Bun SQL Integration ====================

/**
 * Wrap Bun SQL database for query telemetry
 *
 * @example
 * ```typescript
 * import { Database } from 'bun:sqlite'
 * import { wrapBunSQL } from 'binja/debug'
 *
 * const db = wrapBunSQL(new Database('mydb.sqlite'))
 * ```
 */
export function wrapBunSQL<T extends object>(db: T): T {
  const handler: ProxyHandler<T> = {
    get(target, prop) {
      const value = (target as any)[prop]

      if (typeof value === 'function') {
        // Wrap query methods
        if (prop === 'query' || prop === 'run' || prop === 'prepare') {
          return function(...args: any[]) {
            const collector = getDebugCollector()
            const sql = typeof args[0] === 'string' ? args[0] : 'SQL Query'
            const start = performance.now()

            const result = value.apply(target, args)

            // Handle prepared statements
            if (result && typeof result.all === 'function') {
              return wrapPreparedStatement(result, sql)
            }

            const duration = performance.now() - start

            if (collector) {
              collector.recordQuery({
                sql,
                params: args.slice(1),
                duration,
                rows: Array.isArray(result) ? result.length : undefined,
                source: 'bun:sqlite',
              })
            }

            return result
          }
        }
      }

      return value
    }
  }

  return new Proxy(db, handler)
}

/**
 * Wrap a Bun SQL prepared statement
 */
function wrapPreparedStatement(stmt: any, sql: string): any {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      const value = target[prop]

      if (typeof value === 'function' && (prop === 'all' || prop === 'get' || prop === 'run')) {
        return function(...args: any[]) {
          const collector = getDebugCollector()
          const start = performance.now()

          const result = value.apply(target, args)

          const duration = performance.now() - start

          if (collector) {
            collector.recordQuery({
              sql,
              params: args,
              duration,
              rows: Array.isArray(result) ? result.length : (result ? 1 : 0),
              source: 'bun:sqlite',
            })
          }

          return result
        }
      }

      return value
    }
  }

  return new Proxy(stmt, handler)
}

// ==================== Generic SQL Wrapper ====================

/**
 * Wrap any async query function for timing
 *
 * @example
 * ```typescript
 * import { wrapQuery } from 'binja/debug'
 *
 * const result = await wrapQuery(
 *   'SELECT * FROM users WHERE id = ?',
 *   () => db.query('SELECT * FROM users WHERE id = ?', [1])
 * )
 * ```
 */
export async function wrapQuery<T>(
  sql: string,
  queryFn: () => Promise<T>,
  source = 'sql'
): Promise<T> {
  const collector = getDebugCollector()
  const start = performance.now()

  const result = await queryFn()

  const duration = performance.now() - start

  if (collector) {
    collector.recordQuery({
      sql,
      duration,
      rows: Array.isArray(result) ? result.length : (result ? 1 : 0),
      source,
    })
  }

  return result
}

/**
 * Create a query wrapper for any database client
 *
 * @example
 * ```typescript
 * import { createQueryWrapper } from 'binja/debug'
 *
 * const query = createQueryWrapper('mysql')
 * const users = await query('SELECT * FROM users', () => mysql.query('SELECT * FROM users'))
 * ```
 */
export function createQueryWrapper(source: string) {
  return <T>(sql: string, queryFn: () => Promise<T>): Promise<T> => {
    return wrapQuery(sql, queryFn, source)
  }
}
