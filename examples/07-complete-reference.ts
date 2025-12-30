/**
 * Binja Complete Reference - All Tags, Filters, and Tests
 *
 * This example demonstrates every feature available in Binja:
 * - All template tags (if, for, set, with, macro, raw, etc.)
 * - All 70+ built-in filters
 * - All 30+ built-in tests
 * - Template inheritance
 * - Whitespace control
 * - UTF-8 support
 */

import { Environment } from '../src'
import { isNativeAccelerated } from '../src/lexer'

async function main() {
  const env = new Environment({ autoescape: true })

  console.log('='.repeat(60))
  console.log('BINJA COMPLETE REFERENCE')
  console.log(`Using native Zig FFI: ${isNativeAccelerated()}`)
  console.log('='.repeat(60))

  // ============================================================
  // 1. BASIC VARIABLE OUTPUT
  // ============================================================
  console.log('\n=== 1. BASIC VARIABLE OUTPUT ===\n')

  const basicVars = `
Simple variable: {{ name }}
Object access: {{ user.name }} ({{ user.email }})
Array access: {{ items[0] }}, {{ items[1] }}
Nested: {{ data.users[0].name }}
`
  console.log(await env.renderString(basicVars, {
    name: 'World',
    user: { name: 'Alice', email: 'alice@example.com' },
    items: ['first', 'second', 'third'],
    data: { users: [{ name: 'Bob' }] }
  }))

  // ============================================================
  // 2. ALL STRING FILTERS (22 filters)
  // ============================================================
  console.log('\n=== 2. STRING FILTERS ===\n')

  const stringFilters = `
--- Case Transformation ---
upper: {{ text|upper }}
lower: {{ text|lower }}
capitalize: {{ text|capitalize }}
capfirst: {{ lower_text|capfirst }}
title: {{ text|title }}

--- Whitespace & Cleanup ---
trim: "{{ padded|trim }}"
striptags: {{ html|striptags }}
slugify: {{ title|slugify }}
cut (remove 'o'): {{ text|cut:"o" }}

--- Escaping ---
escape: {{ dangerous|escape }}
e (alias): {{ dangerous|e }}
escapejs: {{ quote|escapejs }}
safe (no escape): {{ safe_html|safe }}
forceescape: {{ already_safe|forceescape }}

--- Truncation ---
truncatechars:15: {{ long_text|truncatechars:15 }}
truncatewords:3: {{ long_text|truncatewords:3 }}

--- Alignment ---
center:20: |{{ short|center:20 }}|
ljust:15: |{{ short|ljust:15 }}|
rjust:15: |{{ short|rjust:15 }}|

--- Line Handling ---
wordcount: {{ long_text|wordcount }} words
linebreaks: {{ multiline|linebreaks }}
linebreaksbr: {{ multiline|linebreaksbr }}
linenumbers: {{ code|linenumbers }}

--- Advanced ---
wordwrap:20: {{ long_text|wordwrap:20 }}
indent:4: {{ short|indent:4 }}
format: {{ template|format:"Alice" }}
string: {{ num|string }}
`
  console.log(await env.renderString(stringFilters, {
    text: 'Hello World',
    lower_text: 'hello there',
    padded: '  spaces  ',
    html: '<p>Hello <b>World</b></p>',
    title: 'My Amazing Blog Post!',
    dangerous: '<script>alert("xss")</script>',
    already_safe: '<b>bold</b>',
    quote: 'He said "Hello"',
    safe_html: '<strong>Bold</strong>',
    long_text: 'This is a very long text that should be truncated',
    short: 'Hi',
    multiline: 'Line 1\nLine 2',
    code: 'line1\nline2',
    template: 'Name: %s, Age: %s',
    num: 42
  }))

  // ============================================================
  // 3. ALL NUMBER FILTERS
  // ============================================================
  console.log('\n=== 3. NUMBER FILTERS ===\n')

  const numberFilters = `
--- Basic Math ---
abs: {{ negative|abs }}
round: {{ pi|round }}
round:2: {{ pi|round:2 }}
int: {{ float_num|int }}
float: {{ int_num|float }}

--- Formatting ---
floatformat: {{ price|floatformat }}
floatformat:2: {{ price|floatformat:2 }}
add:10: {{ num|add:10 }}

--- File Sizes ---
512 bytes: {{ bytes|filesizeformat }}
10240 bytes: {{ kb|filesizeformat }}
5767168 bytes: {{ mb|filesizeformat }}
2684354560 bytes: {{ gb|filesizeformat }}

--- Checks ---
divisibleby 3: {{ twelve|divisibleby:3 }}
divisibleby 5: {{ twelve|divisibleby:5 }}
`
  console.log(await env.renderString(numberFilters, {
    negative: -42,
    pi: 3.14159,
    float_num: 3.7,
    int_num: 42,
    price: 19.5,
    num: 5,
    bytes: 512,
    kb: 10240,
    mb: 5767168,
    gb: 2684354560,
    twelve: 12
  }))

  // ============================================================
  // 4. ALL LIST/ARRAY FILTERS (25 filters)
  // ============================================================
  console.log('\n=== 4. LIST/ARRAY FILTERS ===\n')

  const listFilters = `
--- Basic ---
length: {{ items|length }}
length_is 4: {{ items|length_is:4 }}
first: {{ items|first }}
last: {{ items|last }}
join: {{ items|join:", " }}
reverse: {{ items|reverse|join:", " }}

--- Slicing ---
slice:"1:3": {{ items|slice:"1:3"|join:", " }}
slice:":2": {{ items|slice:":2"|join:", " }}
slice:"2:": {{ items|slice:"2:"|join:", " }}

--- Sorting ---
sort: {{ numbers|sort|join:", " }}
unique: {{ duplicates|unique|join:", " }}
dictsort by name: {% for u in users|dictsort:"name" %}{{ u.name }} {% endfor %}
dictsortreversed: {% for u in users|dictsortreversed:"name" %}{{ u.name }} {% endfor %}

--- Aggregation ---
sum: {{ numbers|sum }}
min: {{ numbers|min }}
max: {{ numbers|max }}

--- Transformation ---
make_list: {{ word|make_list|join:", " }}
list: {{ word|list|join:", " }}
map (get names): {{ users|map:"name"|join:", " }}
attr: {{ user|attr:"name" }}

--- Filtering ---
select (truthy): {{ mixed|select|join:", " }}
reject (falsy): {{ mixed|reject|length }}
selectattr: {% for u in users|selectattr:"active" %}{{ u.name }} {% endfor %}
rejectattr: {% for u in users|rejectattr:"active" %}{{ u.name }} {% endfor %}

--- Batching ---
batch:2: {% for row in items|batch:2 %}[{{ row|join:", " }}] {% endfor %}
columns:2: {% for row in items|columns:2 %}[{{ row|join:", " }}] {% endfor %}

--- Grouping ---
groupby: {% for g in products|groupby:"category" %}{{ g.grouper }}: {{ g.list|length }} items; {% endfor %}
`
  console.log(await env.renderString(listFilters, {
    items: ['apple', 'banana', 'cherry', 'date'],
    numbers: [3, 1, 4, 1, 5, 9, 2, 6],
    duplicates: [1, 2, 2, 3, 3, 3],
    word: 'hello',
    user: { name: 'Alice', age: 25 },
    users: [
      { name: 'Charlie', age: 30, active: true },
      { name: 'Alice', age: 25, active: false },
      { name: 'Bob', age: 35, active: true }
    ],
    mixed: [0, 'hello', '', null, 42, false, 'world'],
    products: [
      { name: 'Laptop', category: 'Electronics' },
      { name: 'Phone', category: 'Electronics' },
      { name: 'Shirt', category: 'Clothing' }
    ]
  }))

  // ============================================================
  // 5. DATE/TIME FILTERS
  // ============================================================
  console.log('\n=== 5. DATE/TIME FILTERS ===\n')

  const dateFilters = `
--- Date Formatting ---
Default: {{ now|date }}
Full: {{ now|date:"l, F j, Y" }}
Short: {{ now|date:"m/d/Y" }}
ISO: {{ now|date:"Y-m-d" }}

--- Time Formatting ---
Default: {{ now|time }}
12-hour: {{ now|time:"g:i A" }}
24-hour: {{ now|time:"H:i:s" }}

--- Relative Time ---
timesince (past): {{ past|timesince }}
timeuntil (future): {{ future|timeuntil }}
`
  console.log(await env.renderString(dateFilters, {
    now: new Date(),
    past: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    future: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2) // 2 days from now
  }))

  // ============================================================
  // 6. DEFAULT/CONDITIONAL FILTERS (5 filters)
  // ============================================================
  console.log('\n=== 6. DEFAULT/CONDITIONAL FILTERS ===\n')

  const defaultFilters = `
--- Default Values ---
default (undefined): {{ missing|default:"N/A" }}
d (alias): {{ missing|d:"N/A" }}
default (empty): {{ empty_str|default:"fallback" }}
default_if_none: {{ null_val|default_if_none:"was null" }}

--- Yes/No ---
yesno (true): {{ yes|yesno:"Active,Inactive,Unknown" }}
yesno (false): {{ no|yesno:"Active,Inactive,Unknown" }}
yesno (null): {{ maybe|yesno:"Active,Inactive,Unknown" }}

--- Pluralize ---
1 item{{ one|pluralize }}
5 item{{ five|pluralize }}
1 cherr{{ one|pluralize:"y,ies" }}
3 cherr{{ three|pluralize:"y,ies" }}
`
  console.log(await env.renderString(defaultFilters, {
    empty_str: '',
    null_val: null,
    yes: true,
    no: false,
    maybe: null,
    one: 1,
    five: 5,
    three: 3
  }))

  // ============================================================
  // 7. URL & JSON FILTERS (5 filters)
  // ============================================================
  console.log('\n=== 7. URL & JSON FILTERS ===\n')

  const urlJsonFilters = `
--- URL ---
urlencode: {{ query|urlencode }}
urlize: {{ text_with_url|urlize }}

--- JSON ---
json: {{ data|json }}
tojson (alias): {{ data|tojson }}
json (pretty): {{ data|json:2 }}
pprint: {{ data|pprint }}
`
  console.log(await env.renderString(urlJsonFilters, {
    query: 'hello world & foo=bar',
    text_with_url: 'Visit https://example.com for more!',
    data: { name: 'John', age: 30, hobbies: ['reading', 'coding'] }
  }))

  // ============================================================
  // 8. MISC FILTERS (4 filters)
  // ============================================================
  console.log('\n=== 8. MISC FILTERS ===\n')

  const miscFilters = `
--- Misc ---
random: {{ items|random }}
phone2numeric: {{ phone|phone2numeric }}

--- List Generation ---
unordered_list: {{ nested|unordered_list }}
`
  console.log(await env.renderString(miscFilters, {
    items: ['a', 'b', 'c', 'd'],
    phone: '1-800-CALL-ME',
    nested: ['Item 1', 'Item 2', ['Sub 1', 'Sub 2'], 'Item 3']
  }))

  // ============================================================
  // 9. CONDITIONALS (if/elif/else)
  // ============================================================
  console.log('\n=== 9. CONDITIONALS ===\n')

  const conditionals = `
--- Basic If ---
{% if logged_in %}Welcome back!{% else %}Please log in{% endif %}

--- Elif Chain ---
{% if score >= 90 %}Grade: A
{% elif score >= 80 %}Grade: B
{% elif score >= 70 %}Grade: C
{% elif score >= 60 %}Grade: D
{% else %}Grade: F{% endif %}

--- Complex Conditions ---
{% if user and user.admin %}Admin access granted
{% elif user %}Regular user: {{ user.name }}
{% else %}Guest mode{% endif %}

--- Operators ---
{% if x == 5 %}x equals 5{% endif %}
{% if x != 3 %}x not equal to 3{% endif %}
{% if x > 3 and x < 10 %}x is between 3 and 10{% endif %}
{% if not empty_list %}List is not empty{% endif %}
{% if items %}Has items{% endif %}
`
  console.log(await env.renderString(conditionals, {
    logged_in: true,
    score: 85,
    user: { name: 'Alice', admin: false },
    x: 5,
    empty_list: [],
    items: [1, 2, 3]
  }))

  // ============================================================
  // 10. ALL BUILT-IN TESTS (28 tests)
  // ============================================================
  console.log('\n=== 10. BUILT-IN TESTS ===\n')

  const tests = `
--- Number Tests (12) ---
10 is even: {{ 10 is even }}
7 is odd: {{ 7 is odd }}
12 is divisibleby 3: {{ 12 is divisibleby(3) }}
3.14 is number: {{ 3.14 is number }}
42 is integer: {{ 42 is integer }}
3.14 is float: {{ 3.14 is float }}
5 is gt 3: {{ 5 is gt(3) }}
5 is greaterthan 3: {{ 5 is greaterthan(3) }}
5 is lt 10: {{ 5 is lt(10) }}
5 is lessthan 10: {{ 5 is lessthan(10) }}
5 is ge 5: {{ 5 is ge(5) }}
5 is le 5: {{ 5 is le(5) }}

--- Type Tests (10) ---
name is defined: {{ name is defined }}
missing is undefined: {{ missing is undefined }}
null_val is none: {{ null_val is none }}
null_val is None: {{ null_val is None }}
flag is boolean: {{ flag is boolean }}
text is string: {{ text is string }}
obj is mapping: {{ obj is mapping }}
arr is sequence: {{ arr is sequence }}
arr is iterable: {{ arr is iterable }}
func is callable: {{ func is callable }}

--- String Tests (2) ---
"HELLO" is upper: {{ "HELLO" is upper }}
"hello" is lower: {{ "hello" is lower }}

--- Collection Tests (2) ---
[] is empty: {{ empty_arr is empty }}
"x" is in "xyz": {{ "x" is in("xyz") }}

--- Equality Tests (4) ---
5 is eq 5: {{ 5 is eq(5) }}
5 is equalto 5: {{ 5 is equalto(5) }}
5 is ne 3: {{ 5 is ne(3) }}
a is sameas a: {{ a is sameas(a) }}

--- Truthiness Tests (4) ---
1 is truthy: {{ 1 is truthy }}
0 is falsy: {{ 0 is falsy }}
true_val is true: {{ true_val is true }}
false_val is false: {{ false_val is false }}
`
  const a = {}
  console.log(await env.renderString(tests, {
    name: 'Alice',
    null_val: null,
    flag: true,
    text: 'hello',
    obj: { key: 'value' },
    arr: [1, 2, 3],
    empty_arr: [],
    a,
    true_val: true,
    false_val: false,
    func: () => {}
  }))

  // ============================================================
  // 11. LOOPS (for)
  // ============================================================
  console.log('\n=== 11. LOOPS ===\n')

  const loops = `
--- Basic Loop ---
{% for item in items %}{{ item }} {% endfor %}

--- Loop Variables ---
{% for item in items %}
  {{ loop.index }}/{{ loop.length }}: {{ item }}
  (first: {{ loop.first }}, last: {{ loop.last }})
{% endfor %}

--- Loop with Else ---
{% for item in empty %}{{ item }}{% else %}No items found{% endfor %}

--- Nested Loops ---
{% for category in categories %}
{{ category.name }}:
  {% for product in category.products %}
    - {{ product }}
  {% endfor %}
{% endfor %}

--- Loop with Test ---
{% for n in numbers %}{% if n is even %}{{ n }} {% endif %}{% endfor %}

--- Reversed ---
{% for item in items|reverse %}{{ item }} {% endfor %}
`
  console.log(await env.renderString(loops, {
    items: ['apple', 'banana', 'cherry'],
    empty: [],
    numbers: [1, 2, 3, 4, 5, 6, 7, 8],
    categories: [
      { name: 'Fruits', products: ['Apple', 'Banana'] },
      { name: 'Veggies', products: ['Carrot', 'Broccoli'] }
    ]
  }))

  // ============================================================
  // 12. SET & WITH STATEMENTS
  // ============================================================
  console.log('\n=== 12. SET & WITH STATEMENTS ===\n')

  const setWith = `
--- Set Statement ---
{% set greeting = "Hello" %}
{% set full_name = first ~ " " ~ last %}
{{ greeting }}, {{ full_name }}!

{% set items = ["a", "b", "c"] %}
Items: {{ items|join:", " }}

--- With Statement ---
{% with x = 10 %}
  x = {{ x }}
  {% with y = 20 %}
    y = {{ y }}
    x + y = {{ x + y }}
  {% endwith %}
{% endwith %}
`
  console.log(await env.renderString(setWith, {
    first: 'John',
    last: 'Doe'
  }))

  // ============================================================
  // 13. MACROS
  // ============================================================
  console.log('\n=== 13. MACROS ===\n')

  const macros = `
--- Basic Macro ---
{% macro button(text, type="primary") %}
<button class="btn btn-{{ type }}">{{ text }}</button>
{% endmacro %}

{{ button("Click me") }}
{{ button("Delete", "danger") }}
{{ button("Cancel", "secondary") }}

--- Macro with Caller ---
{% macro card(title) %}
<div class="card">
  <h3>{{ title }}</h3>
  <div class="content">{{ caller() }}</div>
</div>
{% endmacro %}

{% call card("Welcome") %}
  This is the card content with <strong>HTML</strong>.
{% endcall %}
`
  console.log(await env.renderString(macros, {}))

  // ============================================================
  // 14. RAW BLOCKS
  // ============================================================
  console.log('\n=== 14. RAW BLOCKS ===\n')

  const rawBlocks = `
--- Raw Block (no parsing) ---
{% raw %}
This {{ will }} {% not %} be {# parsed #}
Vue.js: {{ message }}
Angular: {{ data.value }}
{% endraw %}

--- Normal After Raw ---
This {{ status }} be parsed!
`
  console.log(await env.renderString(rawBlocks, { status: 'WILL' }))

  // ============================================================
  // 15. WHITESPACE CONTROL
  // ============================================================
  console.log('\n=== 15. WHITESPACE CONTROL ===\n')

  const whitespace = `
--- Without Control ---
[{% for i in nums %}{{ i }}{% endfor %}]

--- With Control (trim) ---
[{%- for i in nums -%}{{ i }}{%- endfor -%}]

--- Mixed ---
Items:
{%- for item in items %}
  - {{ item }}
{%- endfor %}
`
  console.log(await env.renderString(whitespace, {
    nums: [1, 2, 3],
    items: ['A', 'B', 'C']
  }))

  // ============================================================
  // 16. COMMENTS
  // ============================================================
  console.log('\n=== 16. COMMENTS ===\n')

  const comments = `
Before comment
{# This is a comment and will not appear in output #}
After comment
{#
   Multi-line
   comment
#}
End
`
  console.log(await env.renderString(comments, {}))

  // ============================================================
  // 17. UTF-8 SUPPORT
  // ============================================================
  console.log('\n=== 17. UTF-8 SUPPORT ===\n')

  const utf8 = `
--- International Characters ---
Currency: {{ price|currency:"€" }}
Japanese: {{ japanese }}
Emoji: {{ emoji }}
Chinese: {{ chinese }}
Arabic: {{ arabic }}
Russian: {{ russian }}

--- Filter with UTF-8 ---
Upper: {{ japanese|upper }}
Length: {{ chinese|length }} characters
`

  // Add custom currency filter for this test
  env.addFilter('currency', (value: number, symbol = '$') => {
    return `${symbol}${value.toFixed(2)}`
  })

  console.log(await env.renderString(utf8, {
    price: 99.99,
    japanese: 'こんにちは',
    emoji: '🎉🚀✨',
    chinese: '你好世界',
    arabic: 'مرحبا',
    russian: 'Привет'
  }))

  // ============================================================
  // 18. AUTOESCAPE
  // ============================================================
  console.log('\n=== 18. AUTOESCAPE ===\n')

  const autoescape = `
--- Default (escaped) ---
User input: {{ dangerous }}

--- Safe Filter ---
Trusted HTML: {{ trusted|safe }}

--- Autoescape Block ---
{% autoescape false %}
Raw HTML: {{ raw_html }}
{% endautoescape %}

{% autoescape true %}
Escaped: {{ dangerous }}
{% endautoescape %}
`
  console.log(await env.renderString(autoescape, {
    dangerous: '<script>alert("XSS")</script>',
    trusted: '<strong>Bold text</strong>',
    raw_html: '<em>Italic</em>'
  }))

  // ============================================================
  // 19. COMPLEX REAL-WORLD EXAMPLE
  // ============================================================
  console.log('\n=== 19. COMPLEX REAL-WORLD EXAMPLE ===\n')

  const realWorld = `
<!DOCTYPE html>
<html>
<head>
  <title>{{ page_title|default:"My Store" }}</title>
</head>
<body>
  {# Navigation #}
  <nav>
    {% for link in nav_links %}
    <a href="{{ link.url }}"{% if link.active %} class="active"{% endif %}>
      {{ link.text }}
    </a>
    {% endfor %}
  </nav>

  {# User greeting #}
  {% if user %}
  <div class="user-bar">
    Welcome, {{ user.name|capitalize }}!
    {% if user.is_admin %}[Admin]{% endif %}
    Last login: {{ user.last_login|timesince }} ago
  </div>
  {% endif %}

  {# Product listing #}
  <main>
    <h1>{{ category|title }} ({{ products|length }} item{{ products|length|pluralize }})</h1>

    {% for product in products %}
    <article class="product{% if loop.first %} featured{% endif %}">
      <h2>{{ loop.index }}. {{ product.name }}</h2>
      <p class="price">
        {% if product.on_sale %}
        <del>{{ product.original_price|currency:"$" }}</del>
        <ins>{{ product.price|currency:"$" }}</ins>
        <span class="badge">SALE!</span>
        {% else %}
        {{ product.price|currency:"$" }}
        {% endif %}
      </p>
      <p>{{ product.description|truncatewords:10 }}</p>

      {% if product.tags %}
      <div class="tags">
        {% for tag in product.tags %}
        <span class="tag">{{ tag|slugify }}</span>
        {% endfor %}
      </div>
      {% endif %}

      {% if product.in_stock %}
      <button>Add to Cart</button>
      {% else %}
      <button disabled>Out of Stock</button>
      {% endif %}
    </article>
    {% else %}
    <p>No products found in this category.</p>
    {% endfor %}
  </main>

  {# Footer #}
  <footer>
    <p>&copy; {{ current_year }} {{ company_name }}. All rights reserved.</p>
    <p>Generated in {{ render_time|round:2 }}ms</p>
  </footer>
</body>
</html>
`

  env.addFilter('currency', (value: number, symbol = '$') => {
    return `${symbol}${value.toFixed(2)}`
  })

  console.log(await env.renderString(realWorld, {
    page_title: 'Electronics - TechMart',
    nav_links: [
      { url: '/', text: 'Home', active: false },
      { url: '/electronics', text: 'Electronics', active: true },
      { url: '/clothing', text: 'Clothing', active: false }
    ],
    user: {
      name: 'alice',
      is_admin: true,
      last_login: new Date(Date.now() - 1000 * 60 * 30) // 30 min ago
    },
    category: 'electronics',
    products: [
      {
        name: 'MacBook Pro',
        price: 1999,
        original_price: 2499,
        on_sale: true,
        description: 'The most powerful MacBook ever with M3 chip and stunning Retina display.',
        tags: ['Apple', 'Laptop', 'Pro'],
        in_stock: true
      },
      {
        name: 'iPhone 15',
        price: 999,
        on_sale: false,
        description: 'A17 Pro chip, titanium design, and incredible camera system.',
        tags: ['Apple', 'Phone'],
        in_stock: true
      },
      {
        name: 'AirPods Pro',
        price: 249,
        on_sale: false,
        description: 'Active noise cancellation and personalized spatial audio.',
        tags: ['Apple', 'Audio'],
        in_stock: false
      }
    ],
    current_year: new Date().getFullYear(),
    company_name: 'TechMart',
    render_time: 0.42
  }))

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60))
  console.log('REFERENCE COMPLETE - ALL FEATURES INCLUDED')
  console.log('='.repeat(60))
  console.log(`
FILTERS (70 total):
  String (22): upper, lower, capitalize, capfirst, title, trim, striptags,
               escape, e, safe, escapejs, forceescape, linebreaks, linebreaksbr,
               truncatechars, truncatewords, wordcount, center, ljust, rjust,
               cut, slugify, wordwrap, indent, format, string, linenumbers
  Number (8):  abs, round, int, float, floatformat, add, divisibleby, filesizeformat
  List (25):   length, length_is, first, last, join, slice, reverse, sort,
               unique, make_list, dictsort, dictsortreversed, columns, batch,
               groupby, map, select, reject, selectattr, rejectattr, attr,
               max, min, sum, list
  Date (4):    date, time, timesince, timeuntil
  Default (5): default, d, default_if_none, yesno, pluralize
  URL (2):     urlencode, urlize
  JSON (3):    json, tojson, pprint
  Misc (4):    random, phone2numeric, unordered_list

TESTS (28 total):
  Number (12): even, odd, divisibleby, number, integer, float,
               gt, ge, lt, le, greaterthan, lessthan
  Type (10):   defined, undefined, none, None, boolean, string,
               mapping, iterable, sequence, callable
  String (2):  upper, lower
  Collection (2): empty, in
  Equality (4): eq, ne, sameas, equalto
  Truthiness (4): truthy, falsy, true, false

TAGS:
  {{ }}          Variable output
  {% if %}       Conditionals (if/elif/else/endif)
  {% for %}      Loops (for/else/endfor) with loop variables
  {% set %}      Variable assignment
  {% with %}     Scoped variables
  {% macro %}    Reusable template functions
  {% call %}     Call macros with caller()
  {% raw %}      Raw content (no parsing)
  {% autoescape %} Control HTML escaping
  {# #}          Comments
  {%- -%}        Whitespace control
`)
}

main().catch(console.error)
