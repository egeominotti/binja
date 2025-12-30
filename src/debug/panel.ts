/**
 * Debug Panel - Professional template debugging interface
 */

import type { DebugData, TemplateInfo, ContextValue } from './collector'

export interface PanelOptions {
  /** Panel position */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Start collapsed */
  collapsed?: boolean
  /** Dark mode */
  dark?: boolean
  /** Panel width in pixels */
  width?: number
}

const DEFAULT_OPTIONS: Required<PanelOptions> = {
  position: 'bottom-right',
  collapsed: true,
  dark: true,
  width: 420,
}

export function generateDebugPanel(data: DebugData, options: PanelOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const id = `binja-debug-${Date.now()}`
  const colors = opts.dark ? darkTheme : lightTheme

  return `
<!-- Binja Debug Panel -->
<div id="${id}" class="binja-debugger" data-theme="${opts.dark ? 'dark' : 'light'}">
<style>${generateStyles(id, colors, opts)}</style>
${generateToggle(id, data, colors)}
${generatePanel(id, data, colors, opts)}
<script>${generateScript(id)}</script>
</div>
<!-- /Binja Debug Panel -->
`
}

const darkTheme = {
  bg: '#0f0f0f',
  bgSecondary: '#1a1a1a',
  bgTertiary: '#242424',
  border: '#2a2a2a',
  borderLight: '#333',
  text: '#e5e5e5',
  textSecondary: '#a0a0a0',
  textMuted: '#666',
  accent: '#3b82f6',
  accentHover: '#2563eb',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#06b6d4',
}

const lightTheme = {
  bg: '#ffffff',
  bgSecondary: '#f8f9fa',
  bgTertiary: '#f1f3f4',
  border: '#e5e7eb',
  borderLight: '#d1d5db',
  text: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#9ca3af',
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  success: '#16a34a',
  warning: '#ca8a04',
  error: '#dc2626',
  info: '#0891b2',
}

function generateStyles(id: string, c: typeof darkTheme, opts: Required<PanelOptions>): string {
  const pos = getPosition(opts.position)

  return `
#${id} { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; font-size: 13px; line-height: 1.5; position: fixed; ${pos} z-index: 2147483647; }
#${id} * { box-sizing: border-box; margin: 0; padding: 0; }
#${id} .dbg-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: ${c.bg}; border: 1px solid ${c.border}; border-radius: 8px; color: ${c.text}; cursor: pointer; font-size: 12px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s ease; }
#${id} .dbg-toggle:hover { border-color: ${c.accent}; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
#${id} .dbg-toggle svg { width: 16px; height: 16px; }
#${id} .dbg-toggle .dbg-time { font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 11px; padding: 2px 8px; background: ${c.bgTertiary}; border-radius: 4px; color: ${c.success}; }
#${id} .dbg-panel { display: none; width: ${opts.width}px; max-height: 85vh; background: ${c.bg}; border: 1px solid ${c.border}; border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.24); overflow: hidden; margin-top: 8px; }
#${id} .dbg-panel.open { display: block; }
#${id} .dbg-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: ${c.bgSecondary}; border-bottom: 1px solid ${c.border}; }
#${id} .dbg-logo { display: flex; align-items: center; gap: 10px; font-weight: 600; color: ${c.text}; }
#${id} .dbg-logo svg { width: 20px; height: 20px; color: ${c.accent}; }
#${id} .dbg-meta { display: flex; align-items: center; gap: 12px; }
#${id} .dbg-badge { font-family: 'SF Mono', Monaco, monospace; font-size: 11px; padding: 3px 10px; border-radius: 4px; font-weight: 500; }
#${id} .dbg-badge.time { background: rgba(34,197,94,0.1); color: ${c.success}; }
#${id} .dbg-badge.mode { background: rgba(59,130,246,0.1); color: ${c.accent}; }
#${id} .dbg-close { background: none; border: none; color: ${c.textMuted}; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; }
#${id} .dbg-close:hover { background: ${c.bgTertiary}; color: ${c.text}; }
#${id} .dbg-close svg { width: 18px; height: 18px; }
#${id} .dbg-body { max-height: calc(85vh - 52px); overflow-y: auto; }
#${id} .dbg-section { border-bottom: 1px solid ${c.border}; }
#${id} .dbg-section:last-child { border-bottom: none; }
#${id} .dbg-section-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; cursor: pointer; user-select: none; transition: background 0.15s; }
#${id} .dbg-section-header:hover { background: ${c.bgSecondary}; }
#${id} .dbg-section-title { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${c.textSecondary}; }
#${id} .dbg-section-title svg { width: 14px; height: 14px; opacity: 0.7; }
#${id} .dbg-section-meta { font-size: 11px; color: ${c.textMuted}; font-family: 'SF Mono', Monaco, monospace; }
#${id} .dbg-section-content { display: none; padding: 12px 16px; background: ${c.bgSecondary}; }
#${id} .dbg-section.open .dbg-section-content { display: block; }
#${id} .dbg-section .dbg-chevron { transition: transform 0.2s; color: ${c.textMuted}; }
#${id} .dbg-section.open .dbg-chevron { transform: rotate(90deg); }
#${id} .dbg-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid ${c.border}; }
#${id} .dbg-row:last-child { border-bottom: none; }
#${id} .dbg-label { color: ${c.textSecondary}; font-size: 12px; }
#${id} .dbg-value { color: ${c.text}; font-family: 'SF Mono', Monaco, monospace; font-size: 12px; text-align: right; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#${id} .dbg-bar { height: 3px; background: ${c.bgTertiary}; border-radius: 2px; margin-top: 4px; overflow: hidden; }
#${id} .dbg-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
#${id} .dbg-bar-fill.lexer { background: ${c.info}; }
#${id} .dbg-bar-fill.parser { background: ${c.warning}; }
#${id} .dbg-bar-fill.render { background: ${c.success}; }
#${id} .dbg-templates { display: flex; flex-direction: column; gap: 6px; }
#${id} .dbg-template { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: ${c.bg}; border-radius: 6px; font-size: 12px; }
#${id} .dbg-template-icon { width: 16px; height: 16px; color: ${c.textMuted}; flex-shrink: 0; }
#${id} .dbg-template-name { color: ${c.text}; font-family: 'SF Mono', Monaco, monospace; }
#${id} .dbg-template-tag { font-size: 10px; padding: 2px 6px; border-radius: 3px; font-weight: 500; text-transform: uppercase; }
#${id} .dbg-template-tag.root { background: rgba(59,130,246,0.15); color: ${c.accent}; }
#${id} .dbg-template-tag.extends { background: rgba(168,85,247,0.15); color: #a855f7; }
#${id} .dbg-template-tag.include { background: rgba(34,197,94,0.15); color: ${c.success}; }
#${id} .dbg-ctx-grid { display: flex; flex-direction: column; gap: 4px; }
#${id} .dbg-ctx-item { background: ${c.bg}; border-radius: 6px; overflow: hidden; }
#${id} .dbg-ctx-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; cursor: default; }
#${id} .dbg-ctx-row.expandable { cursor: pointer; }
#${id} .dbg-ctx-row.expandable:hover { background: ${c.bgTertiary}; }
#${id} .dbg-ctx-key { display: flex; align-items: center; gap: 6px; }
#${id} .dbg-ctx-arrow { width: 12px; height: 12px; color: ${c.textMuted}; transition: transform 0.15s; flex-shrink: 0; }
#${id} .dbg-ctx-item.open > .dbg-ctx-row .dbg-ctx-arrow { transform: rotate(90deg); }
#${id} .dbg-ctx-name { color: ${c.text}; font-family: 'SF Mono', Monaco, monospace; font-size: 12px; }
#${id} .dbg-ctx-type { font-size: 10px; color: ${c.accent}; background: rgba(59,130,246,0.1); padding: 1px 5px; border-radius: 3px; }
#${id} .dbg-ctx-preview { color: ${c.textSecondary}; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#${id} .dbg-ctx-children { display: none; padding-left: 16px; border-left: 1px solid ${c.border}; margin-left: 10px; }
#${id} .dbg-ctx-item.open > .dbg-ctx-children { display: block; }
#${id} .dbg-ctx-children .dbg-ctx-item { background: transparent; }
#${id} .dbg-ctx-children .dbg-ctx-row { padding: 4px 8px; }
#${id} .dbg-filters { display: flex; flex-wrap: wrap; gap: 6px; }
#${id} .dbg-filter { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: ${c.bg}; border-radius: 5px; font-size: 12px; font-family: 'SF Mono', Monaco, monospace; color: ${c.text}; }
#${id} .dbg-filter-count { font-size: 10px; color: ${c.accent}; font-weight: 600; }
#${id} .dbg-cache { display: flex; gap: 16px; }
#${id} .dbg-cache-stat { flex: 1; padding: 12px; background: ${c.bg}; border-radius: 6px; text-align: center; }
#${id} .dbg-cache-num { font-size: 24px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace; }
#${id} .dbg-cache-num.hit { color: ${c.success}; }
#${id} .dbg-cache-num.miss { color: ${c.error}; }
#${id} .dbg-cache-label { font-size: 11px; color: ${c.textMuted}; margin-top: 4px; }
#${id} .dbg-warnings { display: flex; flex-direction: column; gap: 6px; }
#${id} .dbg-warning { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; background: rgba(234,179,8,0.1); border-radius: 6px; border-left: 3px solid ${c.warning}; }
#${id} .dbg-warning-icon { color: ${c.warning}; flex-shrink: 0; margin-top: 1px; }
#${id} .dbg-warning-text { color: ${c.text}; font-size: 12px; }
`
}

function getPosition(pos: string): string {
  switch (pos) {
    case 'bottom-left': return 'bottom: 16px; left: 16px;'
    case 'top-right': return 'top: 16px; right: 16px;'
    case 'top-left': return 'top: 16px; left: 16px;'
    default: return 'bottom: 16px; right: 16px;'
  }
}

const icons = {
  logo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`,
  perf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>`,
  context: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  cache: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1010 10H12V2z"/><path d="M12 2a10 10 0 00-8.66 15"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/></svg>`,
}

function generateToggle(id: string, data: DebugData, c: typeof darkTheme): string {
  const time = (data.totalTime || 0).toFixed(1)
  return `
<button class="dbg-toggle" onclick="document.querySelector('#${id} .dbg-panel').classList.add('open');this.style.display='none'">
  ${icons.logo}
  <span>Binja</span>
  <span class="dbg-time">${time}ms</span>
</button>`
}

function generatePanel(id: string, data: DebugData, c: typeof darkTheme, opts: Required<PanelOptions>): string {
  const time = (data.totalTime || 0).toFixed(2)
  const mode = data.mode === 'aot' ? 'AOT' : 'Runtime'

  return `
<div class="dbg-panel">
  <div class="dbg-header">
    <div class="dbg-logo">${icons.logo} Binja Debugger</div>
    <div class="dbg-meta">
      <span class="dbg-badge mode">${mode}</span>
      <span class="dbg-badge time">${time}ms</span>
      <button class="dbg-close" onclick="document.querySelector('#${id} .dbg-panel').classList.remove('open');document.querySelector('#${id} .dbg-toggle').style.display='inline-flex'">${icons.close}</button>
    </div>
  </div>
  <div class="dbg-body">
    ${generatePerfSection(data)}
    ${generateTemplatesSection(data)}
    ${generateContextSection(data)}
    ${generateFiltersSection(data)}
    ${generateCacheSection(data)}
    ${generateWarningsSection(data)}
  </div>
</div>`
}

function generatePerfSection(data: DebugData): string {
  const total = data.totalTime || 0.01
  const lexer = data.lexerTime || 0
  const parser = data.parserTime || 0
  const render = data.renderTime || 0

  return `
<div class="dbg-section open">
  <div class="dbg-section-header" onclick="this.parentElement.classList.toggle('open')">
    <span class="dbg-section-title">${icons.perf} Performance</span>
    <span class="dbg-chevron">${icons.chevron}</span>
  </div>
  <div class="dbg-section-content">
    <div class="dbg-row">
      <span class="dbg-label">Lexer</span>
      <span class="dbg-value">${lexer.toFixed(2)}ms</span>
    </div>
    <div class="dbg-bar"><div class="dbg-bar-fill lexer" style="width:${(lexer/total)*100}%"></div></div>
    <div class="dbg-row">
      <span class="dbg-label">Parser</span>
      <span class="dbg-value">${parser.toFixed(2)}ms</span>
    </div>
    <div class="dbg-bar"><div class="dbg-bar-fill parser" style="width:${(parser/total)*100}%"></div></div>
    <div class="dbg-row">
      <span class="dbg-label">Render</span>
      <span class="dbg-value">${render.toFixed(2)}ms</span>
    </div>
    <div class="dbg-bar"><div class="dbg-bar-fill render" style="width:${(render/total)*100}%"></div></div>
    <div class="dbg-row" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1)">
      <span class="dbg-label" style="font-weight:600">Total</span>
      <span class="dbg-value" style="font-weight:600">${total.toFixed(2)}ms</span>
    </div>
  </div>
</div>`
}

function generateTemplatesSection(data: DebugData): string {
  if (data.templateChain.length === 0) return ''

  const templates = data.templateChain.map(t => `
    <div class="dbg-template">
      ${icons.file}
      <span class="dbg-template-name">${t.name}</span>
      <span class="dbg-template-tag ${t.type}">${t.type}</span>
    </div>
  `).join('')

  return `
<div class="dbg-section">
  <div class="dbg-section-header" onclick="this.parentElement.classList.toggle('open')">
    <span class="dbg-section-title">${icons.template} Templates</span>
    <span class="dbg-section-meta">${data.templateChain.length}</span>
    <span class="dbg-chevron">${icons.chevron}</span>
  </div>
  <div class="dbg-section-content">
    <div class="dbg-templates">${templates}</div>
  </div>
</div>`
}

function generateContextSection(data: DebugData): string {
  const keys = Object.keys(data.contextSnapshot)
  if (keys.length === 0) return ''

  const items = keys.map(key => renderContextValue(key, data.contextSnapshot[key])).join('')

  return `
<div class="dbg-section">
  <div class="dbg-section-header" onclick="this.parentElement.classList.toggle('open')">
    <span class="dbg-section-title">${icons.context} Context</span>
    <span class="dbg-section-meta">${keys.length} vars</span>
    <span class="dbg-chevron">${icons.chevron}</span>
  </div>
  <div class="dbg-section-content">
    <div class="dbg-ctx-grid">${items}</div>
  </div>
</div>`
}

function renderContextValue(key: string, ctx: ContextValue): string {
  const arrow = ctx.expandable
    ? `<svg class="dbg-ctx-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`
    : ''

  const expandableClass = ctx.expandable ? 'expandable' : ''
  const onClick = ctx.expandable ? 'onclick="this.parentElement.classList.toggle(\'open\')"' : ''

  let children = ''
  if (ctx.expandable && ctx.children) {
    const childItems = Object.entries(ctx.children)
      .map(([k, v]) => renderContextValue(k, v))
      .join('')
    children = `<div class="dbg-ctx-children">${childItems}</div>`
  }

  return `
  <div class="dbg-ctx-item">
    <div class="dbg-ctx-row ${expandableClass}" ${onClick}>
      <div class="dbg-ctx-key">
        ${arrow}
        <span class="dbg-ctx-name">${escapeHtml(key)}</span>
        <span class="dbg-ctx-type">${ctx.type}</span>
      </div>
      <span class="dbg-ctx-preview">${escapeHtml(ctx.preview)}</span>
    </div>
    ${children}
  </div>`
}

function generateFiltersSection(data: DebugData): string {
  const filters = Array.from(data.filtersUsed.entries())
  if (filters.length === 0) return ''

  const items = filters.map(([name, count]) =>
    `<span class="dbg-filter">${name}<span class="dbg-filter-count">×${count}</span></span>`
  ).join('')

  return `
<div class="dbg-section">
  <div class="dbg-section-header" onclick="this.parentElement.classList.toggle('open')">
    <span class="dbg-section-title">${icons.filter} Filters</span>
    <span class="dbg-section-meta">${filters.length}</span>
    <span class="dbg-chevron">${icons.chevron}</span>
  </div>
  <div class="dbg-section-content">
    <div class="dbg-filters">${items}</div>
  </div>
</div>`
}

function generateCacheSection(data: DebugData): string {
  const total = data.cacheHits + data.cacheMisses
  if (total === 0) return ''

  return `
<div class="dbg-section">
  <div class="dbg-section-header" onclick="this.parentElement.classList.toggle('open')">
    <span class="dbg-section-title">${icons.cache} Cache</span>
    <span class="dbg-section-meta">${((data.cacheHits/total)*100).toFixed(0)}% hit</span>
    <span class="dbg-chevron">${icons.chevron}</span>
  </div>
  <div class="dbg-section-content">
    <div class="dbg-cache">
      <div class="dbg-cache-stat">
        <div class="dbg-cache-num hit">${data.cacheHits}</div>
        <div class="dbg-cache-label">Cache Hits</div>
      </div>
      <div class="dbg-cache-stat">
        <div class="dbg-cache-num miss">${data.cacheMisses}</div>
        <div class="dbg-cache-label">Cache Misses</div>
      </div>
    </div>
  </div>
</div>`
}

function generateWarningsSection(data: DebugData): string {
  if (data.warnings.length === 0) return ''

  const items = data.warnings.map(w => `
    <div class="dbg-warning">
      ${icons.warning}
      <span class="dbg-warning-text">${escapeHtml(w)}</span>
    </div>
  `).join('')

  return `
<div class="dbg-section open">
  <div class="dbg-section-header" onclick="this.parentElement.classList.toggle('open')">
    <span class="dbg-section-title">${icons.warning} Warnings</span>
    <span class="dbg-section-meta" style="color:#eab308">${data.warnings.length}</span>
    <span class="dbg-chevron">${icons.chevron}</span>
  </div>
  <div class="dbg-section-content">
    <div class="dbg-warnings">${items}</div>
  </div>
</div>`
}

function generateScript(id: string): string {
  return `
(function(){
  var panel = document.getElementById('${id}');
  if (!panel) return;
  var header = panel.querySelector('.dbg-header');
  if (!header) return;
  var isDrag = false, startX, startY, startL, startT;
  header.style.cursor = 'grab';
  header.onmousedown = function(e) {
    if (e.target.closest('.dbg-close')) return;
    isDrag = true;
    header.style.cursor = 'grabbing';
    startX = e.clientX;
    startY = e.clientY;
    var r = panel.getBoundingClientRect();
    startL = r.left;
    startT = r.top;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = startL + 'px';
    panel.style.top = startT + 'px';
  };
  document.onmousemove = function(e) {
    if (!isDrag) return;
    panel.style.left = (startL + e.clientX - startX) + 'px';
    panel.style.top = (startT + e.clientY - startY) + 'px';
  };
  document.onmouseup = function() {
    isDrag = false;
    header.style.cursor = 'grab';
  };
})();`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
