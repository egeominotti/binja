/**
 * Template execution context
 * Manages variable scope and provides DTL-compatible forloop object
 *
 * Scopes use null-prototype objects so template names never resolve through
 * Object.prototype.
 */

import { isSafePropertyKey } from '../security'

export interface ForLoop {
  counter: number // 1-indexed (DTL)
  counter0: number // 0-indexed (DTL)
  revcounter: number // reverse counter (DTL)
  revcounter0: number // reverse counter 0-indexed (DTL)
  first: boolean
  last: boolean
  length: number
  // Jinja2 compatibility
  index: number // same as counter (Jinja2)
  index0: number // same as counter0 (Jinja2)
  revindex: number // same as revcounter (Jinja2)
  revindex0: number // same as revcounter0 (Jinja2)
  depth: number // nesting depth
  depth0: number // nesting depth 0-indexed
  cycle: (...args: any[]) => any
  changed: (value: any) => boolean
  parentloop?: ForLoop
  previtem?: any
  nextitem?: any
}

// Internal forloop state for lazy getters
interface ForLoopInternal extends ForLoop {
  _items: any[]
  _idx: number
}

// Optimized ForLoop object with lazy getters and dynamic cycle function
function createForLoop(
  items: any[],
  index: number,
  depth: number,
  changedState: { initialized: boolean; value: any },
  parentloop?: ForLoop
): ForLoopInternal {
  const length = items.length
  const revCount = length - index
  const forloop = {
    // Internal state for lazy getters
    _items: items,
    _idx: index,
    // Core properties (always accessed)
    counter: index + 1,
    counter0: index,
    first: index === 0,
    last: index === length - 1,
    length,
    index: index + 1,
    index0: index,
    depth,
    depth0: depth - 1,
    // Reverse counters (less common)
    revcounter: revCount,
    revcounter0: revCount - 1,
    revindex: revCount,
    revindex0: revCount - 1,
    // Item references (lazy via getter - reads from internal state)
    get previtem() {
      return this._idx > 0 ? this._items[this._idx - 1] : undefined
    },
    get nextitem() {
      return this._idx < this._items.length - 1 ? this._items[this._idx + 1] : undefined
    },
    // Optimized: cycle uses dynamic _idx, avoiding function recreation per iteration
    cycle(...args: any[]) {
      return args[this._idx % args.length]
    },
    changed: (value: any) => {
      const changed = !changedState.initialized || value !== changedState.value
      changedState.initialized = true
      changedState.value = value
      return changed
    },
  } as ForLoopInternal

  if (parentloop) {
    forloop.parentloop = parentloop
  }

  return forloop
}

export class Context {
  // Null-prototype scopes avoid inherited names such as constructor/toString.
  private scopes: Record<string, any>[] = []
  private parent: Context | null = null
  private _forloopStack: ForLoop[] = []
  // Cache for current forloop (hot path optimization)
  private _currentForloop: ForLoop | null = null
  // Cache the current scope used by set() operations.
  private _currentScope: Record<string, any>
  // Cache the nearest scope index for each resolved name. A fresh cache is used
  // at each scope depth, so shadowing and pop() restore the correct bindings.
  private _lookupCache: Record<string, number> = Object.create(null)
  private _lookupCacheStack: Array<Record<string, number>> = []

  constructor(data: Record<string, any> = {}, parent: Context | null = null) {
    this.parent = parent
    this._currentScope = Object.assign(Object.create(null), data)
    this.scopes.push(this._currentScope)
  }

  get(name: string): any {
    // Hot path: forloop access (most common in loops)
    if (name === 'forloop' || name === 'loop') {
      return this._currentForloop
    }
    if (!isSafePropertyKey(name)) return undefined

    const scopeIndex = this.resolveScope(name)
    return scopeIndex >= 0
      ? this.scopes[scopeIndex][name]
      : this.parent
        ? this.parent.get(name)
        : undefined
  }

  set(name: string, value: any): void {
    // Direct property assignment on cached current scope
    this._currentScope[name] = value
    this._lookupCache[name] = this.scopes.length - 1
  }

  has(name: string): boolean {
    if (!isSafePropertyKey(name)) return false
    return this.resolveScope(name) >= 0 || (this.parent ? this.parent.has(name) : false)
  }

  push(data: Record<string, any> = {}): void {
    this._currentScope = Object.assign(Object.create(null), data)
    this.scopes.push(this._currentScope)
    this._lookupCacheStack.push(this._lookupCache)
    this._lookupCache = Object.create(null)
  }

  pop(): void {
    if (this.scopes.length > 1) {
      this.scopes.pop()
      this._currentScope = this.scopes[this.scopes.length - 1]
      this._lookupCache = this._lookupCacheStack.pop() ?? Object.create(null)
    }
  }

  private resolveScope(name: string): number {
    const cached = this._lookupCache[name]
    if (cached !== undefined) return cached

    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (Object.hasOwn(this.scopes[i], name)) {
        this._lookupCache[name] = i
        return i
      }
    }

    this._lookupCache[name] = -1
    return -1
  }

  derived(data: Record<string, any> = {}): Context {
    return new Context(data, this)
  }

  // ForLoop management - optimized with object reuse
  pushForLoop(items: any[], index: number): ForLoop {
    const depth = this._forloopStack.length + 1
    const parentloop =
      this._forloopStack.length > 0 ? this._forloopStack[this._forloopStack.length - 1] : undefined

    // changed() state belongs to this loop, not the whole Context. Otherwise a
    // nested or later loop can inherit another loop's last value.
    const changedState = { initialized: false, value: undefined as any }
    const forloop = createForLoop(items, index, depth, changedState, parentloop)
    this._forloopStack.push(forloop)
    this._currentForloop = forloop
    return forloop
  }

  popForLoop(): void {
    this._forloopStack.pop()
    this._currentForloop =
      this._forloopStack.length > 0 ? this._forloopStack[this._forloopStack.length - 1] : null
  }

  // Optimized: minimal property updates, reuse cycle function closure
  updateForLoop(index: number, items: any[]): void {
    const forloop = this._currentForloop as ForLoopInternal | null
    if (!forloop) return

    const length = items.length
    // Update internal state for lazy getters
    forloop._idx = index
    // Note: items array doesn't change, skip reassignment if same reference
    if (forloop._items !== items) forloop._items = items

    // Only update the commonly-accessed properties
    // counter/index are by far the most used
    forloop.counter = index + 1
    forloop.counter0 = index
    forloop.index = index + 1
    forloop.index0 = index

    // first/last: compute directly instead of always storing
    forloop.first = index === 0
    forloop.last = index === length - 1

    // Reverse counters (less common, but cheap to compute)
    const revCount = length - index
    forloop.revcounter = revCount
    forloop.revcounter0 = revCount - 1
    forloop.revindex = revCount
    forloop.revindex0 = revCount - 1

    // Note: cycle function is NOT updated here - it captures _idx via closure
    // See createForLoop() where cycle uses forloop._idx dynamically
  }

  // Get all data as plain object
  toObject(): Record<string, any> {
    const result: Record<string, any> = {}

    // Start with parent data
    if (this.parent) {
      Object.assign(result, this.parent.toObject())
    }

    // Merge all scopes - now direct object spread
    for (const scope of this.scopes) {
      Object.assign(result, scope)
    }

    return result
  }
}
