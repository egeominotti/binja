import { expect } from 'bun:test'
import type { Arbitrary, AsyncCommand } from 'fast-check'
import fc from 'fast-check'
import { EnvironmentCommand } from './environment-command'
import {
  FILTER_NAMES,
  GLOBAL_NAMES,
  type EnvironmentModel,
  type RealEnvironment,
  ROUTE_NAMES,
  TEMPLATE_NAMES,
} from './environment-model-harness'

class RenderTemplateCommand extends EnvironmentCommand {
  constructor(
    private readonly slot: number,
    private readonly value: number
  ) {
    super()
  }

  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    const name = TEMPLATE_NAMES[this.slot]!
    const position = model.keys.indexOf(name)

    if (position === -1) {
      model.misses++
      if (model.keys.length === model.maxSize) {
        const evicted = model.keys.shift()!
        model.cachedVersions.delete(evicted)
      }
      model.cachedVersions.set(name, model.versions[this.slot]!)
    } else {
      model.hits++
      model.keys.splice(position, 1)
    }
    model.keys.push(name)

    const output = await real.env.render(name, { value: this.value })
    expect(output, `rendered output for ${name}`).toBe(
      `template-${this.slot}-v${model.cachedVersions.get(name)}:${this.value}`
    )
    await this.verify(model, real)
  }

  toString(): string {
    return `render(${TEMPLATE_NAMES[this.slot]}, value=${this.value})`
  }
}

class ClearCacheCommand extends EnvironmentCommand {
  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    model.hits = 0
    model.keys = []
    model.misses = 0
    model.cachedVersions.clear()
    real.env.clearCache()
    await this.verify(model, real)
  }

  toString(): string {
    return 'clearCache()'
  }
}

class RewriteTemplateCommand extends EnvironmentCommand {
  constructor(private readonly slot: number) {
    super()
  }

  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    const version = ++model.versions[this.slot]!
    real.writeTemplate(this.slot, version)
    await this.verify(model, real)
  }

  toString(): string {
    return `rewrite(${TEMPLATE_NAMES[this.slot]})`
  }
}

class RenderStringCommand extends EnvironmentCommand {
  constructor(private readonly value: number) {
    super()
  }

  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    const before = { ...real.env.cacheStats() }
    const output = await real.env.renderString('inline={{ value }}', { value: this.value })
    expect(output).toBe(`inline=${this.value}`)
    expect(real.env.cacheStats(), 'renderString never mutates the file-template cache').toEqual(
      before
    )
    await this.verify(model, real)
  }

  toString(): string {
    return `renderString(value=${this.value})`
  }
}

class AddGlobalCommand extends EnvironmentCommand {
  constructor(
    private readonly slot: number,
    private readonly value: number
  ) {
    super()
  }

  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    const name = GLOBAL_NAMES[this.slot]!
    model.globals.set(name, this.value)
    real.env.addGlobal(name, this.value)
    await this.verify(model, real)
  }

  toString(): string {
    return `addGlobal(${GLOBAL_NAMES[this.slot]}, ${this.value})`
  }
}

class RenderGlobalCommand extends EnvironmentCommand {
  constructor(
    private readonly slot: number,
    private readonly override: boolean,
    private readonly value: number
  ) {
    super()
  }

  check(model: Readonly<EnvironmentModel>): boolean {
    return model.globals.has(GLOBAL_NAMES[this.slot]!)
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    const name = GLOBAL_NAMES[this.slot]!
    const context = this.override ? { [name]: this.value } : {}
    const output = await real.env.renderString(`{{ ${name} }}`, context)
    const expected = this.override ? this.value : model.globals.get(name)
    expect(output, `context precedence for ${name}`).toBe(`${expected}`)
    await this.verify(model, real)
  }

  toString(): string {
    return `renderGlobal(${GLOBAL_NAMES[this.slot]}, ${this.override ? `override=${this.value}` : 'default'})`
  }
}

class AddFilterCommand extends EnvironmentCommand {
  constructor(
    private readonly slot: number,
    private readonly factor: number
  ) {
    super()
  }

  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    const name = FILTER_NAMES[this.slot]!
    model.filters.set(name, this.factor)
    real.env.addFilter(name, (value) => Number(value) * this.factor)
    await this.verify(model, real)
  }

  toString(): string {
    return `addFilter(${FILTER_NAMES[this.slot]}, factor=${this.factor})`
  }
}

class RenderFilterCommand extends EnvironmentCommand {
  constructor(
    private readonly slot: number,
    private readonly value: number
  ) {
    super()
  }

  check(model: Readonly<EnvironmentModel>): boolean {
    return model.filters.has(FILTER_NAMES[this.slot]!)
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    const name = FILTER_NAMES[this.slot]!
    const output = await real.env.renderString(`{{ value|${name} }}`, { value: this.value })
    expect(output).toBe(`${this.value * model.filters.get(name)!}`)
    await this.verify(model, real)
  }

  toString(): string {
    return `renderFilter(${FILTER_NAMES[this.slot]}, value=${this.value})`
  }
}

class AddUrlCommand extends EnvironmentCommand {
  constructor(
    private readonly slot: number,
    private readonly version: number
  ) {
    super()
  }

  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    const name = ROUTE_NAMES[this.slot]!
    const pattern = `/model/${this.version}/:id/`
    model.routes.set(name, pattern)
    real.env.addUrl(name, pattern)
    await this.verify(model, real)
  }

  toString(): string {
    return `addUrl(${ROUTE_NAMES[this.slot]}, version=${this.version})`
  }
}

class RenderUrlCommand extends EnvironmentCommand {
  constructor(
    private readonly slot: number,
    private readonly id: number
  ) {
    super()
  }

  check(model: Readonly<EnvironmentModel>): boolean {
    return model.routes.has(ROUTE_NAMES[this.slot]!)
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    const name = ROUTE_NAMES[this.slot]!
    const output = await real.env.renderString(`{% url '${name}' id %}`, { id: this.id })
    expect(output).toBe(model.routes.get(name)!.replace(':id', `${this.id}`))
    await this.verify(model, real)
  }

  toString(): string {
    return `renderUrl(${ROUTE_NAMES[this.slot]}, id=${this.id})`
  }
}

export function environmentCommandArbitraries(): Arbitrary<
  AsyncCommand<EnvironmentModel, RealEnvironment>
>[] {
  const filterSlot = fc.integer({ min: 0, max: FILTER_NAMES.length - 1 })
  const globalSlot = fc.integer({ min: 0, max: GLOBAL_NAMES.length - 1 })
  const routeSlot = fc.integer({ min: 0, max: ROUTE_NAMES.length - 1 })
  const value = fc.integer({ min: -1000, max: 1000 })

  return [
    fc
      .tuple(fc.integer({ min: 0, max: TEMPLATE_NAMES.length - 1 }), value)
      .map(([slot, item]) => new RenderTemplateCommand(slot, item)),
    fc.constant(new ClearCacheCommand()),
    fc
      .integer({ min: 0, max: TEMPLATE_NAMES.length - 1 })
      .map((slot) => new RewriteTemplateCommand(slot)),
    value.map((item) => new RenderStringCommand(item)),
    fc.tuple(globalSlot, value).map(([slot, item]) => new AddGlobalCommand(slot, item)),
    fc
      .tuple(globalSlot, fc.boolean(), value)
      .map(([slot, override, item]) => new RenderGlobalCommand(slot, override, item)),
    fc
      .tuple(filterSlot, fc.integer({ min: -5, max: 5 }))
      .map(([slot, factor]) => new AddFilterCommand(slot, factor)),
    fc.tuple(filterSlot, value).map(([slot, item]) => new RenderFilterCommand(slot, item)),
    fc
      .tuple(routeSlot, fc.integer({ min: 0, max: 20 }))
      .map(([slot, version]) => new AddUrlCommand(slot, version)),
    fc.tuple(routeSlot, value).map(([slot, id]) => new RenderUrlCommand(slot, id)),
  ]
}
