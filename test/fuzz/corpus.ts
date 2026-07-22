import fc from 'fast-check'

export const TEMPLATE_FUZZ_CORPUS = [
  '',
  '\0',
  '{{',
  '}}',
  '{%',
  '%}',
  '{#',
  '#}',
  '{{ value }}',
  '{{ value|default:"x" }}',
  '{{ value.__proto__.constructor }}',
  '{{ value["constructor"] }}',
  '{% if value %}yes{% else %}no{% endif %}',
  '{% for item in items %}{{ item }}{% empty %}empty{% endfor %}',
  '{% autoescape off %}{{ value }}{% endautoescape %}',
  '{% spaceless %}<p> x </p> <p> y </p>{% endspaceless %}',
  '{% raw %}{{ untouched }}{% endraw %}',
  '{% include "missing.html" ignore missing %}',
  '{% include "../outside.html" %}',
  '{% extends "base.html" %}{% block body %}x{% endblock %}',
  '😀 Привет こんにちは مرحبا',
  '\u2028\u2029</script><script>alert(1)</script>',
  'a'.repeat(512),
] as const

const INTERESTING_FRAGMENTS = [
  '',
  '\0',
  '{',
  '}',
  '{{',
  '}}',
  '{%',
  '%}',
  '{#',
  '#}',
  '-',
  '.',
  '..',
  '/',
  '\\',
  '"',
  "'",
  '|',
  ':',
  '[',
  ']',
  '(',
  ')',
  '__proto__',
  'constructor',
  'end',
  'endif',
  'endfor',
  '😀',
  '\u2028',
] as const

interface Mutation {
  fragment: string
  index: number
  kind: 'delete' | 'insert' | 'replace'
  length: number
}

const mutationArbitrary = fc.record({
  fragment: fc.oneof(fc.constantFrom(...INTERESTING_FRAGMENTS), fc.string({ maxLength: 12 })),
  index: fc.nat({ max: 1024 }),
  kind: fc.constantFrom('delete' as const, 'insert' as const, 'replace' as const),
  length: fc.nat({ max: 24 }),
})

/** Corpus-seeded mutations shrink to both the minimal edit and minimal seed. */
export const hostileTemplateArbitrary = fc.oneof(
  fc.string({ maxLength: 384 }),
  fc
    .tuple(
      fc.constantFrom(...TEMPLATE_FUZZ_CORPUS),
      fc.array(mutationArbitrary, { minLength: 1, maxLength: 24 })
    )
    .map(([seed, mutations]) => applyMutations(seed, mutations))
)

export const hostileTemplateNameArbitrary = fc.oneof(
  fc.string({ maxLength: 256 }),
  fc.constantFrom(
    'inside.html',
    './inside.html',
    'nested/../inside.html',
    '../outside.html',
    '../../outside.html',
    '/etc/passwd',
    'C:\\Windows\\win.ini',
    '%2e%2e/outside.html',
    '..\\outside.html',
    '\0inside.html'
  )
)

function applyMutations(seed: string, mutations: Mutation[]): string {
  let source = seed

  for (const mutation of mutations) {
    const index = mutation.index % (source.length + 1)
    const end = Math.min(source.length, index + mutation.length)

    if (mutation.kind === 'insert') {
      source = source.slice(0, index) + mutation.fragment + source.slice(index)
    } else if (mutation.kind === 'delete') {
      source = source.slice(0, index) + source.slice(end)
    } else {
      source = source.slice(0, index) + mutation.fragment + source.slice(end)
    }
  }

  return source.slice(0, 1024)
}
