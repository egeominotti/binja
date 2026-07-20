import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import fc from 'fast-check'
import { compileWithInheritance, Environment, Lexer, Parser } from '../../src'

const templateText = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'), {
    maxLength: 30,
  })
  .map((characters) => characters.join(''))

describe('Inheritance invariants', () => {
  test('block override, block.super and autoescape follow the inheritance model', async () => {
    await fc.assert(
      fc.asyncProperty(
        templateText,
        templateText,
        templateText,
        fc.string({ maxLength: 50 }),
        fc.boolean(),
        async (prefix, parent, child, value, useSuper) => {
          const directory = mkdtempSync(join(tmpdir(), `binja-inheritance-model-${process.pid}-`))
          try {
            writeFileSync(
              join(directory, 'base.html'),
              `${prefix}[{% block body %}${parent}:{{ value }}{% endblock %}]`
            )
            writeFileSync(
              join(directory, 'child.html'),
              `{% extends "base.html" %}{% block body %}${child}:{{ value }}${
                useSuper ? '|{{ block.super }}' : ''
              }{% endblock %}`
            )

            const escaped = escapeHtml(value)
            const expectedBody = useSuper
              ? `${child}:${escaped}|${parent}:${escaped}`
              : `${child}:${escaped}`
            const expected = `${prefix}[${expectedBody}]`
            const context = { value }

            const environment = new Environment({ cache: false, templates: directory })
            expect(await environment.render('child.html', context), 'runtime inheritance').toBe(
              expected
            )

            const compiled = await compileWithInheritance('child.html', {
              templates: directory,
            })
            expect(compiled(context), 'AOT inheritance').toBe(expected)
          } finally {
            rmSync(directory, { force: true, recursive: true })
          }
        }
      ),
      {
        interruptAfterTimeLimit: 30_000,
        numRuns: 100,
        verbose: 2,
      }
    )
  }, 35_000)

  test('include context overrides are local and outer context remains unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(templateText, templateText, async (outer, inner) => {
        const templates = new Map([
          ['partial', '{{ value }}'],
          ['root', '{% include "partial" with value=inner %}|{{ value }}|{% include "partial" %}'],
        ])
        const directory = mkdtempSync(join(tmpdir(), `binja-include-model-${process.pid}-`))
        try {
          for (const [name, source] of templates) {
            writeFileSync(join(directory, name), source)
          }
          const fileEnvironment = new Environment({
            cache: false,
            extensions: [''],
            templates: directory,
          })
          expect(await fileEnvironment.render('root', { inner, value: outer })).toBe(
            `${inner}|${outer}|${outer}`
          )
        } finally {
          rmSync(directory, { force: true, recursive: true })
        }
      }),
      { numRuns: 100 }
    )
  })

  test('multi-level block.super walks each parent exactly once', async () => {
    await fc.assert(
      fc.asyncProperty(
        templateText,
        templateText,
        templateText,
        async (parent, child, grandchild) => {
          const directory = mkdtempSync(join(tmpdir(), `binja-multilevel-model-${process.pid}-`))
          try {
            writeFileSync(join(directory, 'base.html'), `{% block body %}${parent}{% endblock %}`)
            writeFileSync(
              join(directory, 'child.html'),
              `{% extends "base.html" %}{% block body %}${child}|{{ block.super }}{% endblock %}`
            )
            writeFileSync(
              join(directory, 'grandchild.html'),
              `{% extends "child.html" %}{% block body %}${grandchild}|{{ block.super }}{% endblock %}`
            )

            const expected = `${grandchild}|${child}|${parent}`
            const environment = new Environment({ cache: false, templates: directory })
            expect(await environment.render('grandchild.html')).toBe(expected)

            const compiled = await compileWithInheritance('grandchild.html', {
              templates: directory,
            })
            expect(compiled({})).toBe(expected)
          } finally {
            rmSync(directory, { force: true, recursive: true })
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('duplicate and mismatched block definitions are rejected', () => {
    expect(() =>
      parse('{% block content %}first{% endblock %}{% block content %}second{% endblock %}')
    ).toThrow("Block 'content' is defined more than once")
    expect(() => parse('{% block content %}value{% endblock other %}')).toThrow(
      "Expected endblock 'content', got 'other'"
    )
  })
})

function parse(source: string) {
  return new Parser(new Lexer(source).tokenize(), source).parse()
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;')
}
