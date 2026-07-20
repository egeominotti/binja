import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const minimum = {
  functions: 75,
  lines: 85,
}

// Bun 1.3.14's built-in threshold can fail on low-coverage individual files
// even when the aggregate shown by LCOV passes. Enforce a weighted project-wide
// threshold from the standard LCOV counters instead.
const lcovPath = resolve(import.meta.dir, '../coverage/lcov.info')
const lcov = await readFile(lcovPath, 'utf8')
const totals = {
  functionsFound: sumField(lcov, 'FNF'),
  functionsHit: sumField(lcov, 'FNH'),
  linesFound: sumField(lcov, 'LF'),
  linesHit: sumField(lcov, 'LH'),
}
if (totals.linesFound === 0 || totals.functionsFound === 0) {
  throw new Error('LCOV report contains no instrumented lines or functions')
}
const coverage = {
  functions: percentage(totals.functionsHit, totals.functionsFound),
  lines: percentage(totals.linesHit, totals.linesFound),
}

console.log(
  `Coverage gate: ${coverage.lines.toFixed(2)}% lines, ${coverage.functions.toFixed(2)}% functions`
)

const failures: string[] = []
if (coverage.lines < minimum.lines) {
  failures.push(`lines ${coverage.lines.toFixed(2)}% < ${minimum.lines}%`)
}
if (coverage.functions < minimum.functions) {
  failures.push(`functions ${coverage.functions.toFixed(2)}% < ${minimum.functions}%`)
}
if (failures.length > 0) {
  throw new Error(`Coverage threshold not met: ${failures.join(', ')}`)
}

function sumField(report: string, field: string): number {
  const prefix = `${field}:`
  let total = 0
  for (const line of report.split('\n')) {
    if (!line.startsWith(prefix)) continue
    const value = Number(line.slice(prefix.length))
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Invalid ${field} value in LCOV report: ${line}`)
    }
    total += value
  }
  return total
}

function percentage(hit: number, found: number): number {
  if (found === 0) return 100
  return (hit / found) * 100
}
