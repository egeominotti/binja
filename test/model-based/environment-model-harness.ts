import { expect } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Environment } from '../../src'

export const FILTER_NAMES = ['model_filter_0', 'model_filter_1', 'model_filter_2'] as const
export const GLOBAL_NAMES = ['model_global_0', 'model_global_1', 'model_global_2'] as const
export const ROUTE_NAMES = ['model_route_0', 'model_route_1', 'model_route_2'] as const
export const TEMPLATE_NAMES = [
  'alpha.html',
  'beta.html',
  'gamma.html',
  'delta.html',
  'epsilon.html',
] as const

export interface EnvironmentModel {
  cachedVersions: Map<string, number>
  filters: Map<string, number>
  globals: Map<string, number>
  hits: number
  keys: string[]
  maxSize: number
  misses: number
  routes: Map<string, string>
  versions: number[]
}

export class RealEnvironment {
  readonly env: Environment
  private readonly directory: string

  private constructor(maxSize: number) {
    this.directory = mkdtempSync(join(tmpdir(), `binja-model-${process.pid}-`))
    for (const index of TEMPLATE_NAMES.keys()) {
      this.writeTemplate(index, 0)
    }
    this.env = new Environment({
      cache: true,
      cacheMaxSize: maxSize,
      templates: this.directory,
    })
  }

  static create(maxSize: number): RealEnvironment {
    return new RealEnvironment(maxSize)
  }

  dispose(): void {
    rmSync(this.directory, { force: true, recursive: true })
  }

  writeTemplate(slot: number, version: number): void {
    writeFileSync(
      join(this.directory, TEMPLATE_NAMES[slot]!),
      `template-${slot}-v${version}:{{ value }}`
    )
  }

  async assertConsistent(model: EnvironmentModel): Promise<void> {
    await this.assertCacheConsistent(model)
    this.assertFilesystemConsistent(model)
    await this.assertRegistrationsConsistent(model)
  }

  private async assertCacheConsistent(model: EnvironmentModel): Promise<void> {
    const stats = this.env.cacheStats()
    const total = model.hits + model.misses
    const expectedHitRate = total === 0 ? 0 : (model.hits / total) * 100

    expect(new Set(model.keys).size, 'model LRU keys are unique').toBe(model.keys.length)
    expect(
      new Set(model.cachedVersions.keys()),
      'cached template versions have exactly the LRU membership'
    ).toEqual(new Set(model.keys))
    expect(model.keys.length, 'model cache stays within its bound').toBeLessThanOrEqual(
      model.maxSize
    )
    expect(stats.size, 'real cache size matches the model').toBe(model.keys.length)
    expect(stats.maxSize, 'configured cache bound is stable').toBe(model.maxSize)
    expect(stats.hits, 'real cache hits match the model').toBe(model.hits)
    expect(stats.misses, 'real cache misses match the model').toBe(model.misses)
    expect(stats.hits + stats.misses, 'all file-template accesses are conserved').toBe(total)
    expect(stats.hitRate, 'hit rate is derived from the modeled counters').toBe(expectedHitRate)
  }

  private assertFilesystemConsistent(model: EnvironmentModel): void {
    for (const [slot, version] of model.versions.entries()) {
      const source = readFileSync(join(this.directory, TEMPLATE_NAMES[slot]!), 'utf8')
      expect(source, `filesystem version for ${TEMPLATE_NAMES[slot]}`).toBe(
        `template-${slot}-v${version}:{{ value }}`
      )
    }
  }

  private async assertRegistrationsConsistent(model: EnvironmentModel): Promise<void> {
    for (const name of GLOBAL_NAMES) {
      const expected = model.globals.get(name)
      const output = await this.env.renderString(`{{ ${name} }}`)
      expect(output, `global registration ${name}`).toBe(
        expected === undefined ? '' : `${expected}`
      )
    }

    for (const [name, factor] of model.filters) {
      const output = await this.env.renderString(`{{ 7|${name} }}`)
      expect(output, `filter registration ${name}`).toBe(`${7 * factor}`)
    }

    for (const [name, pattern] of model.routes) {
      const output = await this.env.renderString(`{% url '${name}' route_value %}`, {
        route_value: 'a b',
      })
      expect(output, `URL registration ${name}`).toBe(pattern.replace(':id', 'a%20b'))
    }

    // Registry probes use renderString and must be observational only with
    // respect to the file-template cache.
    const stats = this.env.cacheStats()
    expect(stats.hits, 'registry probes do not create cache hits').toBe(model.hits)
    expect(stats.misses, 'registry probes do not create cache misses').toBe(model.misses)
  }
}
