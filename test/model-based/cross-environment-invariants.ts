import { expect } from 'bun:test'
import fc from 'fast-check'
import { Environment } from '../../src'
import { FILTER_NAMES, GLOBAL_NAMES } from './environment-model-harness'

const DEFAULT_RUNS = 60
const DEFAULT_OPERATIONS = 40

type Operation =
  | { environment: number; kind: 'set-global'; slot: number; value: number }
  | { environment: number; factor: number; kind: 'set-filter'; slot: number }
  | { kind: 'render-concurrently'; value: number }

interface IsolatedState {
  filters: Map<string, number>
  globals: Map<string, number>
}

export async function runCrossEnvironmentInvariantCampaign(): Promise<void> {
  const seed = optionalInteger(Bun.env.BINJA_MODEL_SEED)
  const numRuns = optionalInteger(Bun.env.BINJA_CROSS_ENV_RUNS) ?? DEFAULT_RUNS
  const maxLength = optionalInteger(Bun.env.BINJA_CROSS_ENV_COMMANDS) ?? DEFAULT_OPERATIONS

  await fc.assert(
    fc.asyncProperty(
      fc.array(operationArbitrary(), { minLength: 1, maxLength }),
      async (operations) => {
        const environments = [new Environment(), new Environment()]
        const models: IsolatedState[] = [
          { filters: new Map(), globals: new Map() },
          { filters: new Map(), globals: new Map() },
        ]

        for (const operation of operations) {
          await applyOperation(environments, models, operation)
          await assertIsolated(environments, models)
        }
      }
    ),
    {
      endOnFailure: true,
      interruptAfterTimeLimit: 30_000,
      numRuns,
      seed,
      verbose: 2,
    }
  )
}

function operationArbitrary(): fc.Arbitrary<Operation> {
  const environment = fc.integer({ min: 0, max: 1 })
  const filterSlot = fc.integer({ min: 0, max: FILTER_NAMES.length - 1 })
  const globalSlot = fc.integer({ min: 0, max: GLOBAL_NAMES.length - 1 })
  const value = fc.integer({ min: -1000, max: 1000 })

  return fc.oneof(
    {
      weight: 4,
      arbitrary: fc.record({
        environment,
        kind: fc.constant('set-global'),
        slot: globalSlot,
        value,
      }),
    },
    {
      weight: 3,
      arbitrary: fc.record({
        environment,
        factor: fc.integer({ min: -5, max: 5 }),
        kind: fc.constant('set-filter'),
        slot: filterSlot,
      }),
    },
    {
      weight: 2,
      arbitrary: value.map((item) => ({ kind: 'render-concurrently' as const, value: item })),
    }
  )
}

async function applyOperation(
  environments: Environment[],
  models: IsolatedState[],
  operation: Operation
): Promise<void> {
  if (operation.kind === 'render-concurrently') {
    const outputs = await Promise.all(
      environments.map((environment) =>
        environment.renderString('{{ value }}', { value: operation.value })
      )
    )
    expect(outputs, 'equivalent explicit contexts render equally').toEqual([
      `${operation.value}`,
      `${operation.value}`,
    ])
    return
  }

  const environment = environments[operation.environment]!
  const model = models[operation.environment]!
  if (operation.kind === 'set-global') {
    const name = GLOBAL_NAMES[operation.slot]!
    model.globals.set(name, operation.value)
    environment.addGlobal(name, operation.value)
    return
  }

  const name = FILTER_NAMES[operation.slot]!
  model.filters.set(name, operation.factor)
  environment.addFilter(name, (value) => Number(value) * operation.factor)
}

async function assertIsolated(environments: Environment[], models: IsolatedState[]): Promise<void> {
  for (let index = 0; index < environments.length; index++) {
    const environment = environments[index]!
    const own = models[index]!
    const other = models[1 - index]!

    for (const name of GLOBAL_NAMES) {
      const expected = own.globals.get(name)
      expect(
        await environment.renderString(`{{ ${name} }}`),
        `global ${name} in env ${index}`
      ).toBe(expected === undefined ? '' : `${expected}`)
    }

    for (const [name, factor] of own.filters) {
      expect(
        await environment.renderString(`{{ 3|${name} }}`),
        `filter ${name} in env ${index}`
      ).toBe(`${3 * factor}`)
    }

    for (const name of other.filters.keys()) {
      if (!own.filters.has(name)) {
        await expect(
          environment.renderString(`{{ 3|${name} }}`),
          `filter ${name} must not leak into env ${index}`
        ).rejects.toThrow()
      }
    }
  }
}

function optionalInteger(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`expected a signed safe integer, received ${value}`)
  }
  return parsed
}
