import { describe, test } from 'bun:test'
import fc from 'fast-check'
import { runCrossEnvironmentInvariantCampaign } from './cross-environment-invariants'
import { environmentCommandArbitraries } from './environment-commands'
import { type EnvironmentModel, RealEnvironment } from './environment-model-harness'
import { invalidEnvironmentCommandArbitraries } from './invalid-environment-commands'

const DEFAULT_RUNS = 100
const DEFAULT_COMMANDS = 60

describe('Environment state-machine model', () => {
  test('generated cache, registry and render histories preserve all invariants', async () => {
    const seed = optionalInteger(Bun.env.BINJA_MODEL_SEED)
    const numRuns = optionalInteger(Bun.env.BINJA_MODEL_RUNS) ?? DEFAULT_RUNS
    const maxCommands = optionalInteger(Bun.env.BINJA_MODEL_COMMANDS) ?? DEFAULT_COMMANDS

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 4 }),
        fc.commands(
          [...environmentCommandArbitraries(), ...invalidEnvironmentCommandArbitraries()],
          { maxCommands }
        ),
        async (maxSize, commands) => {
          const real = RealEnvironment.create(maxSize)
          const model: EnvironmentModel = {
            cachedVersions: new Map(),
            filters: new Map(),
            globals: new Map(),
            hits: 0,
            keys: [],
            maxSize,
            misses: 0,
            routes: new Map(),
            versions: [0, 0, 0, 0, 0],
          }
          try {
            await fc.asyncModelRun(() => ({ model, real }), commands)
          } finally {
            real.dispose()
          }
        }
      ),
      {
        endOnFailure: true,
        interruptAfterTimeLimit: 45_000,
        numRuns,
        seed,
        verbose: 2,
      }
    )
  }, 50_000)

  test('generated multi-environment histories preserve registry isolation', async () => {
    await runCrossEnvironmentInvariantCampaign()
  }, 35_000)
})

function optionalInteger(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`expected a signed safe integer, received ${value}`)
  }
  return parsed
}
