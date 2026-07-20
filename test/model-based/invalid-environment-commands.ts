import { expect } from 'bun:test'
import type { Arbitrary, AsyncCommand } from 'fast-check'
import fc from 'fast-check'
import { EnvironmentCommand } from './environment-command'
import type { EnvironmentModel, RealEnvironment } from './environment-model-harness'

class MissingTemplateCommand extends EnvironmentCommand {
  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    model.misses++
    await expect(real.env.render('model-never-created.html')).rejects.toThrow('Template not found')
    await this.verify(model, real)
  }

  toString(): string {
    return 'rejectMissingTemplate()'
  }
}

class TraversalTemplateCommand extends EnvironmentCommand {
  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    model.misses++
    await expect(real.env.render('../model-outside.html')).rejects.toThrow('Template not found')
    await this.verify(model, real)
  }

  toString(): string {
    return 'rejectTraversalTemplate()'
  }
}

class InvalidSyntaxCommand extends EnvironmentCommand {
  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    await expect(real.env.renderString('{{ unclosed')).rejects.toThrow()
    await this.verify(model, real)
  }

  toString(): string {
    return 'rejectInvalidSyntax()'
  }
}

class UnknownFilterCommand extends EnvironmentCommand {
  check(): boolean {
    return true
  }

  async run(model: EnvironmentModel, real: RealEnvironment): Promise<void> {
    await expect(
      real.env.renderString('{{ value|model_unknown_filter }}', { value: 1 })
    ).rejects.toThrow('Unknown filter')
    await this.verify(model, real)
  }

  toString(): string {
    return 'rejectUnknownFilter()'
  }
}

export function invalidEnvironmentCommandArbitraries(): Arbitrary<
  AsyncCommand<EnvironmentModel, RealEnvironment>
>[] {
  return [
    fc.constant(new MissingTemplateCommand()),
    fc.constant(new TraversalTemplateCommand()),
    fc.constant(new InvalidSyntaxCommand()),
    fc.constant(new UnknownFilterCommand()),
  ]
}
