/**
 * Example 04: Jinja2 Test Functions
 * Demonstrates all built-in test functions using 'is' syntax
 */
import { Environment } from '../src';

async function main() {
  const env = new Environment({ autoescape: true });

  console.log('=== Test Functions Demo ===\n');

  // ==================== Number Tests ====================
  console.log('=== Number Tests ===\n');

  const numberTests = `
Number Tests:
- 4 is even: {{ 4 is even }}
- 5 is even: {{ 5 is even }}
- 7 is odd: {{ 7 is odd }}
- 8 is odd: {{ 8 is odd }}
- 15 is divisibleby(3): {{ 15 is divisibleby(3) }}
- 15 is divisibleby(4): {{ 15 is divisibleby(4) }}
- 3.14 is number: {{ float_val is number }}
- 42 is integer: {{ int_val is integer }}
- 3.14 is integer: {{ float_val is integer }}
- 3.14 is float: {{ float_val is float }}
- 42 is float: {{ int_val is float }}

Comparison Tests:
- 10 is gt(5): {{ 10 is gt(5) }}
- 10 is lt(20): {{ 10 is lt(20) }}
- 10 is ge(10): {{ 10 is ge(10) }}
- 10 is le(10): {{ 10 is le(10) }}
`;

  console.log(
    await env.renderString(numberTests, {
      float_val: 3.14,
      int_val: 42,
    })
  );

  // ==================== Type Tests ====================
  console.log('=== Type Tests ===\n');

  const typeTests = `
Type Tests:
- name is defined: {{ name is defined }}
- missing is defined: {{ missing is defined }}
- missing is undefined: {{ missing is undefined }}
- null_val is none: {{ null_val is none }}
- name is string: {{ name is string }}
- number is string: {{ number is string }}
- flag is boolean: {{ flag is boolean }}
- items is sequence: {{ items is sequence }}
- data is mapping: {{ data is mapping }}
- func is callable: {{ func is callable }}

Iterable Tests:
- string is iterable: {{ name is iterable }}
- array is iterable: {{ items is iterable }}
- number is iterable: {{ number is iterable }}
`;

  console.log(
    await env.renderString(typeTests, {
      name: 'John',
      number: 42,
      null_val: null,
      flag: true,
      items: [1, 2, 3],
      data: { key: 'value' },
      func: () => 'hello',
    })
  );

  // ==================== String Case Tests ====================
  console.log('=== String Case Tests ===\n');

  const caseTests = `
Case Tests:
- "hello" is lower: {{ lower_str is lower }}
- "HELLO" is lower: {{ upper_str is lower }}
- "HELLO" is upper: {{ upper_str is upper }}
- "hello" is upper: {{ lower_str is upper }}
- "Hello" is upper: {{ mixed_str is upper }}
- "Hello" is lower: {{ mixed_str is lower }}
`;

  console.log(
    await env.renderString(caseTests, {
      lower_str: 'hello',
      upper_str: 'HELLO',
      mixed_str: 'Hello',
    })
  );

  // ==================== Collection Tests ====================
  console.log('=== Collection Tests ===\n');

  const collectionTests = `
Collection Tests:
- empty array is empty: {{ empty_arr is empty }}
- [1,2,3] is empty: {{ items is empty }}
- empty string is empty: {{ empty_str is empty }}
- empty object is empty: {{ empty_obj is empty }}
- {a:1} is empty: {{ obj is empty }}

Equality Tests:
- 5 is eq(5): {{ 5 is eq(5) }}
- 5 is eq(6): {{ 5 is eq(6) }}
- x is sameas(y) [same ref]: {{ x is sameas(y) }}

Truthiness Tests:
- true is truthy: {{ true_val is truthy }}
- false is truthy: {{ false_val is truthy }}
- "" is truthy: {{ empty_str is truthy }}
- "hello" is truthy: {{ str_val is truthy }}
- 0 is truthy: {{ zero is truthy }}
- 1 is truthy: {{ one is truthy }}
- [] is truthy: {{ empty_arr is truthy }}
- [1] is truthy: {{ items is truthy }}
- false is falsy: {{ false_val is falsy }}
- true is falsy: {{ true_val is falsy }}

Boolean Tests:
- true is true: {{ true_val is true }}
- false is true: {{ false_val is true }}
- false is false: {{ false_val is false }}
- true is false: {{ true_val is false }}
`;

  const refObj = { x: 1 };
  console.log(
    await env.renderString(collectionTests, {
      empty_arr: [],
      items: [1, 2, 3],
      empty_str: '',
      str_val: 'hello',
      empty_obj: {},
      obj: { a: 1 },
      true_val: true,
      false_val: false,
      zero: 0,
      one: 1,
      x: refObj,
      y: refObj,
    })
  );

  // ==================== Negated Tests ====================
  console.log('=== Negated Tests ===\n');

  const negatedTests = `
Negated Tests (is not):
- 5 is not even: {{ 5 is not even }}
- 4 is not even: {{ 4 is not even }}
- 10 is not divisibleby(3): {{ 10 is not divisibleby(3) }}
- missing is not defined: {{ missing is not defined }}
- name is not undefined: {{ name is not undefined }}
- empty is not empty: {{ items is not empty }}
`;

  console.log(
    await env.renderString(negatedTests, {
      name: 'John',
      items: [1, 2, 3],
    })
  );

  // ==================== Practical Examples ====================
  console.log('=== Practical Examples ===\n');

  const practicalTests = `
{% for item in items %}
{% if loop.index is even %}
  <tr class="even">{{ item }}</tr>
{% else %}
  <tr class="odd">{{ item }}</tr>
{% endif %}
{% endfor %}

{% if user is defined and user.email is string %}
User email: {{ user.email }}
{% endif %}

{% if count is divisibleby(10) %}
Milestone reached: {{ count }}!
{% endif %}

{% if data is mapping %}
Processing object with {{ data|length }} keys
{% elif data is sequence %}
Processing array with {{ data|length }} items
{% else %}
Processing scalar: {{ data }}
{% endif %}
`;

  console.log(
    await env.renderString(practicalTests, {
      items: ['a', 'b', 'c', 'd'],
      user: { email: 'test@example.com', name: 'Test' },
      count: 100,
      data: { name: 'John', age: 30 },
    })
  );
}

main().catch(console.error);
