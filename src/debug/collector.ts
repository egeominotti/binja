/**
 * Debug Collector - Tracks rendering information for the debug panel
 */

export interface TemplateInfo {
  name: string
  type: 'root' | 'extends' | 'include'
  parent?: string
  renderTime?: number
}

export interface FilterUsage {
  name: string
  count: number
}

export interface ContextValue {
  type: string
  preview: string
  value: any
  expandable: boolean
  children?: Record<string, ContextValue>
}

export interface QueryInfo {
  /** SQL query or operation name */
  sql: string
  /** Query parameters */
  params?: any[]
  /** Duration in milliseconds */
  duration: number
  /** Number of rows returned */
  rows?: number
  /** Source ORM (drizzle, prisma, etc.) */
  source?: string
  /** Timestamp when query was executed */
  timestamp: number
  /** Whether this query was detected as part of N+1 */
  isN1?: boolean
}

export interface QueryStats {
  /** Total number of queries */
  count: number
  /** Total duration of all queries */
  totalDuration: number
  /** Number of slow queries (> 100ms) */
  slowCount: number
  /** Number of N+1 queries detected */
  n1Count: number
  /** Queries grouped by similar SQL for N+1 detection */
  queryCounts: Map<string, number>
}

export interface DebugData {
  // Timing
  startTime: number
  endTime?: number
  totalTime?: number
  lexerTime?: number
  parserTime?: number
  renderTime?: number

  // Template info
  templateChain: TemplateInfo[]
  rootTemplate?: string

  // Mode
  mode: 'runtime' | 'aot'
  isAsync: boolean

  // Context
  contextKeys: string[]
  contextSnapshot: Record<string, ContextValue>

  // Filters & Tests
  filtersUsed: Map<string, number>
  testsUsed: Map<string, number>

  // Cache
  cacheHits: number
  cacheMisses: number

  // Database Queries
  queries: QueryInfo[]
  queryStats: QueryStats

  // Warnings
  warnings: string[]
}

export class DebugCollector {
  private data: DebugData

  constructor() {
    this.data = {
      startTime: performance.now(),
      templateChain: [],
      mode: 'runtime',
      isAsync: false,
      contextKeys: [],
      contextSnapshot: {},
      filtersUsed: new Map(),
      testsUsed: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      queries: [],
      queryStats: {
        count: 0,
        totalDuration: 0,
        slowCount: 0,
        n1Count: 0,
        queryCounts: new Map(),
      },
      warnings: [],
    }
  }

  // Timing
  startLexer(): void {
    (this.data as any)._lexerStart = performance.now()
  }

  endLexer(): void {
    if ((this.data as any)._lexerStart) {
      this.data.lexerTime = performance.now() - (this.data as any)._lexerStart
    }
  }

  startParser(): void {
    (this.data as any)._parserStart = performance.now()
  }

  endParser(): void {
    if ((this.data as any)._parserStart) {
      this.data.parserTime = performance.now() - (this.data as any)._parserStart
    }
  }

  startRender(): void {
    (this.data as any)._renderStart = performance.now()
  }

  endRender(): void {
    if ((this.data as any)._renderStart) {
      this.data.renderTime = performance.now() - (this.data as any)._renderStart
    }
    this.data.endTime = performance.now()
    this.data.totalTime = this.data.endTime - this.data.startTime
  }

  // Template chain
  addTemplate(name: string, type: 'root' | 'extends' | 'include', parent?: string): void {
    this.data.templateChain.push({ name, type, parent })
    if (type === 'root') {
      this.data.rootTemplate = name
    }
  }

  // Mode
  setMode(mode: 'runtime' | 'aot'): void {
    this.data.mode = mode
  }

  setAsync(isAsync: boolean): void {
    this.data.isAsync = isAsync
  }

  // Context
  captureContext(context: Record<string, any>): void {
    this.data.contextKeys = Object.keys(context)
    for (const [key, value] of Object.entries(context)) {
      this.data.contextSnapshot[key] = this.captureValue(value)
    }
  }

  private captureValue(value: any, depth = 0): ContextValue {
    const type = this.getType(value)
    const preview = this.getPreview(value)
    const expandable = this.isExpandable(value)

    const result: ContextValue = { type, preview, value, expandable }

    // Capture children for expandable types (limit depth to avoid circular refs)
    if (expandable && depth < 3) {
      result.children = {}
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          result.children![String(i)] = this.captureValue(item, depth + 1)
        })
      } else if (typeof value === 'object' && value !== null) {
        for (const [k, v] of Object.entries(value)) {
          result.children![k] = this.captureValue(v, depth + 1)
        }
      }
    }

    return result
  }

  private isExpandable(value: any): boolean {
    if (value === null || value === undefined) return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return false
  }

  private getType(value: any): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (Array.isArray(value)) return `Array(${value.length})`
    if (value instanceof Date) return 'Date'
    if (typeof value === 'object') return 'Object'
    return typeof value
  }

  private getPreview(value: any, maxLen = 50): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') {
      return value.length > maxLen ? `"${value.slice(0, maxLen)}..."` : `"${value}"`
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]'
      if (value.length <= 3) {
        const items = value.map(v => this.getPreview(v, 15)).join(', ')
        return `[${items}]`
      }
      return `[${this.getPreview(value[0], 15)}, ... +${value.length - 1}]`
    }
    if (value instanceof Date) {
      return value.toISOString()
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 0) return '{}'
      if (keys.length <= 2) {
        return `{ ${keys.join(', ')} }`
      }
      return `{ ${keys.slice(0, 2).join(', ')}, ... +${keys.length - 2} }`
    }
    if (typeof value === 'function') {
      return 'function()'
    }
    return String(value)
  }

  // Filters & Tests
  recordFilter(name: string): void {
    this.data.filtersUsed.set(name, (this.data.filtersUsed.get(name) || 0) + 1)
  }

  recordTest(name: string): void {
    this.data.testsUsed.set(name, (this.data.testsUsed.get(name) || 0) + 1)
  }

  // Cache
  recordCacheHit(): void {
    this.data.cacheHits++
  }

  recordCacheMiss(): void {
    this.data.cacheMisses++
  }

  // Warnings
  addWarning(message: string): void {
    this.data.warnings.push(message)
  }

  // Database Queries
  /**
   * Record a database query for telemetry
   * @param query Query information
   */
  recordQuery(query: Omit<QueryInfo, 'timestamp' | 'isN1'>): void {
    const normalizedSql = this.normalizeQuery(query.sql)
    const currentCount = this.data.queryStats.queryCounts.get(normalizedSql) || 0
    this.data.queryStats.queryCounts.set(normalizedSql, currentCount + 1)

    // Detect N+1: same query pattern executed > 2 times
    const isN1 = currentCount >= 2

    const queryInfo: QueryInfo = {
      ...query,
      timestamp: performance.now(),
      isN1,
    }

    this.data.queries.push(queryInfo)

    // Update stats
    this.data.queryStats.count++
    this.data.queryStats.totalDuration += query.duration

    if (query.duration > 100) {
      this.data.queryStats.slowCount++
    }

    if (isN1 && currentCount === 2) {
      // Only count N+1 once per pattern
      this.data.queryStats.n1Count++
      this.addWarning(`N+1 query detected: ${normalizedSql.slice(0, 50)}...`)
    }
  }

  /**
   * Normalize SQL query for comparison (removes specific values)
   */
  private normalizeQuery(sql: string): string {
    return sql
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/= \?/g, '= ?')        // Normalize params
      .replace(/= \$\d+/g, '= ?')     // Normalize Postgres params
      .replace(/= '\w+'/g, "= '?'")   // Normalize string literals
      .replace(/= \d+/g, '= ?')       // Normalize numbers
      .replace(/IN \([^)]+\)/gi, 'IN (?)') // Normalize IN clauses
      .trim()
  }

  /**
   * Get query statistics
   */
  getQueryStats(): QueryStats {
    return this.data.queryStats
  }

  // Get collected data
  getData(): DebugData {
    return this.data
  }

  // Get summary
  getSummary(): {
    totalTime: number
    templateCount: number
    filterCount: number
    mode: string
  } {
    return {
      totalTime: this.data.totalTime || 0,
      templateCount: this.data.templateChain.length,
      filterCount: this.data.filtersUsed.size,
      mode: this.data.mode,
    }
  }
}

// Global debug collector for current render
let currentCollector: DebugCollector | null = null

export function startDebugCollection(): DebugCollector {
  currentCollector = new DebugCollector()
  return currentCollector
}

export function getDebugCollector(): DebugCollector | null {
  return currentCollector
}

export function endDebugCollection(): DebugData | null {
  if (currentCollector) {
    const data = currentCollector.getData()
    currentCollector = null
    return data
  }
  return null
}
