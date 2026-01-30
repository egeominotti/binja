/**
 * Generate OpenGraph images for documentation pages
 * Run: bun run generate-og-images.ts
 */

import { mkdir, writeFile, readdir } from 'fs/promises'
import { join } from 'path'

const OG_WIDTH = 1200
const OG_HEIGHT = 630

interface PageMeta {
  title: string
  description: string
  path: string
}

async function generateOGImage(meta: PageMeta): Promise<void> {
  // This is a placeholder - in production, use a library like
  // @vercel/og, satori, or puppeteer to generate actual images

  const svg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0f172a"/>
          <stop offset="100%" style="stop-color:#1e293b"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="40" y="40" width="80" height="80" rx="16" fill="#10b981"/>
      <text x="60" y="100" font-family="system-ui" font-size="48" font-weight="700" fill="white">b</text>
      <text x="140" y="100" font-family="system-ui" font-size="36" font-weight="600" fill="white">binja</text>
      <text x="40" y="300" font-family="system-ui" font-size="48" font-weight="700" fill="white">${escapeXml(meta.title)}</text>
      <text x="40" y="380" font-family="system-ui" font-size="24" fill="#94a3b8">${escapeXml(meta.description.slice(0, 80))}${meta.description.length > 80 ? '...' : ''}</text>
      <text x="40" y="560" font-family="system-ui" font-size="20" fill="#64748b">egeominotti.github.io/binja</text>
    </svg>
  `

  console.log(`Generated OG image for: ${meta.title}`)
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function main() {
  const pages: PageMeta[] = [
    {
      title: 'binja Documentation',
      description: 'High-performance Jinja2/Django template engine for Bun',
      path: 'og-image.png'
    },
    {
      title: 'Getting Started',
      description: 'Install and start using binja in your project',
      path: 'guide/introduction/og-image.png'
    },
    {
      title: 'Benchmarks',
      description: '2-4x faster than Nunjucks, 160x faster with AOT',
      path: 'guide/benchmarks/og-image.png'
    },
    {
      title: 'Built-in Filters',
      description: '84 filters for string, number, date, and more',
      path: 'guide/filters/og-image.png'
    },
  ]

  console.log('Generating OG images...')

  for (const page of pages) {
    await generateOGImage(page)
  }

  console.log('Done!')
}

main().catch(console.error)
