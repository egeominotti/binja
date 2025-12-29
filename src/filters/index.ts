/**
 * Built-in filters for Jinja2/DTL compatibility
 * Includes all Django Template Language filters
 */

export type FilterFunction = (value: any, ...args: any[]) => any

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
  String(value).replace(/\b\w/g, (c) => c.toUpperCase())

export const trim: FilterFunction = (value) => String(value).trim()

export const striptags: FilterFunction = (value) =>
  String(value).replace(/<[^>]*>/g, '')

export const escape: FilterFunction = (value) => {
  // If already safe, don't double-escape
  if ((value as any)?.__safe__) return value

  const escaped = String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

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
  const paragraphs = str.split(/\n\n+/)
  const html = paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n')
  // Mark as safe - this produces HTML that should not be escaped
  const safeString = new String(html) as any
  safeString.__safe__ = true
  return safeString
}

export const linebreaksbr: FilterFunction = (value) => {
  const html = String(value).replace(/\n/g, '<br>')
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
  const words = String(value).split(/\s+/)
  if (words.length <= count) return value
  return words.slice(0, count).join(' ') + '...'
}

export const wordcount: FilterFunction = (value) =>
  String(value).split(/\s+/).filter(Boolean).length

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
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

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
  if (typeof value === 'object') return Object.keys(value).length
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

export const date: FilterFunction = (value, format = 'N j, Y') => {
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''

  // Django date format codes
  const formatMap: Record<string, () => string> = {
    // Day
    d: () => String(d.getDate()).padStart(2, '0'),
    j: () => String(d.getDate()),
    D: () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
    l: () =>
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()],
    // Month
    m: () => String(d.getMonth() + 1).padStart(2, '0'),
    n: () => String(d.getMonth() + 1),
    M: () =>
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
        d.getMonth()
      ],
    F: () =>
      [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ][d.getMonth()],
    N: () =>
      [
        'Jan.',
        'Feb.',
        'March',
        'April',
        'May',
        'June',
        'July',
        'Aug.',
        'Sept.',
        'Oct.',
        'Nov.',
        'Dec.',
      ][d.getMonth()],
    // Year
    y: () => String(d.getFullYear()).slice(-2),
    Y: () => String(d.getFullYear()),
    // Time
    H: () => String(d.getHours()).padStart(2, '0'),
    G: () => String(d.getHours()),
    i: () => String(d.getMinutes()).padStart(2, '0'),
    s: () => String(d.getSeconds()).padStart(2, '0'),
    // AM/PM
    a: () => (d.getHours() < 12 ? 'a.m.' : 'p.m.'),
    A: () => (d.getHours() < 12 ? 'AM' : 'PM'),
    // 12-hour
    g: () => String(d.getHours() % 12 || 12),
    h: () => String(d.getHours() % 12 || 12).padStart(2, '0'),
  }

  return format.replace(/[a-zA-Z]/g, (char: string) => formatMap[char]?.() ?? char)
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
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const html = String(value).replace(urlRegex, '<a href="$1">$1</a>')
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
export const groupby: FilterFunction = (value, attribute) => {
  if (!Array.isArray(value)) return []

  const groups = new Map<any, any[]>()

  for (const item of value) {
    const key = attribute ? item[attribute] : item
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(item)
  }

  return Array.from(groups.entries()).map(([grouper, list]) => ({
    grouper,
    list,
  }))
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
}
