/**
 * Framework Adapters for binja
 * Seamless integration with popular Bun frameworks
 */

export {
  binja as honoAdapter,
  clearCache as honoClearCache,
  getCacheStats as honoGetCacheStats,
  type BinjaHonoOptions,
} from './hono'

export {
  binja as elysiaAdapter,
  clearCache as elysiaClearCache,
  getCacheStats as elysiaGetCacheStats,
  type BinjaElysiaOptions,
} from './elysia'
