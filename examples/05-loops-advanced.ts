/**
 * Example 05: Advanced Loop Features
 * Demonstrates all loop variables and advanced looping techniques
 */
import { Environment } from '../src';

async function main() {
  const env = new Environment({ autoescape: true });

  console.log('=== Advanced Loop Features ===\n');

  // ==================== Loop Variables ====================
  console.log('=== Loop Variables ===\n');

  const loopVars = `
{% for item in items %}
Item: {{ item }}
  - loop.index (1-based): {{ loop.index }}
  - loop.index0 (0-based): {{ loop.index0 }}
  - loop.revindex: {{ loop.revindex }}
  - loop.revindex0: {{ loop.revindex0 }}
  - loop.first: {{ loop.first }}
  - loop.last: {{ loop.last }}
  - loop.length: {{ loop.length }}
  - loop.previtem: {{ loop.previtem|default:"N/A" }}
  - loop.nextitem: {{ loop.nextitem|default:"N/A" }}
---
{% endfor %}
`;

  console.log(await env.renderString(loopVars, { items: ['apple', 'banana', 'cherry'] }));

  // ==================== DTL forloop Variables ====================
  console.log('=== DTL forloop Variables ===\n');

  const forloopVars = `
{% for item in items %}
{{ item }}: counter={{ forloop.counter }}, counter0={{ forloop.counter0 }}, first={{ forloop.first }}, last={{ forloop.last }}
{% endfor %}
`;

  console.log(await env.renderString(forloopVars, { items: ['A', 'B', 'C', 'D'] }));

  // ==================== Loop Cycle ====================
  console.log('=== Loop Cycle ===\n');

  const loopCycle = `
<table>
{% for row in rows %}
<tr class="{{ loop.cycle("odd", "even") }}">
  <td>{{ loop.index }}</td>
  <td>{{ row }}</td>
</tr>
{% endfor %}
</table>
`;

  console.log(
    await env.renderString(loopCycle, { rows: ['Row 1', 'Row 2', 'Row 3', 'Row 4', 'Row 5'] })
  );

  // ==================== Empty/Else Block ====================
  console.log('=== Empty/Else Block ===\n');

  const emptyBlock = `
With items:
{% for item in items %}
- {{ item }}
{% empty %}
No items found!
{% endfor %}

Without items:
{% for item in empty_list %}
- {{ item }}
{% else %}
The list is empty!
{% endfor %}
`;

  console.log(await env.renderString(emptyBlock, { items: ['a', 'b'], empty_list: [] }));

  // ==================== Nested Loops ====================
  console.log('=== Nested Loops ===\n');

  const nestedLoops = `
{% for category in categories %}
Category: {{ category.name }} (outer loop.index: {{ loop.index }})
{% for product in category.products %}
  - {{ product }} (inner loop.index: {{ loop.index }}, depth: {{ loop.depth }})
    parent loop index: {{ loop.parentloop.index }}
{% endfor %}
{% endfor %}
`;

  console.log(
    await env.renderString(nestedLoops, {
      categories: [
        { name: 'Fruits', products: ['Apple', 'Banana', 'Orange'] },
        { name: 'Vegetables', products: ['Carrot', 'Broccoli'] },
        { name: 'Dairy', products: ['Milk', 'Cheese', 'Yogurt'] },
      ],
    })
  );

  // ==================== Loop with Key-Value Pairs ====================
  console.log('=== Loop with Key-Value Pairs ===\n');

  const keyValueLoop = `
{% for key, value in person %}
{{ key }}: {{ value }}
{% endfor %}
`;

  console.log(
    await env.renderString(keyValueLoop, {
      person: { name: 'John', age: 30, city: 'NYC' },
    })
  );

  // ==================== Complex Data Table ====================
  console.log('=== Complex Data Table ===\n');

  const dataTable = `
<table>
  <thead>
    <tr>
      <th>#</th>
      {% for header in headers %}
      <th>{{ header|title }}</th>
      {% endfor %}
    </tr>
  </thead>
  <tbody>
    {% for row in data %}
    <tr class="{% if loop.index is odd %}odd{% else %}even{% endif %}{% if loop.first %} first{% endif %}{% if loop.last %} last{% endif %}">
      <td>{{ loop.index }}</td>
      {% for key in headers %}
      <td>{{ row[key]|default:"-" }}</td>
      {% endfor %}
    </tr>
    {% empty %}
    <tr>
      <td colspan="{{ headers|length + 1 }}">No data available</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
`;

  console.log(
    await env.renderString(dataTable, {
      headers: ['name', 'email', 'status'],
      data: [
        { name: 'Alice', email: 'alice@example.com', status: 'active' },
        { name: 'Bob', email: 'bob@example.com', status: 'pending' },
        { name: 'Charlie', email: 'charlie@example.com', status: 'inactive' },
      ],
    })
  );

  // ==================== Pagination Pattern ====================
  console.log('=== Pagination Pattern ===\n');

  const pagination = `
Showing items {{ start + 1 }}-{{ end }} of {{ total }}:
{% for item in page_items %}
{{ loop.index + start }}. {{ item }}
{% endfor %}

Pages:
{% for page in pages %}
{% if page == current_page %}
[{{ page }}]
{% else %}
{{ page }}
{% endif %}
{% endfor %}
`;

  console.log(
    await env.renderString(pagination, {
      start: 10,
      end: 15,
      total: 50,
      page_items: ['Item 11', 'Item 12', 'Item 13', 'Item 14', 'Item 15'],
      pages: [1, 2, 3, 4, 5],
      current_page: 2,
    })
  );

  // ==================== Grid Layout with Batch ====================
  console.log('=== Grid Layout with Batch ===\n');

  const gridLayout = `
<div class="grid">
{% for row in items|batch:3 %}
  <div class="row row-{{ loop.index }}">
    {% for item in row %}
    <div class="col col-{{ loop.index }}">{{ item }}</div>
    {% endfor %}
  </div>
{% endfor %}
</div>
`;

  console.log(
    await env.renderString(gridLayout, {
      items: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    })
  );

  // ==================== Building a Tree Structure ====================
  console.log('=== Tree Structure ===\n');

  // Add custom filter for indentation
  env.addFilter('indent', (level: number) => '  '.repeat(level));

  const treeTemplate = `
{% for node in tree %}
{{ node.level|indent }}├─ {{ node.name }}{% if node.children %} ({{ node.children|length }} children){% endif %}
{% endfor %}
`;

  console.log(
    await env.renderString(treeTemplate, {
      tree: [
        { level: 0, name: 'Root', children: ['A', 'B'] },
        { level: 1, name: 'A', children: ['A1', 'A2'] },
        { level: 2, name: 'A1' },
        { level: 2, name: 'A2' },
        { level: 1, name: 'B', children: ['B1'] },
        { level: 2, name: 'B1' },
      ],
    })
  );

  // ==================== Conditional Rendering in Loops ====================
  console.log('=== Conditional Rendering in Loops ===\n');

  // Calculate totals in data (common pattern for complex calculations)
  const orderItems = [
    { name: 'Widget', quantity: 3, price: 9.99, on_sale: false },
    { name: 'Gadget', quantity: 1, price: 24.99, on_sale: true },
    { name: 'Gizmo', quantity: 0, price: 14.99, on_sale: false },
    { name: 'Doohickey', quantity: 2, price: 7.5, on_sale: false },
  ];
  const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const conditionalLoop = `
Order Summary:
{% for item in order.items %}
{% if item.quantity > 0 %}
- {{ item.name }} x{{ item.quantity }} @ \${{ item.price|floatformat:2 }} = \${{ (item.quantity * item.price)|floatformat:2 }}{% if item.on_sale %} (SALE!){% endif %}
{% endif %}
{% endfor %}
---
Subtotal: \${{ subtotal|floatformat:2 }}
Tax (10%): \${{ tax|floatformat:2 }}
Total: \${{ total|floatformat:2 }}
`;

  console.log(
    await env.renderString(conditionalLoop, {
      order: { items: orderItems },
      subtotal,
      tax: subtotal * 0.1,
      total: subtotal * 1.1,
    })
  );
}

main().catch(console.error);
