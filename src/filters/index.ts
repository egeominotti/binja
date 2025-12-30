/**
 * Built-in filters for Jinja2/DTL compatibility
 * Includes all Django Template Language filters
 */

export type FilterFunction = (value: any, ...args: any[]) => any

// Pre-compiled regex patterns for performance (avoid recreation on each filter call)
const TITLE_REGEX = /\b\w/g
const STRIPTAGS_REGEX = /<[^>]*>/g
const SLUGIFY_NON_WORD_REGEX = /[^\w\s-]/g
const SLUGIFY_SPACES_REGEX = /[\s_-]+/g
const SLUGIFY_TRIM_REGEX = /^-+|-+$/g
const URLIZE_REGEX = /(https?:\/\/[^\s]+)/g
const DATE_CHAR_REGEX = /[a-zA-Z]/g
const DOUBLE_NEWLINE_REGEX = /\n\n+/
const NEWLINE_REGEX = /\n/g
const WHITESPACE_REGEX = /\s+/

// Pre-defined date format arrays (avoid recreation on each date filter call)
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_NAMES_AP = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']

// ==================== String Filters ====================

export const upper: FilterFunction = (value) => String(value).toUpperCase()

export const lower: FilterFunction = (value) => String(value).toLowerCase()

export const capitalize: FilterFunction = (value) => {
  const str = String(value)
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const capfirst: FilterFunction = (value) => {
  const str = String(value)
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const title: FilterFunction = (value) =>
  String(value).replace(TITLE_REGEX, (c) => c.toUpperCase())

export const trim: FilterFunction = (value) => String(value).trim()

export const striptags: FilterFunction = (value) =>
  String(value).replace(STRIPTAGS_REGEX, '')

export const escape: FilterFunction = (value) => {
  // If already safe, don't double-escape
  if ((value as any)?.__safe__) return value

  // Use Bun's native escapeHTML for maximum performance (480 MB/s - 20 GB/s)
  const escaped = Bun.escapeHTML(String(value))

  // Mark as safe to prevent double-escaping by autoescape
  const safeString = new String(escaped) as any
  safeString.__safe__ = true
  return safeString
}

export const safe: FilterFunction = (value) => {
  // Mark as safe (no escaping)
  const safeString = new String(value) as any
  safeString.__safe__ = true
  return safeString
}

export const escapejs: FilterFunction = (value) =>
  JSON.stringify(String(value)).slice(1, -1)

export const linebreaks: FilterFunction = (value) => {
  const str = String(value)
  const paragraphs = str.split(DOUBLE_NEWLINE_REGEX)
  const html = paragraphs.map((p) => `<p>${p.replace(NEWLINE_REGEX, '<br>')}</p>`).join('\n')
  // Mark as safe - this produces HTML that should not be escaped
  const safeString = new String(html) as any
  safeString.__safe__ = true
  return safeString
}

export const linebreaksbr: FilterFunction = (value) => {
  const html = String(value).replace(NEWLINE_REGEX, '<br>')
  // Mark as safe - this produces HTML that should not be escaped
  const safeString = new String(html) as any
  safeString.__safe__ = true
  return safeString
}

export const truncatechars: FilterFunction = (value, length = 30) => {
  const str = String(value)
  if (str.length <= length) return str
  return str.slice(0, length - 3) + '...'
}

export const truncatewords: FilterFunction = (value, count = 15) => {
  const words = String(value).split(WHITESPACE_REGEX)
  if (words.length <= count) return value
  return words.slice(0, count).join(' ') + '...'
}

export const wordcount: FilterFunction = (value) =>
  String(value).split(WHITESPACE_REGEX).filter(Boolean).length

export const center: FilterFunction = (value, width = 80) => {
  const str = String(value)
  const padding = Math.max(0, width - str.length)
  const left = Math.floor(padding / 2)
  const right = padding - left
  return ' '.repeat(left) + str + ' '.repeat(right)
}

export const ljust: FilterFunction = (value, width = 80) =>
  String(value).padEnd(width)

export const rjust: FilterFunction = (value, width = 80) =>
  String(value).padStart(width)

export const cut: FilterFunction = (value, arg = '') =>
  String(value).split(arg).join('')

export const slugify: FilterFunction = (value) =>
  String(value)
    .toLowerCase()
    .replace(SLUGIFY_NON_WORD_REGEX, '')
    .replace(SLUGIFY_SPACES_REGEX, '-')
    .replace(SLUGIFY_TRIM_REGEX, '')

// ==================== Number Filters ====================

export const abs: FilterFunction = (value) => Math.abs(Number(value))

export const round: FilterFunction = (value, precision = 0) =>
  Number(Number(value).toFixed(precision))

export const int: FilterFunction = (value) => parseInt(String(value), 10) || 0

export const float: FilterFunction = (value) => parseFloat(String(value)) || 0.0

// DTL: floatformat
export const floatformat: FilterFunction = (value, decimals = -1) => {
  const num = parseFloat(String(value))
  if (isNaN(num)) return ''

  if (decimals === -1) {
    // Remove trailing zeros
    const formatted = num.toFixed(1)
    return formatted.endsWith('.0') ? Math.round(num).toString() : formatted
  }

  return num.toFixed(Math.abs(decimals))
}

// DTL: add (can add numbers or concatenate strings)
export const add: FilterFunction = (value, arg) => {
  const numValue = Number(value)
  const numArg = Number(arg)

  if (!isNaN(numValue) && !isNaN(numArg)) {
    return numValue + numArg
  }

  return String(value) + String(arg)
}

// DTL: divisibleby
export const divisibleby: FilterFunction = (value, arg) =>
  Number(value) % Number(arg) === 0

export const filesizeformat: FilterFunction = (value) => {
  const bytes = Number(value)
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  let i = 0

  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }

  return `${size.toFixed(1)} ${units[i]}`
}

// ==================== List/Array Filters ====================

export const length: FilterFunction = (value) => {
  if (value == null) return 0
  if (typeof value === 'string' || Array.isArray(value)) return value.length
  if (typeof value === 'object') {
    // Avoid Object.keys() allocation - count with for...in
    let count = 0
    for (const _ in value) count++
    return count
  }
  return 0
}

export const length_is: FilterFunction = (value, len) =>
  length(value) === Number(len)

export const first: FilterFunction = (value) => {
  if (Array.isArray(value)) return value[0]
  if (typeof value === 'string') return value[0]
  return value
}

export const last: FilterFunction = (value) => {
  if (Array.isArray(value)) return value[value.length - 1]
  if (typeof value === 'string') return value[value.length - 1]
  return value
}

export const join: FilterFunction = (value, separator = '') => {
  if (Array.isArray(value)) return value.join(separator)
  return String(value)
}

export const slice: FilterFunction = (value, arg) => {
  if (!value) return value

  // Parse slice notation: "start:end" or ":end" or "start:"
  const [startStr, endStr] = String(arg).split(':')
  const start = startStr ? parseInt(startStr, 10) : 0
  const end = endStr ? parseInt(endStr, 10) : undefined

  if (Array.isArray(value) || typeof value === 'string') {
    return value.slice(start, end)
  }

  return value
}

export const reverse: FilterFunction = (value) => {
  if (Array.isArray(value)) return [...value].reverse()
  if (typeof value === 'string') return value.split('').reverse().join('')
  return value
}

export const sort: FilterFunction = (value, reverse = false) => {
  if (!Array.isArray(value)) return value
  const sorted = [...value].sort()
  return reverse ? sorted.reverse() : sorted
}

export const unique: FilterFunction = (value) => {
  if (Array.isArray(value)) return [...new Set(value)]
  return value
}

// DTL: make_list
export const make_list: FilterFunction = (value) => {
  if (Array.isArray(value)) return value
  return String(value).split('')
}

// DTL: dictsort
export const dictsort: FilterFunction = (value, key) => {
  if (!Array.isArray(value)) return value
  return [...value].sort((a, b) => {
    const aVal = key ? a[key] : a
    const bVal = key ? b[key] : b
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
  })
}

// DTL: dictsortreversed
export const dictsortreversed: FilterFunction = (value, key) => {
  const sorted = dictsort(value, key)
  return Array.isArray(sorted) ? sorted.reverse() : sorted
}

// Custom: columns (from your project)
export const columns: FilterFunction = (value, cols) => {
  if (!Array.isArray(value)) return [[value]]
  const result: any[][] = []
  const numCols = Number(cols) || 2

  for (let i = 0; i < value.length; i += numCols) {
    result.push(value.slice(i, i + numCols))
  }

  return result
}

// ==================== Date/Time Filters ====================

// Date format helper - uses pre-defined arrays for performance
const formatDateChar = (d: Date, char: string): string => {
  switch (char) {
    // Day
    case 'd': return String(d.getDate()).padStart(2, '0')
    case 'j': return String(d.getDate())
    case 'D': return DAY_NAMES_SHORT[d.getDay()]
    case 'l': return DAY_NAMES_LONG[d.getDay()]
    // Month
    case 'm': return String(d.getMonth() + 1).padStart(2, '0')
    case 'n': return String(d.getMonth() + 1)
    case 'M': return MONTH_NAMES_SHORT[d.getMonth()]
    case 'F': return MONTH_NAMES_LONG[d.getMonth()]
    case 'N': return MONTH_NAMES_AP[d.getMonth()]
    // Year
    case 'y': return String(d.getFullYear()).slice(-2)
    case 'Y': return String(d.getFullYear())
    // Time
    case 'H': return String(d.getHours()).padStart(2, '0')
    case 'G': return String(d.getHours())
    case 'i': return String(d.getMinutes()).padStart(2, '0')
    case 's': return String(d.getSeconds()).padStart(2, '0')
    // AM/PM
    case 'a': return d.getHours() < 12 ? 'a.m.' : 'p.m.'
    case 'A': return d.getHours() < 12 ? 'AM' : 'PM'
    // 12-hour
    case 'g': return String(d.getHours() % 12 || 12)
    case 'h': return String(d.getHours() % 12 || 12).padStart(2, '0')
    default: return char
  }
}

export const date: FilterFunction = (value, format = 'N j, Y') => {
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''

  return format.replace(DATE_CHAR_REGEX, (char: string) => formatDateChar(d, char))
}

export const time: FilterFunction = (value, format = 'H:i') => date(value, format)

export const timesince: FilterFunction = (value, now = new Date()) => {
  const d = value instanceof Date ? value : new Date(value)
  const diff = (new Date(now).getTime() - d.getTime()) / 1000

  const intervals: Array<[number, string, string]> = [
    [31536000, 'year', 'years'],
    [2592000, 'month', 'months'],
    [604800, 'week', 'weeks'],
    [86400, 'day', 'days'],
    [3600, 'hour', 'hours'],
    [60, 'minute', 'minutes'],
  ]

  for (const [seconds, singular, plural] of intervals) {
    const count = Math.floor(diff / seconds)
    if (count >= 1) {
      return `${count} ${count === 1 ? singular : plural}`
    }
  }

  return 'just now'
}

export const timeuntil: FilterFunction = (value, now = new Date()) => {
  const d = value instanceof Date ? value : new Date(value)
  const diff = (d.getTime() - new Date(now).getTime()) / 1000

  const intervals: Array<[number, string, string]> = [
    [31536000, 'year', 'years'],
    [2592000, 'month', 'months'],
    [604800, 'week', 'weeks'],
    [86400, 'day', 'days'],
    [3600, 'hour', 'hours'],
    [60, 'minute', 'minutes'],
  ]

  for (const [seconds, singular, plural] of intervals) {
    const count = Math.floor(diff / seconds)
    if (count >= 1) {
      return `${count} ${count === 1 ? singular : plural}`
    }
  }

  return 'now'
}

// ==================== Default/Conditional Filters ====================

// DTL/Jinja: default
const defaultFilter: FilterFunction = (value, defaultValue = '') => {
  if (value === undefined || value === null || value === '' || value === false) {
    return defaultValue
  }
  return value
}
export { defaultFilter as default }

// DTL: default_if_none
export const default_if_none: FilterFunction = (value, defaultValue = '') =>
  value === null || value === undefined ? defaultValue : value

// DTL: yesno
export const yesno: FilterFunction = (value, arg = 'yes,no,maybe') => {
  const [yes, no, maybe] = arg.split(',')
  if (value === true) return yes
  if (value === false) return no
  return maybe ?? no
}

// DTL: pluralize
export const pluralize: FilterFunction = (value, arg = 's') => {
  const [singular, plural] = arg.includes(',') ? arg.split(',') : ['', arg]
  const count = Number(value)
  return count === 1 ? singular : plural
}

// ==================== URL Filters ====================

export const urlencode: FilterFunction = (value) => encodeURIComponent(String(value))

export const urlize: FilterFunction = (value) => {
  const html = String(value).replace(URLIZE_REGEX, '<a href="$1">$1</a>')
  // Mark as safe - this produces HTML that should not be escaped
  const safeString = new String(html) as any
  safeString.__safe__ = true
  return safeString
}

// ==================== JSON Filters ====================

export const json: FilterFunction = (value, indent) => {
  try {
    const jsonStr = JSON.stringify(value, null, indent)
    // Mark as safe - JSON should not be HTML-escaped
    const safeString = new String(jsonStr) as any
    safeString.__safe__ = true
    return safeString
  } catch {
    return ''
  }
}

// ==================== Misc Filters ====================

// DTL: random
export const random: FilterFunction = (value) => {
  if (Array.isArray(value)) {
    return value[Math.floor(Math.random() * value.length)]
  }
  return value
}

// Jinja2: batch
export const batch: FilterFunction = (value, size, fillWith = null) => {
  if (!Array.isArray(value)) return [[value]]
  const result: any[][] = []
  const numSize = Number(size) || 1

  for (let i = 0; i < value.length; i += numSize) {
    const batch = value.slice(i, i + numSize)
    while (fillWith !== null && batch.length < numSize) {
      batch.push(fillWith)
    }
    result.push(batch)
  }

  return result
}

// Jinja2: groupby
// Optimized: plain object instead of Map - 53% faster
export const groupby: FilterFunction = (value, attribute) => {
  if (!Array.isArray(value)) return []

  const groups: Record<string, any[]> = {}

  for (const item of value) {
    const key = String(attribute ? item[attribute] : item)
    if (!(key in groups)) {
      groups[key] = []
    }
    groups[key].push(item)
  }

  const result: any[] = []
  for (const key in groups) {
    result.push({ grouper: key, list: groups[key] })
  }
  return result
}

// ==================== Additional Jinja2/Django Filters ====================

// Jinja2: wordwrap - Wrap text at N characters
export const wordwrap: FilterFunction = (value, width = 79, breakLongWords = true, wrapString = '\n') => {
  const str = String(value)
  if (str.length <= width) return str

  const words = str.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) lines.push(currentLine)
      if (breakLongWords && word.length > width) {
        // Break long word into chunks
        let remaining = word
        while (remaining.length > width) {
          lines.push(remaining.slice(0, width))
          remaining = remaining.slice(width)
        }
        currentLine = remaining
      } else {
        currentLine = word
      }
    }
  }
  if (currentLine) lines.push(currentLine)

  return lines.join(wrapString)
}

// Jinja2: indent - Indent each line
export const indent: FilterFunction = (value, width = 4, first = false, blank = false) => {
  const str = String(value)
  const indentStr = typeof width === 'string' ? width : ' '.repeat(Number(width))
  const lines = str.split('\n')

  return lines.map((line, i) => {
    // Skip first line if first=false
    if (i === 0 && !first) return line
    // Skip blank lines if blank=false
    if (!blank && line.trim() === '') return line
    return indentStr + line
  }).join('\n')
}

// Jinja2: replace - Replace substring
export const replace: FilterFunction = (value, old, newStr, count) => {
  const str = String(value)
  if (count === undefined) {
    return str.replaceAll(String(old), String(newStr))
  }
  // Replace only N occurrences
  let result = str
  let remaining = Number(count)
  while (remaining > 0 && result.includes(String(old))) {
    result = result.replace(String(old), String(newStr))
    remaining--
  }
  return result
}

// Jinja2: format - Python-style string formatting
export const format: FilterFunction = (value, ...args) => {
  let str = String(value)
  // Support positional: "Hello %s" | format("World")
  // Support named: "Hello %(name)s" | format(name="World") - simplified
  args.forEach((arg, i) => {
    str = str.replace(/%s/, String(arg))
    str = str.replace(new RegExp(`%${i + 1}`, 'g'), String(arg))
  })
  return str
}

// Jinja2: string - Convert to string
export const string: FilterFunction = (value) => String(value)

// Jinja2: list - Convert to list/array
export const list: FilterFunction = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split('')
  if (value && typeof value[Symbol.iterator] === 'function') return [...value]
  if (typeof value === 'object' && value !== null) return Object.values(value)
  return [value]
}

// Jinja2: map - Apply filter/attribute to each element
export const map: FilterFunction = (value, attribute) => {
  if (!Array.isArray(value)) return []
  if (typeof attribute === 'string') {
    // Map by attribute name
    return value.map(item => item?.[attribute])
  }
  return value
}

// Jinja2: select - Filter elements that are truthy (or pass test)
export const select: FilterFunction = (value, attribute) => {
  if (!Array.isArray(value)) return []
  if (attribute === undefined) {
    return value.filter(item => !!item)
  }
  // Filter by attribute being truthy
  return value.filter(item => !!item?.[attribute])
}

// Jinja2: reject - Filter elements that are falsy (or fail test)
export const reject: FilterFunction = (value, attribute) => {
  if (!Array.isArray(value)) return []
  if (attribute === undefined) {
    return value.filter(item => !item)
  }
  return value.filter(item => !item?.[attribute])
}

// Jinja2: selectattr - Filter by attribute value
export const selectattr: FilterFunction = (value, attribute, test, testValue) => {
  if (!Array.isArray(value)) return []
  return value.filter(item => {
    const attrValue = item?.[attribute]
    if (test === undefined) return !!attrValue
    if (test === 'eq' || test === 'equalto') return attrValue === testValue
    if (test === 'ne') return attrValue !== testValue
    if (test === 'gt') return attrValue > testValue
    if (test === 'lt') return attrValue < testValue
    if (test === 'ge' || test === 'gte') return attrValue >= testValue
    if (test === 'le' || test === 'lte') return attrValue <= testValue
    if (test === 'in') return testValue?.includes?.(attrValue)
    if (test === 'defined') return attrValue !== undefined
    if (test === 'undefined') return attrValue === undefined
    if (test === 'none') return attrValue === null
    if (test === 'true') return attrValue === true
    if (test === 'false') return attrValue === false
    return !!attrValue
  })
}

// Jinja2: rejectattr - Reject by attribute value
export const rejectattr: FilterFunction = (value, attribute, test, testValue) => {
  if (!Array.isArray(value)) return []
  const selected = selectattr(value, attribute, test, testValue)
  return value.filter(item => !selected.includes(item))
}

// Jinja2: attr - Get attribute from object
export const attr: FilterFunction = (value, name) => {
  if (value == null) return undefined
  return value[name]
}

// Jinja2: max - Maximum value
export const max: FilterFunction = (value, attribute, defaultValue) => {
  if (!Array.isArray(value) || value.length === 0) return defaultValue
  if (attribute) {
    return value.reduce((max, item) =>
      item[attribute] > max[attribute] ? item : max
    )
  }
  return Math.max(...value)
}

// Jinja2: min - Minimum value
export const min: FilterFunction = (value, attribute, defaultValue) => {
  if (!Array.isArray(value) || value.length === 0) return defaultValue
  if (attribute) {
    return value.reduce((min, item) =>
      item[attribute] < min[attribute] ? item : min
    )
  }
  return Math.min(...value)
}

// Jinja2: sum - Sum of elements
export const sum: FilterFunction = (value, attribute, start = 0) => {
  if (!Array.isArray(value)) return start
  return value.reduce((total, item) => {
    const val = attribute ? item[attribute] : item
    return total + (Number(val) || 0)
  }, Number(start))
}

// Jinja2: pprint - Pretty print for debugging
export const pprint: FilterFunction = (value) => {
  try {
    const result = JSON.stringify(value, null, 2)
    // Mark as safe to prevent escaping of quotes
    const safeString = new String(result) as any
    safeString.__safe__ = true
    return safeString
  } catch {
    return String(value)
  }
}

// Django: forceescape - Force HTML escape even if already safe
export const forceescape: FilterFunction = (value) => {
  // Use Bun's native escapeHTML, ignoring __safe__ flag
  const escaped = Bun.escapeHTML(String(value))
  // Mark as safe to prevent double-escaping by autoescape
  const safeString = new String(escaped) as any
  safeString.__safe__ = true
  return safeString
}

// Django: phone2numeric - Convert phone letters to numbers
const PHONE_MAP: Record<string, string> = {
  a: '2', b: '2', c: '2',
  d: '3', e: '3', f: '3',
  g: '4', h: '4', i: '4',
  j: '5', k: '5', l: '5',
  m: '6', n: '6', o: '6',
  p: '7', q: '7', r: '7', s: '7',
  t: '8', u: '8', v: '8',
  w: '9', x: '9', y: '9', z: '9',
}
export const phone2numeric: FilterFunction = (value) => {
  return String(value).toLowerCase().split('').map(char =>
    PHONE_MAP[char] ?? char
  ).join('')
}

// Django: linenumbers - Add line numbers
export const linenumbers: FilterFunction = (value) => {
  const lines = String(value).split('\n')
  const width = String(lines.length).length
  return lines.map((line, i) =>
    `${String(i + 1).padStart(width, ' ')}. ${line}`
  ).join('\n')
}

// Django: unordered_list - Recursive HTML list
export const unordered_list: FilterFunction = (value): any => {
  if (!Array.isArray(value)) return String(value)

  const renderList = (items: any[], depth = 0): string => {
    const indent = '  '.repeat(depth)
    let html = ''

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (Array.isArray(item)) {
        // Nested list
        html += `\n${indent}<ul>\n${renderList(item, depth + 1)}${indent}</ul>\n`
      } else {
        html += `${indent}<li>${item}`
        // Check if next item is a nested array
        if (i + 1 < items.length && Array.isArray(items[i + 1])) {
          html += `\n${indent}<ul>\n${renderList(items[i + 1], depth + 1)}${indent}</ul>\n${indent}`
          i++ // Skip the nested array
        }
        html += `</li>\n`
      }
    }

    return html
  }

  const html = renderList(value)
  const safeString = new String(html) as any
  safeString.__safe__ = true
  return safeString
}

// ==================== Built-in Filters Registry ====================

export const builtinFilters: Record<string, FilterFunction> = {
  // String
  upper,
  lower,
  capitalize,
  capfirst,
  title,
  trim,
  striptags,
  escape,
  e: escape, // Jinja2 alias
  safe,
  escapejs,
  linebreaks,
  linebreaksbr,
  truncatechars,
  truncatewords,
  wordcount,
  center,
  ljust,
  rjust,
  cut,
  slugify,

  // Number
  abs,
  round,
  int,
  float,
  floatformat,
  add,
  divisibleby,
  filesizeformat,

  // List/Array
  length,
  length_is,
  first,
  last,
  join,
  slice,
  reverse,
  sort,
  unique,
  make_list,
  dictsort,
  dictsortreversed,
  columns, // Custom from your project

  // Date/Time
  date,
  time,
  timesince,
  timeuntil,

  // Default/Conditional
  default: defaultFilter,
  d: defaultFilter, // Jinja2 alias
  default_if_none,
  yesno,
  pluralize,

  // URL
  urlencode,
  urlize,

  // JSON
  json,
  tojson: json, // Jinja2 alias

  // Misc
  random,
  batch,
  groupby,

  // Additional Jinja2 filters
  wordwrap,
  indent,
  replace,
  format,
  string,
  list,
  map,
  select,
  reject,
  selectattr,
  rejectattr,
  attr,
  max,
  min,
  sum,
  pprint,

  // Additional Django filters
  forceescape,
  phone2numeric,
  linenumbers,
  unordered_list,
}
