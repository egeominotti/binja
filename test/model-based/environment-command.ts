import type { AsyncCommand } from 'fast-check'
import type { EnvironmentModel, RealEnvironment } from './environment-model-harness'

export abstract class EnvironmentCommand implements AsyncCommand<
  EnvironmentModel,
  RealEnvironment
> {
  abstract check(model: Readonly<EnvironmentModel>): boolean
  abstract run(model: EnvironmentModel, real: RealEnvironment): Promise<void>
  abstract toString(): string

  protected async verify(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    await real.assertConsistent(model)
  }
}
