interface AdapterCache {
  clearCache(): void
  cacheKeys(): string[]
}

/** Track live adapter instances without retaining their caches or root names. */
export class CacheRegistry {
  private readonly entries = new Set<WeakRef<AdapterCache>>()
  private readonly finalizer = new FinalizationRegistry<WeakRef<AdapterCache>>((entry) => {
    this.entries.delete(entry)
  })
  private sweep?: Iterator<WeakRef<AdapterCache>>

  add(cache: AdapterCache): void {
    // Bound registration work even when many live apps share this registry.
    // Opportunistic pruning complements finalization, whose timing is unspecified.
    this.sweep ??= this.entries.values()
    for (let i = 0; i < 8; i++) {
      const next = this.sweep.next()
      if (next.done) {
        this.sweep = undefined
        break
      }
      if (!next.value.deref()) this.remove(next.value)
    }
    const entry = new WeakRef(cache)
    this.entries.add(entry)
    this.finalizer.register(cache, entry, entry)
  }

  private remove(entry: WeakRef<AdapterCache>): void {
    this.entries.delete(entry)
    this.finalizer.unregister(entry)
  }

  clear(): void {
    for (const entry of this.entries) {
      const cache = entry.deref()
      if (cache) cache.clearCache()
      else this.remove(entry)
    }
  }

  stats(): { size: number; keys: string[] } {
    const keys: string[] = []
    for (const entry of this.entries) {
      const cache = entry.deref()
      if (cache) keys.push(...cache.cacheKeys())
      else this.remove(entry)
    }
    return { size: keys.length, keys }
  }
}
