/**
 * Test Functions Tests - Based on Jinja2 test_tests.py
 *
 * Tests the Jinja2 test functions used with the `is` operator.
 * Syntax: `value is testname` or `value is testname(args)`
 *
 * Note: In Jinja2, "tests" are different from filters:
 * - Filters transform values: {{ value|filter }}
 * - Tests check conditions: {% if value is test %}
 */
import { describe, test, expect } from 'bun:test'
import { render } from '../src'

describe('Test Functions', () => {
  // ==================== Number Tests ====================

  describe('divisibleby', () => {
    test('9 is divisible by 3', async () => {
      expect(await render('{{ x is divisibleby(3) }}', { x: 9 })).toBe('True')
    })

    test('9 is not divisible by 4', async () => {
      expect(await render('{{ x is divisibleby(4) }}', { x: 9 })).toBe('False')
    })

    test('0 is divisible by any number', async () => {
      expect(await render('{{ x is divisibleby(5) }}', { x: 0 })).toBe('True')
    })

    test('12 is divisible by 6', async () => {
      expect(await render('{{ x is divisibleby(6) }}', { x: 12 })).toBe('True')
    })

    test('negative number divisibility', async () => {
      expect(await render('{{ x is divisibleby(3) }}', { x: -9 })).toBe('True')
    })

    test('works in if condition', async () => {
      expect(
        await render('{% if x is divisibleby(2) %}even{% else %}odd{% endif %}', { x: 4 })
      ).toBe('even')
      expect(
        await render('{% if x is divisibleby(2) %}even{% else %}odd{% endif %}', { x: 5 })
      ).toBe('odd')
    })

    test('negated with is not', async () => {
      expect(await render('{{ x is not divisibleby(3) }}', { x: 10 })).toBe('True')
      expect(await render('{{ x is not divisibleby(3) }}', { x: 9 })).toBe('False')
    })
  })

  describe('even', () => {
    test('2 is even', async () => {
      expect(await render('{{ x is even }}', { x: 2 })).toBe('True')
    })

    test('4 is even', async () => {
      expect(await render('{{ x is even }}', { x: 4 })).toBe('True')
    })

    test('0 is even', async () => {
      expect(await render('{{ x is even }}', { x: 0 })).toBe('True')
    })

    test('1 is not even', async () => {
      expect(await render('{{ x is even }}', { x: 1 })).toBe('False')
    })

    test('3 is not even', async () => {
      expect(await render('{{ x is even }}', { x: 3 })).toBe('False')
    })

    test('-2 is even', async () => {
      expect(await render('{{ x is even }}', { x: -2 })).toBe('True')
    })

    test('-3 is not even', async () => {
      expect(await render('{{ x is even }}', { x: -3 })).toBe('False')
    })

    test('works in if condition', async () => {
      expect(await render('{% if n is even %}yes{% endif %}', { n: 6 })).toBe('yes')
      expect(await render('{% if n is even %}yes{% endif %}', { n: 7 })).toBe('')
    })
  })

  describe('odd', () => {
    test('1 is odd', async () => {
      expect(await render('{{ x is odd }}', { x: 1 })).toBe('True')
    })

    test('3 is odd', async () => {
      expect(await render('{{ x is odd }}', { x: 3 })).toBe('True')
    })

    test('2 is not odd', async () => {
      expect(await render('{{ x is odd }}', { x: 2 })).toBe('False')
    })

    test('0 is not odd', async () => {
      expect(await render('{{ x is odd }}', { x: 0 })).toBe('False')
    })

    test('-1 is odd', async () => {
      expect(await render('{{ x is odd }}', { x: -1 })).toBe('True')
    })

    test('-2 is not odd', async () => {
      expect(await render('{{ x is odd }}', { x: -2 })).toBe('False')
    })

    test('negated with is not', async () => {
      expect(await render('{{ x is not odd }}', { x: 2 })).toBe('True')
      expect(await render('{{ x is not odd }}', { x: 1 })).toBe('False')
    })
  })

  describe('number', () => {
    test('integer is number', async () => {
      expect(await render('{{ x is number }}', { x: 42 })).toBe('True')
    })

    test('float is number', async () => {
      expect(await render('{{ x is number }}', { x: 3.14 })).toBe('True')
    })

    test('zero is number', async () => {
      expect(await render('{{ x is number }}', { x: 0 })).toBe('True')
    })

    test('negative number is number', async () => {
      expect(await render('{{ x is number }}', { x: -5 })).toBe('True')
    })

    test('string is not number', async () => {
      expect(await render('{{ x is number }}', { x: 'hello' })).toBe('False')
    })

    test('numeric string is not number', async () => {
      expect(await render('{{ x is number }}', { x: '42' })).toBe('False')
    })

    test('null is not number', async () => {
      expect(await render('{{ x is number }}', { x: null })).toBe('False')
    })

    test('boolean is not number', async () => {
      expect(await render('{{ x is number }}', { x: true })).toBe('False')
    })

    test('NaN is not number (special case)', async () => {
      expect(await render('{{ x is number }}', { x: NaN })).toBe('False')
    })

    test('Infinity is number', async () => {
      expect(await render('{{ x is number }}', { x: Infinity })).toBe('True')
    })
  })

  describe('integer', () => {
    test('42 is integer', async () => {
      expect(await render('{{ x is integer }}', { x: 42 })).toBe('True')
    })

    test('0 is integer', async () => {
      expect(await render('{{ x is integer }}', { x: 0 })).toBe('True')
    })

    test('-5 is integer', async () => {
      expect(await render('{{ x is integer }}', { x: -5 })).toBe('True')
    })

    test('3.14 is not integer', async () => {
      expect(await render('{{ x is integer }}', { x: 3.14 })).toBe('False')
    })

    test('3.0 is integer (whole number as float)', async () => {
      expect(await render('{{ x is integer }}', { x: 3.0 })).toBe('True')
    })

    test('string is not integer', async () => {
      expect(await render('{{ x is integer }}', { x: '42' })).toBe('False')
    })
  })

  describe('float', () => {
    test('3.14 is float', async () => {
      expect(await render('{{ x is float }}', { x: 3.14 })).toBe('True')
    })

    test('integer is not float', async () => {
      // Our float test distinguishes integers from floats
      expect(await render('{{ x is float }}', { x: 42 })).toBe('False')
    })

    test('string is not float', async () => {
      expect(await render('{{ x is float }}', { x: '3.14' })).toBe('False')
    })
  })

  // ==================== Type Tests ====================

  describe('defined', () => {
    test('existing variable is defined', async () => {
      expect(await render('{{ x is defined }}', { x: 42 })).toBe('True')
    })

    test('missing variable is not defined', async () => {
      expect(await render('{{ x is defined }}', {})).toBe('False')
    })

    test('null value is defined', async () => {
      expect(await render('{{ x is defined }}', { x: null })).toBe('True')
    })

    test('undefined value is still defined (exists in context)', async () => {
      // A variable set to undefined still exists in the context
      // So it IS defined, even though its value is undefined
      expect(await render('{{ x is defined }}', { x: undefined })).toBe('True')
    })

    test('empty string is defined', async () => {
      expect(await render('{{ x is defined }}', { x: '' })).toBe('True')
    })

    test('false is defined', async () => {
      expect(await render('{{ x is defined }}', { x: false })).toBe('True')
    })

    test('zero is defined', async () => {
      expect(await render('{{ x is defined }}', { x: 0 })).toBe('True')
    })

    test('works in if condition', async () => {
      expect(
        await render('{% if x is defined %}exists{% else %}missing{% endif %}', { x: 1 })
      ).toBe('exists')
      expect(await render('{% if x is defined %}exists{% else %}missing{% endif %}', {})).toBe(
        'missing'
      )
    })
  })

  describe('undefined', () => {
    test('missing variable is undefined', async () => {
      expect(await render('{{ x is undefined }}', {})).toBe('True')
    })

    test('existing variable is not undefined', async () => {
      expect(await render('{{ x is undefined }}', { x: 42 })).toBe('False')
    })

    test('null is not undefined', async () => {
      expect(await render('{{ x is undefined }}', { x: null })).toBe('False')
    })

    test('JS undefined value is not undefined test (exists in context)', async () => {
      // A variable explicitly set to undefined still exists in context
      // So it's not "undefined" in the Jinja2 sense (missing from context)
      expect(await render('{{ x is undefined }}', { x: undefined })).toBe('False')
    })
  })

  describe('none', () => {
    test('null is none', async () => {
      expect(await render('{{ x is none }}', { x: null })).toBe('True')
    })

    test('undefined is not none', async () => {
      expect(await render('{{ x is none }}', {})).toBe('False')
    })

    test('empty string is not none', async () => {
      expect(await render('{{ x is none }}', { x: '' })).toBe('False')
    })

    test('false is not none', async () => {
      expect(await render('{{ x is none }}', { x: false })).toBe('False')
    })

    test('zero is not none', async () => {
      expect(await render('{{ x is none }}', { x: 0 })).toBe('False')
    })

    test('works with None literal', async () => {
      expect(await render('{{ None is none }}', {})).toBe('True')
    })

    test('negated with is not', async () => {
      expect(await render('{{ x is not none }}', { x: 42 })).toBe('True')
      expect(await render('{{ x is not none }}', { x: null })).toBe('False')
    })
  })

  describe('string', () => {
    test('string value is string', async () => {
      expect(await render('{{ x is string }}', { x: 'hello' })).toBe('True')
    })

    test('empty string is string', async () => {
      expect(await render('{{ x is string }}', { x: '' })).toBe('True')
    })

    test('number is not string', async () => {
      expect(await render('{{ x is string }}', { x: 42 })).toBe('False')
    })

    test('boolean is not string', async () => {
      expect(await render('{{ x is string }}', { x: true })).toBe('False')
    })

    test('null is not string', async () => {
      expect(await render('{{ x is string }}', { x: null })).toBe('False')
    })

    test('array is not string', async () => {
      expect(await render('{{ x is string }}', { x: ['a', 'b'] })).toBe('False')
    })
  })

  describe('sequence', () => {
    test('array is sequence', async () => {
      expect(await render('{{ x is sequence }}', { x: [1, 2, 3] })).toBe('True')
    })

    test('empty array is sequence', async () => {
      expect(await render('{{ x is sequence }}', { x: [] })).toBe('True')
    })

    test('string is sequence', async () => {
      expect(await render('{{ x is sequence }}', { x: 'hello' })).toBe('True')
    })

    test('object is not sequence', async () => {
      expect(await render('{{ x is sequence }}', { x: { a: 1 } })).toBe('False')
    })

    test('number is not sequence', async () => {
      expect(await render('{{ x is sequence }}', { x: 42 })).toBe('False')
    })

    test('null is not sequence', async () => {
      expect(await render('{{ x is sequence }}', { x: null })).toBe('False')
    })
  })

  describe('mapping', () => {
    test('object is mapping', async () => {
      expect(await render('{{ x is mapping }}', { x: { a: 1, b: 2 } })).toBe('True')
    })

    test('empty object is mapping', async () => {
      expect(await render('{{ x is mapping }}', { x: {} })).toBe('True')
    })

    test('array is not mapping', async () => {
      expect(await render('{{ x is mapping }}', { x: [1, 2] })).toBe('False')
    })

    test('string is not mapping', async () => {
      expect(await render('{{ x is mapping }}', { x: 'hello' })).toBe('False')
    })

    test('null is not mapping', async () => {
      expect(await render('{{ x is mapping }}', { x: null })).toBe('False')
    })

    test('number is not mapping', async () => {
      expect(await render('{{ x is mapping }}', { x: 42 })).toBe('False')
    })
  })

  describe('iterable', () => {
    test('array is iterable', async () => {
      expect(await render('{{ x is iterable }}', { x: [1, 2, 3] })).toBe('True')
    })

    test('string is iterable', async () => {
      expect(await render('{{ x is iterable }}', { x: 'hello' })).toBe('True')
    })

    test('plain object is not iterable', async () => {
      // Plain objects don't have Symbol.iterator
      expect(await render('{{ x is iterable }}', { x: { a: 1 } })).toBe('False')
    })

    test('Map is iterable', async () => {
      expect(await render('{{ x is iterable }}', { x: new Map([['a', 1]]) })).toBe('True')
    })

    test('number is not iterable', async () => {
      expect(await render('{{ x is iterable }}', { x: 42 })).toBe('False')
    })

    test('null is not iterable', async () => {
      expect(await render('{{ x is iterable }}', { x: null })).toBe('False')
    })

    test('boolean is not iterable', async () => {
      expect(await render('{{ x is iterable }}', { x: true })).toBe('False')
    })
  })

  describe('callable', () => {
    test('function is callable', async () => {
      expect(await render('{{ x is callable }}', { x: () => {} })).toBe('True')
    })

    test('arrow function is callable', async () => {
      expect(await render('{{ x is callable }}', { x: (a: number) => a * 2 })).toBe('True')
    })

    test('object is not callable', async () => {
      expect(await render('{{ x is callable }}', { x: { a: 1 } })).toBe('False')
    })

    test('string is not callable', async () => {
      expect(await render('{{ x is callable }}', { x: 'hello' })).toBe('False')
    })

    test('number is not callable', async () => {
      expect(await render('{{ x is callable }}', { x: 42 })).toBe('False')
    })

    test('null is not callable', async () => {
      expect(await render('{{ x is callable }}', { x: null })).toBe('False')
    })
  })

  describe('boolean', () => {
    test('true is boolean', async () => {
      expect(await render('{{ x is boolean }}', { x: true })).toBe('True')
    })

    test('false is boolean', async () => {
      expect(await render('{{ x is boolean }}', { x: false })).toBe('True')
    })

    test('number is not boolean', async () => {
      expect(await render('{{ x is boolean }}', { x: 1 })).toBe('False')
    })

    test('string is not boolean', async () => {
      expect(await render('{{ x is boolean }}', { x: 'true' })).toBe('False')
    })

    test('null is not boolean', async () => {
      expect(await render('{{ x is boolean }}', { x: null })).toBe('False')
    })
  })

  // ==================== Comparison Tests ====================

  describe('eq / equalto / ==', () => {
    test('equal numbers', async () => {
      expect(await render('{{ x is eq(5) }}', { x: 5 })).toBe('True')
    })

    test('unequal numbers', async () => {
      expect(await render('{{ x is eq(5) }}', { x: 3 })).toBe('False')
    })

    test('equal strings', async () => {
      expect(await render('{{ x is eq("hello") }}', { x: 'hello' })).toBe('True')
    })

    test('equalto alias', async () => {
      expect(await render('{{ x is equalto(5) }}', { x: 5 })).toBe('True')
    })

    test('sameas alias', async () => {
      expect(await render('{{ x is sameas(y) }}', { x: 5, y: 5 })).toBe('True')
    })

    test('type coercion', async () => {
      // In Jinja2, equality is strict by default
      expect(await render('{{ x is eq("5") }}', { x: 5 })).toBe('False')
    })
  })

  describe('ne / notequalto', () => {
    test('not equal numbers', async () => {
      expect(await render('{{ x is ne(5) }}', { x: 3 })).toBe('True')
    })

    test('equal numbers', async () => {
      expect(await render('{{ x is ne(5) }}', { x: 5 })).toBe('False')
    })

    test('not equal strings', async () => {
      expect(await render('{{ x is ne("world") }}', { x: 'hello' })).toBe('True')
    })
  })

  describe('lt / lessthan', () => {
    test('3 is less than 5', async () => {
      expect(await render('{{ x is lt(5) }}', { x: 3 })).toBe('True')
    })

    test('5 is not less than 3', async () => {
      expect(await render('{{ x is lt(3) }}', { x: 5 })).toBe('False')
    })

    test('5 is not less than 5', async () => {
      expect(await render('{{ x is lt(5) }}', { x: 5 })).toBe('False')
    })

    test('lessthan alias', async () => {
      expect(await render('{{ x is lessthan(5) }}', { x: 3 })).toBe('True')
    })

    test('negative numbers', async () => {
      expect(await render('{{ x is lt(0) }}', { x: -5 })).toBe('True')
    })
  })

  describe('le / less than or equal', () => {
    test('3 is less than or equal to 5', async () => {
      expect(await render('{{ x is le(5) }}', { x: 3 })).toBe('True')
    })

    test('5 is less than or equal to 5', async () => {
      expect(await render('{{ x is le(5) }}', { x: 5 })).toBe('True')
    })

    test('7 is not less than or equal to 5', async () => {
      expect(await render('{{ x is le(5) }}', { x: 7 })).toBe('False')
    })
  })

  describe('gt / greaterthan', () => {
    test('5 is greater than 3', async () => {
      expect(await render('{{ x is gt(3) }}', { x: 5 })).toBe('True')
    })

    test('3 is not greater than 5', async () => {
      expect(await render('{{ x is gt(5) }}', { x: 3 })).toBe('False')
    })

    test('5 is not greater than 5', async () => {
      expect(await render('{{ x is gt(5) }}', { x: 5 })).toBe('False')
    })

    test('greaterthan alias', async () => {
      expect(await render('{{ x is greaterthan(3) }}', { x: 5 })).toBe('True')
    })
  })

  describe('ge / greater than or equal', () => {
    test('5 is greater than or equal to 3', async () => {
      expect(await render('{{ x is ge(3) }}', { x: 5 })).toBe('True')
    })

    test('5 is greater than or equal to 5', async () => {
      expect(await render('{{ x is ge(5) }}', { x: 5 })).toBe('True')
    })

    test('3 is not greater than or equal to 5', async () => {
      expect(await render('{{ x is ge(5) }}', { x: 3 })).toBe('False')
    })
  })

  // ==================== String Tests ====================

  describe('lower', () => {
    test('lowercase string is lower', async () => {
      expect(await render('{{ x is lower }}', { x: 'hello' })).toBe('True')
    })

    test('uppercase string is not lower', async () => {
      expect(await render('{{ x is lower }}', { x: 'HELLO' })).toBe('False')
    })

    test('mixed case is not lower', async () => {
      expect(await render('{{ x is lower }}', { x: 'Hello' })).toBe('False')
    })

    test('empty string has no case', async () => {
      // Empty string has no case, so it's neither lower nor upper
      expect(await render('{{ x is lower }}', { x: '' })).toBe('False')
    })

    test('numbers in string', async () => {
      expect(await render('{{ x is lower }}', { x: 'hello123' })).toBe('True')
    })
  })

  describe('upper', () => {
    test('uppercase string is upper', async () => {
      expect(await render('{{ x is upper }}', { x: 'HELLO' })).toBe('True')
    })

    test('lowercase string is not upper', async () => {
      expect(await render('{{ x is upper }}', { x: 'hello' })).toBe('False')
    })

    test('mixed case is not upper', async () => {
      expect(await render('{{ x is upper }}', { x: 'Hello' })).toBe('False')
    })

    test('empty string has no case', async () => {
      // Empty string has no case, so it's neither lower nor upper
      expect(await render('{{ x is upper }}', { x: '' })).toBe('False')
    })

    test('numbers in string', async () => {
      expect(await render('{{ x is upper }}', { x: 'HELLO123' })).toBe('True')
    })
  })

  // ==================== Collection Tests ====================

  describe('in', () => {
    test('item in array', async () => {
      expect(await render('{{ x is in(items) }}', { x: 2, items: [1, 2, 3] })).toBe('True')
    })

    test('item not in array', async () => {
      expect(await render('{{ x is in(items) }}', { x: 5, items: [1, 2, 3] })).toBe('False')
    })

    test('char in string', async () => {
      expect(await render('{{ x is in(s) }}', { x: 'e', s: 'hello' })).toBe('True')
    })

    test('key in object', async () => {
      expect(await render('{{ x is in(obj) }}', { x: 'a', obj: { a: 1, b: 2 } })).toBe('True')
    })

    test('key not in object', async () => {
      expect(await render('{{ x is in(obj) }}', { x: 'c', obj: { a: 1, b: 2 } })).toBe('False')
    })
  })

  describe('sameas (identity)', () => {
    test('same object reference', async () => {
      const obj = { a: 1 }
      expect(await render('{{ x is sameas(y) }}', { x: obj, y: obj })).toBe('True')
    })

    test('different objects with same content', async () => {
      expect(await render('{{ x is sameas(y) }}', { x: { a: 1 }, y: { a: 1 } })).toBe('False')
    })

    test('same primitive', async () => {
      expect(await render('{{ x is sameas(y) }}', { x: 5, y: 5 })).toBe('True')
    })

    test('same string', async () => {
      expect(await render('{{ x is sameas(y) }}', { x: 'hello', y: 'hello' })).toBe('True')
    })
  })

  // ==================== Boolean Tests (Truthy/Falsy) ====================

  describe('true', () => {
    test('true is true', async () => {
      expect(await render('{{ x is true }}', { x: true })).toBe('True')
    })

    test('false is not true', async () => {
      expect(await render('{{ x is true }}', { x: false })).toBe('False')
    })

    test('1 is not true (strict)', async () => {
      expect(await render('{{ x is true }}', { x: 1 })).toBe('False')
    })

    test('non-empty string is not true (strict)', async () => {
      expect(await render('{{ x is true }}', { x: 'yes' })).toBe('False')
    })
  })

  describe('false', () => {
    test('false is false', async () => {
      expect(await render('{{ x is false }}', { x: false })).toBe('True')
    })

    test('true is not false', async () => {
      expect(await render('{{ x is false }}', { x: true })).toBe('False')
    })

    test('0 is not false (strict)', async () => {
      expect(await render('{{ x is false }}', { x: 0 })).toBe('False')
    })

    test('empty string is not false (strict)', async () => {
      expect(await render('{{ x is false }}', { x: '' })).toBe('False')
    })
  })

  // ==================== Edge Cases and Complex Usage ====================

  describe('Combined Tests', () => {
    test('multiple tests with and', async () => {
      expect(await render('{% if x is number and x is gt(0) %}positive{% endif %}', { x: 5 })).toBe(
        'positive'
      )
      expect(
        await render('{% if x is number and x is gt(0) %}positive{% endif %}', { x: -5 })
      ).toBe('')
    })

    test('multiple tests with or', async () => {
      expect(
        await render('{% if x is none or x is undefined %}empty{% endif %}', { x: null })
      ).toBe('empty')
      expect(await render('{% if x is none or x is undefined %}empty{% endif %}', {})).toBe('empty')
    })

    test('test with ternary', async () => {
      expect(await render('{{ "even" if n is even else "odd" }}', { n: 4 })).toBe('even')
      expect(await render('{{ "even" if n is even else "odd" }}', { n: 5 })).toBe('odd')
    })

    test('test in loop', async () => {
      const tmpl = '{% for n in nums %}{% if n is even %}{{ n }}{% endif %}{% endfor %}'
      expect(await render(tmpl, { nums: [1, 2, 3, 4, 5, 6] })).toBe('246')
    })

    test('nested test expressions', async () => {
      expect(
        await render('{% if x is defined and x is number and x is gt(0) %}valid{% endif %}', {
          x: 10,
        })
      ).toBe('valid')
      expect(
        await render('{% if x is defined and x is number and x is gt(0) %}valid{% endif %}', {})
      ).toBe('')
    })
  })

  describe('Error Handling', () => {
    test('unknown test should error', async () => {
      await expect(render('{{ x is unknowntest }}', { x: 1 })).rejects.toThrow()
    })

    test('test with missing argument returns False (graceful handling)', async () => {
      // divisibleby with no argument uses undefined, which becomes NaN
      // NaN % NaN is NaN !== 0, so it returns False
      const result = await render('{{ x is divisibleby }}', { x: 9 })
      expect(result).toBe('False')
    })
  })

  // ==================== Whitespace and Syntax Variations ====================

  describe('Syntax Variations', () => {
    test('test without parentheses for no-arg tests', async () => {
      expect(await render('{{ x is even }}', { x: 4 })).toBe('True')
      expect(await render('{{ x is odd }}', { x: 3 })).toBe('True')
    })

    test('test with parentheses for no-arg tests', async () => {
      expect(await render('{{ x is even() }}', { x: 4 })).toBe('True')
      expect(await render('{{ x is odd() }}', { x: 3 })).toBe('True')
    })

    test('whitespace around test name', async () => {
      expect(await render('{{ x is  even }}', { x: 4 })).toBe('True')
      expect(await render('{{ x  is even }}', { x: 4 })).toBe('True')
    })

    test('test in output vs block', async () => {
      expect(await render('{{ x is even }}', { x: 4 })).toBe('True')
      expect(await render('{% if x is even %}yes{% endif %}', { x: 4 })).toBe('yes')
    })
  })

  // ==================== Real-world Use Cases ====================

  describe('Real-world Examples', () => {
    test('form validation pattern', async () => {
      const tmpl = `{% if email is defined and email is string and email|length is gt(0) %}valid{% else %}invalid{% endif %}`
      expect(await render(tmpl, { email: 'test@example.com' })).toBe('valid')
      expect(await render(tmpl, { email: '' })).toBe('invalid')
      expect(await render(tmpl, {})).toBe('invalid')
    })

    test('pagination pattern', async () => {
      const tmpl = `{% if page is divisibleby(10) %}milestone{% endif %}`
      expect(await render(tmpl, { page: 10 })).toBe('milestone')
      expect(await render(tmpl, { page: 20 })).toBe('milestone')
      expect(await render(tmpl, { page: 15 })).toBe('')
    })

    test('alternating rows pattern', async () => {
      const tmpl =
        '{% for i in items %}<tr class="{% if loop.index is even %}even{% else %}odd{% endif %}">{{ i }}</tr>{% endfor %}'
      const result = await render(tmpl, { items: ['a', 'b', 'c'] })
      expect(result).toBe('<tr class="odd">a</tr><tr class="even">b</tr><tr class="odd">c</tr>')
    })

    test('type checking before operations', async () => {
      const tmpl =
        '{% if data is mapping %}{{ data.name }}{% elif data is sequence %}{{ data|join:", " }}{% else %}{{ data }}{% endif %}'
      expect(await render(tmpl, { data: { name: 'John' } })).toBe('John')
      expect(await render(tmpl, { data: ['a', 'b', 'c'] })).toBe('a, b, c')
      expect(await render(tmpl, { data: 'plain text' })).toBe('plain text')
    })
  })
})
