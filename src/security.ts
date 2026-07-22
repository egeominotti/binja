/**
 * Security-sensitive helpers shared by the interpreter, AOT compiler and
 * filters. Keep these rules centralized so every execution path exposes the
 * same property-access and JSON-embedding behaviour.
 */

const BLOCKED_PROPERTY_NAMES = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'caller',
  'callee',
  'arguments',
])

/** Return whether a template may resolve the supplied property name. */
export function isSafePropertyKey(key: PropertyKey): boolean {
  return typeof key !== 'string' || !BLOCKED_PROPERTY_NAMES.has(key)
}

/**
 * Read a property for template evaluation while blocking prototype-escape
 * primitives. Methods keep their receiver, matching normal JavaScript access.
 */
export function safeGet(object: any, key: PropertyKey): any {
  if (object == null || !isSafePropertyKey(key)) return undefined

  const value = object[key]
  return typeof value === 'function' ? value.bind(object) : value
}

/** Resolve a top-level template name without binding callable values. */
export function safeResolve(context: Record<string, any>, name: string): any {
  if (!isSafePropertyKey(name) || !Object.hasOwn(context, name)) return undefined
  return context[name]
}

/** Python/Jinja-style mapping membership checks only own keys. */
export function hasOwnKey(object: any, key: PropertyKey): boolean {
  return object != null && typeof object === 'object' && Object.hasOwn(object, key)
}

/**
 * Serialize JSON so it is safe in HTML, including a <script> text node. The
 * replacements prevent a value from terminating the element or becoming HTML.
 */
export function htmlSafeJson(value: any, indent?: number | string): string {
  const serialized = JSON.stringify(value, null, indent) ?? 'null'
  return serialized
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** HTML/XML attribute names accepted by Jinja's xmlattr-style output. */
export function isSafeAttributeName(name: string): boolean {
  if (name.length === 0) return false

  for (const char of name) {
    const code = char.charCodeAt(0)
    if (code <= 0x1f || code === 0x7f || char.trim() === '' || `/>='"`.includes(char)) {
      return false
    }
  }

  return true
}
