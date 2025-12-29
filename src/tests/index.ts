/**
 * Built-in test functions for Jinja2 compatibility
 * Tests are used with the "is" operator: {{ x is divisibleby(3) }}
 */

export type TestFunction = (value: any, ...args: any[]) => boolean

// ==================== Number Tests ====================

export const divisibleby: TestFunction = (value, num) => {
  const n = Number(value)
  const d = Number(num)
  if (d === 0) return false
  return n % d === 0
}

export const even: TestFunction = (value) => {
  const n = Number(value)
  return Number.isInteger(n) && n % 2 === 0
}

export const odd: TestFunction = (value) => {
  const n = Number(value)
  return Number.isInteger(n) && n % 2 !== 0
}

export const number: TestFunction = (value) => {
  return typeof value === 'number' && !isNaN(value)
}

export const integer: TestFunction = (value) => {
  return Number.isInteger(value)
}

export const float: TestFunction = (value) => {
  return typeof value === 'number' && !Number.isInteger(value) && !isNaN(value)
}

// Comparison tests
export const gt: TestFunction = (value, other) => Number(value) > Number(other)
export const ge: TestFunction = (value, other) => Number(value) >= Number(other)
export const lt: TestFunction = (value, other) => Number(value) < Number(other)
export const le: TestFunction = (value, other) => Number(value) <= Number(other)
export const greaterthan = gt
export const lessthan = lt

// ==================== Type Tests ====================

export const defined: TestFunction = (value) => {
  return value !== undefined
}

export const undefined: TestFunction = (value) => {
  return value === undefined
}

export const none: TestFunction = (value) => {
  return value === null
}

export const boolean: TestFunction = (value) => {
  return typeof value === 'boolean'
}

export const string: TestFunction = (value) => {
  return typeof value === 'string'
}

export const mapping: TestFunction = (value) => {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  )
}

export const iterable: TestFunction = (value) => {
  if (value == null) return false
  return typeof value === 'string' || Array.isArray(value) || typeof value[Symbol.iterator] === 'function'
}

export const sequence: TestFunction = (value) => {
  return Array.isArray(value) || typeof value === 'string'
}

export const callable: TestFunction = (value) => {
  return typeof value === 'function'
}

// ==================== String Tests ====================

export const lower: TestFunction = (value) => {
  if (typeof value !== 'string') return false
  return value === value.toLowerCase() && value !== value.toUpperCase()
}

export const upper: TestFunction = (value) => {
  if (typeof value !== 'string') return false
  return value === value.toUpperCase() && value !== value.toLowerCase()
}

// ==================== Collection Tests ====================

export const empty: TestFunction = (value) => {
  if (value == null) return true
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

export const in_: TestFunction = (value, container) => {
  if (Array.isArray(container)) return container.includes(value)
  if (typeof container === 'string') return container.includes(String(value))
  if (typeof container === 'object' && container !== null) return value in container
  return false
}

// ==================== Equality Tests ====================

export const eq: TestFunction = (value, other) => value === other
export const ne: TestFunction = (value, other) => value !== other
export const sameas: TestFunction = (value, other) => value === other
export const equalto = eq

// ==================== Truthiness Tests ====================

export const truthy: TestFunction = (value) => {
  if (value == null) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value.length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

export const falsy: TestFunction = (value) => !truthy(value)

// Strict boolean tests
export const true_: TestFunction = (value) => value === true
export const false_: TestFunction = (value) => value === false

// ==================== Built-in Tests Registry ====================

export const builtinTests: Record<string, TestFunction> = {
  // Number tests
  divisibleby,
  even,
  odd,
  number,
  integer,
  float,
  gt,
  ge,
  lt,
  le,
  greaterthan,
  lessthan,

  // Type tests
  defined,
  undefined,
  none,
  boolean,
  string,
  mapping,
  iterable,
  sequence,
  callable,

  // String tests
  lower,
  upper,

  // Collection tests
  empty,
  in: in_,

  // Equality tests
  eq,
  ne,
  sameas,
  equalto,

  // Truthiness tests
  truthy,
  falsy,
  true: true_,
  false: false_,
}
