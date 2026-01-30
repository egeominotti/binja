import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://egeominotti.github.io',
  base: '/binja',

  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  vite: {
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, 'src/components'),
        '@root': path.resolve(__dirname, '..'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            search: ['@pagefind/default-ui'],
          },
        },
      },
    },
  },

  integrations: [
    starlight({
      title: 'binja',
      description: 'High-performance Jinja2/Django template engine for Bun. 2-4x faster than Nunjucks, 160x faster with AOT.',
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: false,
      },
      social: {
        github: 'https://github.com/egeominotti/binja',
      },
      editLink: {
        baseUrl: 'https://github.com/egeominotti/binja/edit/main/docs/',
      },
      expressiveCode: {
        themes: ['github-light', 'github-dark'],
        styleOverrides: {
          borderRadius: '8px',
          borderColor: '#e4e4e7',
        },
      },
      customCss: [
        '@fontsource/inter/400.css',
        '@fontsource/inter/500.css',
        '@fontsource/inter/600.css',
        '@fontsource/inter/700.css',
        './src/styles/custom.css',
      ],
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', link: '/guide/introduction/' },
            { label: 'Installation', link: '/guide/installation/' },
            { label: 'Quick Start', link: '/guide/quickstart/' },
          ],
        },
        {
          label: 'Core Concepts',
          items: [
            { label: 'Variables & Expressions', link: '/guide/variables/' },
            { label: 'Control Flow', link: '/guide/control-flow/' },
            { label: 'Template Inheritance', link: '/guide/inheritance/' },
            { label: 'Include & Macros', link: '/guide/include/' },
          ],
        },
        {
          label: 'Filters & Tests',
          items: [
            { label: 'Built-in Filters (84)', link: '/guide/filters/' },
            { label: 'Built-in Tests (28)', link: '/guide/tests/' },
            { label: 'Custom Filters', link: '/guide/custom-filters/' },
          ],
        },
        {
          label: 'Multi-Engine',
          items: [
            { label: 'Overview', link: '/guide/multi-engine/' },
            { label: 'Handlebars', link: '/guide/handlebars/' },
            { label: 'Liquid', link: '/guide/liquid/' },
            { label: 'Twig', link: '/guide/twig/' },
          ],
        },
        {
          label: 'Framework Adapters',
          items: [
            { label: 'Hono', link: '/guide/hono/' },
            { label: 'Elysia', link: '/guide/elysia/' },
          ],
        },
        {
          label: 'Performance',
          items: [
            { label: 'AOT Compilation', link: '/guide/aot/' },
            { label: 'Benchmarks', link: '/guide/benchmarks/' },
            { label: 'Caching', link: '/guide/caching/' },
          ],
        },
        {
          label: 'Tools',
          items: [
            { label: 'CLI', link: '/guide/cli/' },
            { label: 'Debug Panel', link: '/guide/debug/' },
            { label: 'AI Linting', link: '/guide/ai-linting/' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'render()', link: '/api/render/' },
            { label: 'compile()', link: '/api/compile/' },
            { label: 'Environment', link: '/api/environment/' },
            { label: 'TypeScript Types', link: '/api/types/' },
          ],
        },
        {
          label: 'Resources',
          items: [
            { label: 'Examples', link: '/examples/' },
            { label: 'Django Compatibility', link: '/guide/django/' },
            { label: 'FAQ', link: '/faq/' },
            { label: 'Troubleshooting', link: '/troubleshooting/' },
            { label: 'Changelog', link: '/changelog/' },
            { label: 'Contributing', link: '/contributing/' },
          ],
        },
      ],
      favicon: '/favicon.svg',
      head: [
        // Favicon variations
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            href: '/binja/favicon.svg',
            type: 'image/svg+xml',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            href: '/binja/favicon.svg',
            sizes: 'any',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'apple-touch-icon',
            href: '/binja/apple-touch-icon.svg',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'mask-icon',
            href: '/binja/favicon.svg',
            color: '#10b981',
          },
        },
        // Primary Meta Tags
        {
          tag: 'meta',
          attrs: {
            name: 'title',
            content: 'binja - High-Performance Jinja2/Django Template Engine for Bun',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'description',
            content: 'The fastest Jinja2/Django template engine for Bun. 2-4x faster than Nunjucks, 160x faster with AOT compilation. Multi-engine support: Handlebars, Liquid, Twig.',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'keywords',
            content: 'binja, jinja2, django, template engine, bun, typescript, javascript, handlebars, liquid, twig, nunjucks, nunjucks alternative, aot compilation, filters, hono, elysia, server-side rendering, ssr',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'author',
            content: 'egeominotti',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'robots',
            content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'googlebot',
            content: 'index, follow',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'bingbot',
            content: 'index, follow',
          },
        },
        // Open Graph / Facebook
        {
          tag: 'meta',
          attrs: {
            property: 'og:type',
            content: 'website',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:url',
            content: 'https://egeominotti.github.io/binja/',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:title',
            content: 'binja - High-Performance Template Engine for Bun',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:description',
            content: 'Jinja2/Django compatible template engine. 2-4x faster than Nunjucks, 160x faster with AOT. Multi-engine support for Handlebars, Liquid, Twig.',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: 'https://egeominotti.github.io/binja/og-image.svg',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:width',
            content: '1200',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:height',
            content: '630',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:alt',
            content: 'binja - High-performance Jinja2/Django template engine for Bun',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:site_name',
            content: 'binja',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:locale',
            content: 'en_US',
          },
        },
        // Twitter
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:card',
            content: 'summary_large_image',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:url',
            content: 'https://egeominotti.github.io/binja/',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:title',
            content: 'binja - High-Performance Template Engine for Bun',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:description',
            content: 'Jinja2/Django compatible. 2-4x faster than Nunjucks, 160x with AOT. Multi-engine: Handlebars, Liquid, Twig.',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image',
            content: 'https://egeominotti.github.io/binja/og-image.svg',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image:alt',
            content: 'binja - High-performance Jinja2/Django template engine for Bun',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:creator',
            content: '@egeominotti',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:site',
            content: '@egeominotti',
          },
        },
        // JSON-LD Structured Data - SoftwareApplication
        {
          tag: 'script',
          attrs: {
            type: 'application/ld+json',
          },
          content: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'binja',
            alternateName: 'Binja Template Engine',
            description: 'High-performance Jinja2/Django template engine for Bun. 2-4x faster than Nunjucks, 160x faster with AOT compilation. Multi-engine support.',
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Cross-platform',
            softwareVersion: '0.9.1',
            datePublished: '2024-01-01',
            dateModified: '2025-01-30',
            license: 'https://opensource.org/licenses/BSD-3-Clause',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            author: {
              '@type': 'Person',
              name: 'egeominotti',
              url: 'https://github.com/egeominotti',
            },
            publisher: {
              '@type': 'Person',
              name: 'egeominotti',
            },
            codeRepository: 'https://github.com/egeominotti/binja',
            downloadUrl: 'https://www.npmjs.com/package/binja',
            installUrl: 'https://www.npmjs.com/package/binja',
            programmingLanguage: ['TypeScript', 'JavaScript'],
            runtimePlatform: 'Bun',
            keywords: ['template engine', 'jinja2', 'django', 'bun', 'typescript', 'nunjucks alternative', 'handlebars', 'liquid', 'twig'],
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '5',
              ratingCount: '1',
            },
          }),
        },
        // JSON-LD Structured Data - WebSite
        {
          tag: 'script',
          attrs: {
            type: 'application/ld+json',
          },
          content: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'binja Documentation',
            url: 'https://egeominotti.github.io/binja/',
            description: 'Official documentation for binja - High-performance Jinja2/Django template engine for Bun',
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://egeominotti.github.io/binja/?search={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          }),
        },
        // Theme and PWA
        {
          tag: 'meta',
          attrs: {
            name: 'theme-color',
            content: '#10b981',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'msapplication-TileColor',
            content: '#10b981',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'application-name',
            content: 'binja',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'apple-mobile-web-app-title',
            content: 'binja',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'apple-mobile-web-app-capable',
            content: 'yes',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'apple-mobile-web-app-status-bar-style',
            content: 'default',
          },
        },
        // DNS prefetch
        {
          tag: 'link',
          attrs: {
            rel: 'dns-prefetch',
            href: 'https://github.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://github.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'dns-prefetch',
            href: 'https://www.npmjs.com',
          },
        },
      ],
      lastUpdated: false,
      pagination: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
    }),
    sitemap(),
  ],
});
