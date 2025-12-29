/**
 * Template execution context
 * Manages variable scope and provides DTL-compatible forloop object
 */

export interface ForLoop {
  counter: number      // 1-indexed (DTL)
  counter0: number     // 0-indexed (DTL)
  revcounter: number   // reverse counter (DTL)
  revcounter0: number  // reverse counter 0-indexed (DTL)
  first: boolean
  last: boolean
  length: number
  // Jinja2 compatibility
  index: number        // same as counter (Jinja2)
  index0: number       // same as counter0 (Jinja2)
  revindex: number     // same as revcounter (Jinja2)
  revindex0: number    // same as revcounter0 (Jinja2)
  depth: number        // nesting depth
  depth0: number       // nesting depth 0-indexed
  cycle: (...args: any[]) => any
  changed: (value: any) => boolean
  previtem?: any
  nextitem?: any
}

export class Context {
  private scopes: Map<string, any>[] = []
  private parent: Context | null = null
  private _forloopStack: ForLoop[] = []
  private _lastCycleValue: any = null

  constructor(data: Record<string, any> = {}, parent: Context | null = null) {
    this.parent = parent
    this.scopes.push(new Map(Object.entries(data)))
  }

  get(name: string): any {
    // Special variables
    if (name === 'forloop' || name === 'loop') {
      return this._forloopStack[this._forloopStack.length - 1] || null
    }

    // Search in current scopes (innermost first)
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) {
        return this.scopes[i].get(name)
      }
    }

    // Search in parent context
    if (this.parent) {
      return this.parent.get(name)
    }

    return undefined
  }

  set(name: string, value: any): void {
    this.scopes[this.scopes.length - 1].set(name, value)
  }

  has(name: string): boolean {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) return true
    }
    return this.parent ? this.parent.has(name) : false
  }

  push(data: Record<string, any> = {}): void {
    this.scopes.push(new Map(Object.entries(data)))
  }

  pop(): void {
    if (this.scopes.length > 1) {
      this.scopes.pop()
    }
  }

  derived(data: Record<string, any> = {}): Context {
    return new Context(data, this)
  }

  // ForLoop management
  pushForLoop(items: any[], index: number): ForLoop {
    const length = items.length
    const depth = this._forloopStack.length + 1

    const forloop: ForLoop = {
      // DTL style
      counter: index + 1,
      counter0: index,
      revcounter: length - index,
      revcounter0: length - index - 1,
      first: index === 0,
      last: index === length - 1,
      length,
      // Jinja2 style aliases
      index: index + 1,
      index0: index,
      revindex: length - index,
      revindex0: length - index - 1,
      depth,
      depth0: depth - 1,
      // Helpers
      previtem: index > 0 ? items[index - 1] : undefined,
      nextitem: index < length - 1 ? items[index + 1] : undefined,
      cycle: (...args: any[]) => args[index % args.length],
      changed: (value: any) => {
        const changed = value !== this._lastCycleValue
        this._lastCycleValue = value
        return changed
      },
    }

    // Parent loop reference (DTL)
    if (this._forloopStack.length > 0) {
      (forloop as any).parentloop = this._forloopStack[this._forloopStack.length - 1]
    }

    this._forloopStack.push(forloop)
    return forloop
  }

  popForLoop(): void {
    this._forloopStack.pop()
  }

  updateForLoop(index: number, items: any[]): void {
    const forloop = this._forloopStack[this._forloopStack.length - 1]
    if (!forloop) return

    const length = items.length
    forloop.counter = index + 1
    forloop.counter0 = index
    forloop.revcounter = length - index
    forloop.revcounter0 = length - index - 1
    forloop.first = index === 0
    forloop.last = index === length - 1
    forloop.index = index + 1
    forloop.index0 = index
    forloop.revindex = length - index
    forloop.revindex0 = length - index - 1
    forloop.previtem = index > 0 ? items[index - 1] : undefined
    forloop.nextitem = index < length - 1 ? items[index + 1] : undefined
  }

  // Get all data as plain object
  toObject(): Record<string, any> {
    const result: Record<string, any> = {}

    // Start with parent data
    if (this.parent) {
      Object.assign(result, this.parent.toObject())
    }

    // Merge all scopes
    for (const scope of this.scopes) {
      for (const [key, value] of scope) {
        result[key] = value
      }
    }

    return result
  }
}
