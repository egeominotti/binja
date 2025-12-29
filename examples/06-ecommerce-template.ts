/**
 * Example 06: Real-World E-Commerce Templates
 * Complete e-commerce page templates demonstrating complex real-world usage
 */
import { Environment } from "../src";

async function main() {
  const env = new Environment({
    autoescape: true,
    globals: {
      site_name: "TechMart",
      currency: "USD",
      currency_symbol: "$",
    },
  });

  // Custom filters for e-commerce
  env.addFilter("money", (value: number, symbol = "$") => {
    return `${symbol}${value.toFixed(2)}`;
  });

  env.addFilter("discount_percent", (original: number, sale: number) => {
    return Math.round(((original - sale) / original) * 100);
  });

  env.addFilter("stock_status", (quantity: number) => {
    if (quantity === 0) return "Out of Stock";
    if (quantity < 5) return "Low Stock";
    if (quantity < 20) return "In Stock";
    return "Available";
  });

  env.addFilter("star_rating", (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
  });

  console.log("=== E-Commerce Product Listing Page ===\n");

  const productListingTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>{{ category.name }} - {{ site_name }}</title>
</head>
<body>
    <header>
        <nav>
            <a href="/">{{ site_name }}</a>
            {% for cat in categories %}
            <a href="/category/{{ cat.slug }}"{% if cat.id == category.id %} class="active"{% endif %}>{{ cat.name }}</a>
            {% endfor %}
            <span class="cart">Cart ({{ cart.item_count }})</span>
        </nav>
    </header>

    <main>
        <div class="breadcrumb">
            <a href="/">Home</a> &gt;
            {% if category.parent %}
            <a href="/category/{{ category.parent.slug }}">{{ category.parent.name }}</a> &gt;
            {% endif %}
            <span>{{ category.name }}</span>
        </div>

        <h1>{{ category.name }}</h1>
        <p class="description">{{ category.description|default:"Browse our selection of products." }}</p>

        <!-- Filters -->
        <aside class="filters">
            <h3>Price Range</h3>
            {% for range in price_ranges %}
            <label>
                <input type="checkbox"{% if range.min == selected_price_min %} checked{% endif %}>
                {{ range.min|money }} - {{ range.max|money }}
            </label>
            {% endfor %}

            <h3>Brand</h3>
            {% for brand in brands %}
            <label>
                <input type="checkbox"{% if brand in selected_brands %} checked{% endif %}>
                {{ brand }} ({{ brand_counts[brand]|default:0 }})
            </label>
            {% endfor %}

            <h3>Rating</h3>
            {% for rating in [4, 3, 2, 1] %}
            <label>
                <input type="checkbox">
                {{ rating|star_rating }} & Up
            </label>
            {% endfor %}
        </aside>

        <!-- Product Grid -->
        <div class="products">
            <div class="toolbar">
                <span>{{ products|length }} products found</span>
                <select name="sort">
                    <option value="relevance"{% if sort == "relevance" %} selected{% endif %}>Relevance</option>
                    <option value="price_asc"{% if sort == "price_asc" %} selected{% endif %}>Price: Low to High</option>
                    <option value="price_desc"{% if sort == "price_desc" %} selected{% endif %}>Price: High to Low</option>
                    <option value="rating"{% if sort == "rating" %} selected{% endif %}>Customer Rating</option>
                    <option value="newest"{% if sort == "newest" %} selected{% endif %}>Newest Arrivals</option>
                </select>
            </div>

            <div class="grid">
            {% for product in products %}
                <article class="product-card{% if product.featured %} featured{% endif %}{% if product.stock == 0 %} out-of-stock{% endif %}">
                    {% if product.badges|length > 0 %}
                    <div class="badges">
                        {% for badge in product.badges %}
                        <span class="badge badge-{{ badge|slugify }}">{{ badge }}</span>
                        {% endfor %}
                    </div>
                    {% endif %}

                    <a href="/product/{{ product.slug }}">
                        <img src="{{ product.image }}" alt="{{ product.name }}" loading="lazy">
                    </a>

                    <div class="info">
                        <p class="brand">{{ product.brand }}</p>
                        <h3><a href="/product/{{ product.slug }}">{{ product.name|truncatechars:50 }}</a></h3>

                        <div class="rating">
                            {{ product.rating|star_rating }}
                            <span class="count">({{ product.review_count }})</span>
                        </div>

                        <div class="price">
                            {% if product.sale_price %}
                            <span class="original">{{ product.price|money }}</span>
                            <span class="sale">{{ product.sale_price|money }}</span>
                            <span class="discount">-{{ product.price|discount_percent:product.sale_price }}%</span>
                            {% else %}
                            <span class="current">{{ product.price|money }}</span>
                            {% endif %}
                        </div>

                        <p class="stock {{ product.stock|stock_status|slugify }}">
                            {{ product.stock|stock_status }}
                            {% if product.stock > 0 and product.stock < 5 %}
                            - Only {{ product.stock }} left!
                            {% endif %}
                        </p>

                        {% if product.stock > 0 %}
                        <button class="add-to-cart" data-id="{{ product.id }}">Add to Cart</button>
                        {% else %}
                        <button class="notify" data-id="{{ product.id }}">Notify When Available</button>
                        {% endif %}
                    </div>
                </article>
            {% empty %}
                <div class="no-products">
                    <p>No products found matching your criteria.</p>
                    <a href="/category/{{ category.slug }}">Clear Filters</a>
                </div>
            {% endfor %}
            </div>

            <!-- Pagination -->
            {% if total_pages > 1 %}
            <nav class="pagination">
                {% if current_page > 1 %}
                <a href="?page={{ current_page - 1 }}" class="prev">&laquo; Previous</a>
                {% endif %}

                {% for page in pages %}
                    {% if page == "..." %}
                    <span class="ellipsis">...</span>
                    {% elif page == current_page %}
                    <span class="current">{{ page }}</span>
                    {% else %}
                    <a href="?page={{ page }}">{{ page }}</a>
                    {% endif %}
                {% endfor %}

                {% if current_page < total_pages %}
                <a href="?page={{ current_page + 1 }}" class="next">Next &raquo;</a>
                {% endif %}
            </nav>
            {% endif %}
        </div>
    </main>

    <footer>
        <p>&copy; {{ 2024 }} {{ site_name }}. All rights reserved.</p>
    </footer>
</body>
</html>
`;

  const listingHtml = await env.renderString(productListingTemplate, {
    category: {
      id: 1,
      name: "Laptops",
      slug: "laptops",
      description: "Find the perfect laptop for work, gaming, or everyday use.",
      parent: { name: "Computers", slug: "computers" },
    },
    categories: [
      { id: 1, name: "Laptops", slug: "laptops" },
      { id: 2, name: "Desktops", slug: "desktops" },
      { id: 3, name: "Accessories", slug: "accessories" },
    ],
    cart: { item_count: 3 },
    products: [
      {
        id: 1,
        name: 'MacBook Pro 16" M3 Max',
        slug: "macbook-pro-16-m3-max",
        brand: "Apple",
        price: 3499,
        sale_price: null,
        image: "/images/macbook-pro.jpg",
        rating: 4.8,
        review_count: 1245,
        stock: 15,
        featured: true,
        badges: ["New", "Best Seller"],
      },
      {
        id: 2,
        name: "Dell XPS 15 OLED",
        slug: "dell-xps-15-oled",
        brand: "Dell",
        price: 1999,
        sale_price: 1799,
        image: "/images/dell-xps.jpg",
        rating: 4.5,
        review_count: 892,
        stock: 3,
        featured: false,
        badges: ["Sale"],
      },
      {
        id: 3,
        name: "ThinkPad X1 Carbon Gen 11",
        slug: "thinkpad-x1-carbon-gen11",
        brand: "Lenovo",
        price: 1649,
        sale_price: null,
        image: "/images/thinkpad.jpg",
        rating: 4.6,
        review_count: 567,
        stock: 0,
        featured: false,
        badges: [],
      },
    ],
    price_ranges: [
      { min: 0, max: 500 },
      { min: 500, max: 1000 },
      { min: 1000, max: 2000 },
      { min: 2000, max: 5000 },
    ],
    brands: ["Apple", "Dell", "Lenovo", "HP", "ASUS"],
    brand_counts: { Apple: 12, Dell: 8, Lenovo: 15, HP: 10, ASUS: 6 },
    selected_brands: ["Apple"],
    sort: "relevance",
    current_page: 1,
    total_pages: 5,
    pages: [1, 2, 3, "...", 5],
  });

  console.log(listingHtml);

  // ==================== Shopping Cart Template ====================
  console.log("\n\n=== Shopping Cart Page ===\n");

  const cartTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>Shopping Cart - {{ site_name }}</title>
</head>
<body>
    <h1>Shopping Cart</h1>

    {% if cart.items|length > 0 %}
    <table class="cart-items">
        <thead>
            <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            {% for item in cart.items %}
            <tr>
                <td class="product">
                    <img src="{{ item.product.image }}" alt="{{ item.product.name }}">
                    <div>
                        <a href="/product/{{ item.product.slug }}">{{ item.product.name }}</a>
                        {% if item.options %}
                        <ul class="options">
                            {% for key, value in item.options %}
                            <li>{{ key|title }}: {{ value }}</li>
                            {% endfor %}
                        </ul>
                        {% endif %}
                    </div>
                </td>
                <td class="price">
                    {% if item.product.sale_price %}
                    <del>{{ item.product.price|money }}</del>
                    {{ item.product.sale_price|money }}
                    {% else %}
                    {{ item.product.price|money }}
                    {% endif %}
                </td>
                <td class="quantity">
                    <button class="qty-btn minus" data-id="{{ item.id }}">-</button>
                    <input type="number" value="{{ item.quantity }}" min="1" max="{{ item.product.stock }}">
                    <button class="qty-btn plus" data-id="{{ item.id }}">+</button>
                </td>
                <td class="total">{{ item.total|money }}</td>
                <td>
                    <button class="remove" data-id="{{ item.id }}">&times;</button>
                </td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div class="cart-summary">
        <div class="promo">
            <input type="text" placeholder="Promo code" value="{{ cart.promo_code|default:"" }}">
            <button>Apply</button>
            {% if cart.promo_code %}
            <span class="applied">{{ cart.promo_code }} applied! (-{{ cart.discount|money }})</span>
            {% endif %}
        </div>

        <table class="totals">
            <tr>
                <td>Subtotal ({{ cart.items|length }} item{{ cart.items|length|pluralize }}):</td>
                <td>{{ cart.subtotal|money }}</td>
            </tr>
            {% if cart.discount > 0 %}
            <tr class="discount">
                <td>Discount:</td>
                <td>-{{ cart.discount|money }}</td>
            </tr>
            {% endif %}
            <tr>
                <td>Shipping:</td>
                <td>{% if cart.shipping == 0 %}FREE{% else %}{{ cart.shipping|money }}{% endif %}</td>
            </tr>
            <tr>
                <td>Estimated Tax:</td>
                <td>{{ cart.tax|money }}</td>
            </tr>
            <tr class="total">
                <td><strong>Total:</strong></td>
                <td><strong>{{ cart.total|money }}</strong></td>
            </tr>
        </table>

        {% if cart.free_shipping_remaining > 0 %}
        <p class="shipping-message">
            Add {{ cart.free_shipping_remaining|money }} more for FREE shipping!
        </p>
        {% endif %}

        <div class="actions">
            <a href="/shop" class="continue">Continue Shopping</a>
            <a href="/checkout" class="checkout">Proceed to Checkout</a>
        </div>
    </div>

    {% else %}
    <div class="empty-cart">
        <p>Your cart is empty.</p>
        <a href="/shop" class="button">Start Shopping</a>
    </div>
    {% endif %}
</body>
</html>
`;

  const cartHtml = await env.renderString(cartTemplate, {
    cart: {
      items: [
        {
          id: 1,
          product: {
            name: 'MacBook Pro 16"',
            slug: "macbook-pro-16",
            image: "/images/macbook.jpg",
            price: 2499,
            sale_price: null,
            stock: 10,
          },
          options: { Color: "Space Gray", RAM: "32GB" },
          quantity: 1,
          total: 2499,
        },
        {
          id: 2,
          product: {
            name: "Magic Mouse",
            slug: "magic-mouse",
            image: "/images/mouse.jpg",
            price: 99,
            sale_price: 79,
            stock: 50,
          },
          options: null,
          quantity: 2,
          total: 158,
        },
      ],
      subtotal: 2657,
      discount: 100,
      promo_code: "SAVE100",
      shipping: 0,
      tax: 204.56,
      total: 2761.56,
      free_shipping_remaining: 0,
    },
  });

  console.log(cartHtml);
}

main().catch(console.error);
