/**
 * Example 02: Template Inheritance
 * Demonstrates extends, blocks, and includes using renderString
 */
import { Environment } from '../src';

async function main() {
  console.log('=== Template Inheritance Demo ===\n');

  // Since we're using renderString, we'll simulate inheritance with partials
  const env = new Environment({
    autoescape: true,
    globals: {
      site_name: 'TechShop',
      current_year: 2024,
    },
  });

  // ==================== Block Simulation ====================
  console.log('=== Block Content ===');

  const blockTemplate = `{% block title %}Default Title{% endblock %} | {{ site_name }}`;
  console.log(await env.renderString(blockTemplate, {}));

  // ==================== With Statement ====================
  console.log('\n=== With Statement ===');

  const withTemplate = `{% with total=price * quantity %}
Total: \${{ total }}
{% endwith %}`;
  console.log(await env.renderString(withTemplate, { price: 29.99, quantity: 3 }));

  // ==================== Set Statement ====================
  console.log('\n=== Set Statement ===');

  const setTemplate = `{% set discount = 0.2 %}
{% set final_price = price * (1 - discount) %}
Original: \${{ price }}
Discount: {{ discount * 100 }}%
Final: \${{ final_price|floatformat:2 }}`;
  console.log(await env.renderString(setTemplate, { price: 100 }));

  // ==================== Complex Nested Template ====================
  console.log('\n=== Complex Nested Template ===');

  const complexTemplate = `<!DOCTYPE html>
<html>
<head>
    <title>{{ page_title }} | {{ site_name }}</title>
</head>
<body>
    <header>
        <h1>{{ site_name }}</h1>
        <nav>
            {% for item in menu %}
            <a href="{{ item.url }}"{% if item.active %} class="active"{% endif %}>{{ item.name }}</a>
            {% endfor %}
        </nav>
    </header>

    <main>
        <h2>{{ page_title }}</h2>

        {% if featured_products|length > 0 %}
        <section class="featured">
            <h3>Featured Products</h3>
            <div class="products">
                {% for product in featured_products %}
                <article class="product{% if loop.first %} first{% endif %}{% if loop.last %} last{% endif %}">
                    <span class="counter">{{ loop.index }} of {{ loop.length }}</span>
                    <h4>{{ product.name }}</h4>
                    <p class="price">\${{ product.price|floatformat:2 }}</p>
                    {% if product.on_sale %}
                    <span class="badge">SALE!</span>
                    {% endif %}
                    <p>{{ product.description|truncatewords:15 }}</p>
                </article>
                {% endfor %}
            </div>
        </section>
        {% else %}
        <p>No featured products available.</p>
        {% endif %}
    </main>

    <footer>
        <p>&copy; {{ current_year }} {{ site_name }}. All rights reserved.</p>
    </footer>
</body>
</html>`;

  const html = await env.renderString(complexTemplate, {
    page_title: 'Welcome',
    menu: [
      { name: 'Home', url: '/', active: true },
      { name: 'Products', url: '/products', active: false },
      { name: 'About', url: '/about', active: false },
      { name: 'Contact', url: '/contact', active: false },
    ],
    featured_products: [
      {
        name: 'MacBook Pro',
        price: 1999.99,
        on_sale: true,
        description:
          'The most powerful MacBook Pro ever with M3 chip, stunning display and incredible battery life.',
      },
      {
        name: 'iPhone 15 Pro',
        price: 999,
        on_sale: false,
        description:
          'Titanium design, A17 Pro chip, and the most advanced camera system ever in an iPhone.',
      },
      {
        name: 'AirPods Pro',
        price: 249,
        on_sale: true,
        description:
          'Active Noise Cancellation, Adaptive Audio, and Personalized Spatial Audio with dynamic head tracking.',
      },
    ],
  });

  console.log(html);
}

main().catch(console.error);
