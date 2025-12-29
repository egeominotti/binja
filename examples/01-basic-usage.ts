/**
 * Example 01: Basic Usage
 * Demonstrates fundamental jinja-bun features
 */
import { Environment, render } from '../src';

async function main() {
  // ==================== Simple Variable Rendering ====================
  console.log('=== Simple Variables ===');

  const greeting = await render('Hello, {{ name }}!', { name: 'World' });
  console.log(greeting); // Hello, World!

  // Multiple variables
  const intro = await render(
    '{{ greeting }}, my name is {{ name }} and I am {{ age }} years old.',
    { greeting: 'Hi', name: 'Alice', age: 30 }
  );
  console.log(intro);

  // ==================== Object Access ====================
  console.log('\n=== Object Access ===');

  const user = {
    name: 'John Doe',
    email: 'john@example.com',
    address: {
      city: 'New York',
      country: 'USA',
    },
  };

  // Dot notation
  const userInfo = await render(
    'User: {{ user.name }} ({{ user.email }}) from {{ user.address.city }}',
    { user }
  );
  console.log(userInfo);

  // ==================== Array Access ====================
  console.log('\n=== Array Access ===');

  const items = ['apple', 'banana', 'cherry'];

  // DTL style (dot notation with index)
  const firstItem = await render('First item: {{ items.0 }}', { items });
  console.log(firstItem);

  // Jinja2 style (bracket notation)
  const secondItem = await render('Second item: {{ items[1] }}', { items });
  console.log(secondItem);

  // ==================== Filters ====================
  console.log('\n=== Filters ===');

  // String filters
  const upperName = await render('{{ name|upper }}', { name: 'john' });
  console.log('Upper:', upperName);

  const capitalized = await render('{{ text|capitalize }}', { text: 'hello world' });
  console.log('Capitalize:', capitalized);

  const truncated = await render('{{ text|truncatechars:20 }}', {
    text: 'This is a very long text that should be truncated',
  });
  console.log('Truncate:', truncated);

  // Number filters
  const formatted = await render('{{ price|floatformat:2 }}', { price: 19.5 });
  console.log('Float format:', formatted);

  const fileSize = await render('{{ size|filesizeformat }}', { size: 1024 * 1024 * 5.5 });
  console.log('File size:', fileSize);

  // List filters
  const joined = await render('{{ items|join:", " }}', { items: ['a', 'b', 'c'] });
  console.log('Join:', joined);

  const listLength = await render('List has {{ items|length }} items', { items: [1, 2, 3, 4, 5] });
  console.log('Length:', listLength);

  // ==================== Conditionals ====================
  console.log('\n=== Conditionals ===');

  const ifElse = await render(
    '{% if score >= 90 %}A{% elif score >= 80 %}B{% elif score >= 70 %}C{% else %}F{% endif %}',
    { score: 85 }
  );
  console.log('Grade:', ifElse);

  // Ternary expression (Jinja2 style)
  const ternary = await render('{{ "active" if is_active else "inactive" }}', { is_active: true });
  console.log('Status:', ternary);

  // ==================== Loops ====================
  console.log('\n=== Loops ===');

  const products = [
    { name: 'Laptop', price: 999 },
    { name: 'Mouse', price: 29 },
    { name: 'Keyboard', price: 79 },
  ];

  const productListTpl = `{% for product in products %}{{ loop.index }}. {{ product.name }}: \${{ product.price }}{% if not loop.last %}
{% endif %}{% endfor %}`;
  const productList = await render(productListTpl, { products });
  console.log('Products:\n' + productList);

  // Loop with else/empty
  const emptyLoop = await render(
    '{% for item in items %}{{ item }}{% empty %}No items{% endfor %}',
    {
      items: [],
    }
  );
  console.log('Empty list:', emptyLoop);

  // ==================== Using Environment ====================
  console.log('\n=== Environment ===');

  const env = new Environment({
    autoescape: true,
    globals: {
      site_name: 'My Website',
      current_year: 2024,
    },
  });

  // Add custom filter
  env.addFilter('currency', (value: number, symbol = '$') => {
    return `${symbol}${value.toFixed(2)}`;
  });

  const page = await env.renderString(
    'Welcome to {{ site_name }}! Product: {{ price|currency:"€" }} - &copy; {{ current_year }}',
    { price: 49.99 }
  );
  console.log(page);
}

main().catch(console.error);
