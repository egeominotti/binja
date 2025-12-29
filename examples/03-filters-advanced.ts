/**
 * Example 03: Advanced Filters
 * Demonstrates all built-in filters with complex use cases
 */
import { Environment } from '../src';

async function main() {
  const env = new Environment({ autoescape: true });

  // ==================== String Filters ====================
  console.log('=== String Filters ===\n');

  const stringFilters = `
String Transformations:
- upper: {{ text|upper }}
- lower: {{ text|lower }}
- capitalize: {{ text|capitalize }}
- title: {{ text|title }}
- trim: "{{ padded|trim }}"

Truncation:
- truncatechars:20: {{ long_text|truncatechars:20 }}
- truncatewords:5: {{ long_text|truncatewords:5 }}

Formatting:
- center:30: "{{ short|center:30 }}"
- ljust:20: "{{ short|ljust:20 }}|"
- rjust:20: "|{{ short|rjust:20 }}"
- slugify: {{ title|slugify }}

Content:
- wordcount: {{ long_text|wordcount }} words
- cut (remove 'a'): {{ text|cut:"a" }}
- striptags: {{ html|striptags }}
`;

  console.log(
    await env.renderString(stringFilters, {
      text: 'hELLo wORLd',
      padded: '   spaces   ',
      long_text: 'This is a very long text that needs to be truncated for display purposes.',
      short: 'test',
      title: 'My Amazing Blog Post!',
      html: '<p>Hello <b>World</b>!</p>',
    })
  );

  // ==================== Number Filters ====================
  console.log('\n=== Number Filters ===\n');

  const numberFilters = `
Number Operations:
- abs: {{ negative|abs }}
- round: {{ decimal|round }}
- round:2: {{ decimal|round:2 }}
- int: {{ decimal|int }}
- float: {{ integer|float }}

Formatting:
- floatformat: {{ price|floatformat }}
- floatformat:2: {{ price|floatformat:2 }}
- floatformat:-2: {{ round_price|floatformat:-2 }}

Arithmetic:
- add:10: {{ number|add:10 }}
- add (string concat): {{ "Hello "|add:name }}

File Sizes:
- bytes: {{ bytes|filesizeformat }}
- kilobytes: {{ kilobytes|filesizeformat }}
- megabytes: {{ megabytes|filesizeformat }}
- gigabytes: {{ gigabytes|filesizeformat }}

Divisibility:
- 12 divisibleby 3: {{ 12|divisibleby:3 }}
- 12 divisibleby 5: {{ 12|divisibleby:5 }}
`;

  console.log(
    await env.renderString(numberFilters, {
      negative: -42,
      decimal: 3.14159,
      integer: 42,
      price: 19.5,
      round_price: 20.0,
      number: 5,
      name: 'World',
      bytes: 512,
      kilobytes: 1024 * 10,
      megabytes: 1024 * 1024 * 5.5,
      gigabytes: 1024 * 1024 * 1024 * 2.3,
    })
  );

  // ==================== List/Array Filters ====================
  console.log('\n=== List/Array Filters ===\n');

  const listFilters = `
Basic List Operations:
- length: {{ items|length }}
- first: {{ items|first }}
- last: {{ items|last }}
- join: {{ items|join:", " }}
- reverse: {{ items|reverse|join:", " }}

Slicing:
- slice:"1:3": {{ items|slice:"1:3"|join:", " }}
- slice:":2": {{ items|slice:":2"|join:", " }}
- slice:"2:": {{ items|slice:"2:"|join:", " }}

Sorting:
- sort: {{ numbers|sort|join:", " }}
- unique: {{ duplicates|unique|join:", " }}

Object Sorting:
{% for user in users|dictsort:"name" %}
- {{ user.name }}: {{ user.age }}
{% endfor %}

Batching (for grids):
{% for row in items|batch:3 %}
Row: {{ row|join:" | " }}
{% endfor %}
`;

  console.log(
    await env.renderString(listFilters, {
      items: ['apple', 'banana', 'cherry', 'date', 'elderberry'],
      numbers: [3, 1, 4, 1, 5, 9, 2, 6],
      duplicates: [1, 2, 2, 3, 3, 3, 4],
      users: [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ],
    })
  );

  // ==================== Date/Time Filters ====================
  console.log('\n=== Date/Time Filters ===\n');

  const dateFilters = `
Date Formatting:
- Default: {{ date|date }}
- Full: {{ date|date:"l, F j, Y" }}
- Short: {{ date|date:"m/d/Y" }}
- ISO: {{ date|date:"Y-m-d" }}

Time Formatting:
- Default: {{ datetime|time }}
- 12-hour: {{ datetime|time:"g:i A" }}
- 24-hour: {{ datetime|time:"H:i:s" }}

Relative Time:
- timesince: {{ past|timesince }}
- timeuntil: {{ future|timeuntil }}
`;

  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5); // 5 days ago
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3); // 3 days from now

  console.log(
    await env.renderString(dateFilters, {
      date: new Date('2024-01-15'),
      datetime: new Date('2024-01-15T14:30:00'),
      past,
      future,
    })
  );

  // ==================== Default/Conditional Filters ====================
  console.log('\n=== Default/Conditional Filters ===\n');

  const conditionalFilters = `
Default Values:
- default: {{ missing|default:"N/A" }}
- default (empty string): {{ empty|default:"fallback" }}
- default (false): {{ falsy|default:"fallback" }}
- default_if_none: {{ null_val|default_if_none:"was null" }}
- default_if_none (not null): {{ zero|default_if_none:"was null" }}

Yes/No:
- yesno (true): {{ active|yesno:"Active,Inactive" }}
- yesno (false): {{ inactive|yesno:"Active,Inactive" }}
- yesno (null): {{ unknown|yesno:"Yes,No,Maybe" }}

Pluralize:
- 1 item{{ 1|pluralize }}
- 5 item{{ 5|pluralize }}
- 1 cherr{{ 1|pluralize:"y,ies" }}
- 3 cherr{{ 3|pluralize:"y,ies" }}
`;

  console.log(
    await env.renderString(conditionalFilters, {
      empty: '',
      falsy: false,
      null_val: null,
      zero: 0,
      active: true,
      inactive: false,
      unknown: null,
    })
  );

  // ==================== JSON Filter ====================
  console.log('\n=== JSON Filter ===\n');

  const jsonFilter = `
JSON Output:
{{ data|json }}

Pretty JSON:
{{ data|json:2 }}
`;

  console.log(
    await env.renderString(jsonFilter, {
      data: {
        name: 'John',
        age: 30,
        hobbies: ['reading', 'coding', 'gaming'],
        address: { city: 'NYC', country: 'USA' },
      },
    })
  );

  // ==================== URL Filters ====================
  console.log('\n=== URL Filters ===\n');

  const urlFilters = `
URL Encoding:
- urlencode: {{ query|urlencode }}
- urlize: {{ text|urlize|safe }}
`;

  console.log(
    await env.renderString(urlFilters, {
      query: 'hello world & foo=bar',
      text: 'Visit https://example.com for more info!',
    })
  );

  // ==================== Custom Filters ====================
  console.log('\n=== Custom Filters ===\n');

  env.addFilter('currency', (value: number, symbol = '$', decimals = 2) => {
    return `${symbol}${value.toFixed(decimals)}`;
  });

  env.addFilter('highlight', (text: string, term: string) => {
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  });

  env.addFilter('initials', (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  });

  env.addFilter('ago', (date: Date) => {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  });

  const customFilters = `
Custom Filters:
- currency: {{ price|currency:"€" }}
- highlight: {{ text|highlight:"world"|safe }}
- initials: {{ name|initials }}
- ago: {{ date|ago }}
`;

  console.log(
    await env.renderString(customFilters, {
      price: 99.95,
      text: 'Hello World, welcome to the world of templates!',
      name: 'John Doe',
      date: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
    })
  );
}

main().catch(console.error);
