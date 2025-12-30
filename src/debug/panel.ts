/**
 * Debug Panel - Chrome DevTools-style debugging interface
 */

import type { DebugData, ContextValue } from './collector'

export interface PanelOptions {
  /** Panel position: 'bottom' (default), 'right', or 'popup' */
  position?: 'bottom' | 'right' | 'popup'
  /** Initial height in pixels (for bottom dock) */
  height?: number
  /** Initial width in pixels (for right dock) */
  width?: number
  /** Start with panel open */
  open?: boolean
  /** Dark mode (default: true) */
  dark?: boolean
}

const DEFAULT_OPTIONS: Required<PanelOptions> = {
  position: 'bottom',
  height: 300,
  width: 400,
  open: false,
  dark: true,
}

export function generateDebugPanel(data: DebugData, options: PanelOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const id = `binja-dbg-${Date.now()}`
  const c = opts.dark ? darkTheme : lightTheme

  return `
<!-- Binja Debug Panel -->
<div id="${id}" class="binja-devtools" data-position="${opts.position}" data-open="${opts.open}">
<style>${generateStyles(id, c, opts)}</style>
${generateHTML(id, data, c, opts)}
<script>${generateScript(id, data, opts)}</script>
</div>
<!-- /Binja Debug Panel -->
`
}

const darkTheme = {
  bg: '#1e1e1e',
  bgPanel: '#252526',
  bgHover: '#2a2d2e',
  bgActive: '#37373d',
  border: '#3c3c3c',
  text: '#cccccc',
  textSecondary: '#969696',
  textMuted: '#6e6e6e',
  accent: '#0078d4',
  accentHover: '#1c86d8',
  success: '#4ec9b0',
  warning: '#dcdcaa',
  error: '#f14c4c',
  info: '#75beff',
  string: '#ce9178',
  number: '#b5cea8',
  keyword: '#569cd6',
}

const lightTheme = {
  bg: '#f3f3f3',
  bgPanel: '#ffffff',
  bgHover: '#e8e8e8',
  bgActive: '#d4d4d4',
  border: '#d4d4d4',
  text: '#1e1e1e',
  textSecondary: '#616161',
  textMuted: '#a0a0a0',
  accent: '#0078d4',
  accentHover: '#106ebe',
  success: '#16825d',
  warning: '#bf8803',
  error: '#cd3131',
  info: '#0078d4',
  string: '#a31515',
  number: '#098658',
  keyword: '#0000ff',
}

function generateStyles(id: string, c: typeof darkTheme, opts: Required<PanelOptions>): string {
  return `
#${id} { --bg: ${c.bg}; --bg-panel: ${c.bgPanel}; --bg-hover: ${c.bgHover}; --bg-active: ${c.bgActive}; --border: ${c.border}; --text: ${c.text}; --text-secondary: ${c.textSecondary}; --text-muted: ${c.textMuted}; --accent: ${c.accent}; --success: ${c.success}; --warning: ${c.warning}; --error: ${c.error}; --string: ${c.string}; --number: ${c.number}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; font-size: 12px; line-height: 1.4; color: var(--text); }
#${id} * { box-sizing: border-box; margin: 0; padding: 0; }

/* Toggle Button */
#${id} .devtools-toggle { position: fixed; bottom: 10px; right: 10px; z-index: 2147483646; display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text); cursor: pointer; font-size: 11px; font-weight: 500; box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: all 0.15s; }
#${id} .devtools-toggle:hover { background: var(--bg-hover); border-color: var(--accent); }
#${id} .devtools-toggle svg { width: 14px; height: 14px; color: var(--accent); }
#${id} .devtools-toggle .badge { padding: 2px 6px; background: var(--accent); color: #fff; border-radius: 3px; font-size: 10px; }
#${id}[data-open="true"] .devtools-toggle { display: none; }

/* Panel Container */
#${id} .devtools-panel { display: none; position: fixed; z-index: 2147483647; background: var(--bg); border: 1px solid var(--border); box-shadow: 0 -2px 12px rgba(0,0,0,0.3); }
#${id}[data-open="true"] .devtools-panel { display: flex; flex-direction: column; }
#${id}[data-position="bottom"] .devtools-panel { left: 0; right: 0; bottom: 0; height: ${opts.height}px; border-left: none; border-right: none; border-bottom: none; }
#${id}[data-position="right"] .devtools-panel { top: 0; right: 0; bottom: 0; width: ${opts.width}px; border-top: none; border-right: none; border-bottom: none; }
#${id}[data-position="popup"] .devtools-panel { bottom: 50px; right: 20px; width: 700px; height: 500px; border-radius: 8px; }

/* Resize Handle */
#${id} .devtools-resize { position: absolute; background: transparent; }
#${id}[data-position="bottom"] .devtools-resize { top: 0; left: 0; right: 0; height: 4px; cursor: ns-resize; }
#${id}[data-position="right"] .devtools-resize { top: 0; left: 0; bottom: 0; width: 4px; cursor: ew-resize; }
#${id} .devtools-resize:hover { background: var(--accent); }

/* Toolbar */
#${id} .devtools-toolbar { display: flex; align-items: center; justify-content: space-between; height: 30px; padding: 0 8px; background: var(--bg-panel); border-bottom: 1px solid var(--border); flex-shrink: 0; }
#${id} .devtools-tabs { display: flex; height: 100%; }
#${id} .devtools-tab { display: flex; align-items: center; gap: 4px; padding: 0 12px; border: none; background: none; color: var(--text-secondary); font-size: 11px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.1s; }
#${id} .devtools-tab:hover { color: var(--text); background: var(--bg-hover); }
#${id} .devtools-tab.active { color: var(--text); border-bottom-color: var(--accent); }
#${id} .devtools-tab svg { width: 12px; height: 12px; opacity: 0.7; }
#${id} .devtools-tab .count { margin-left: 4px; padding: 1px 5px; background: var(--bg-active); border-radius: 8px; font-size: 10px; }
#${id} .devtools-tab .count.warn { background: rgba(241,76,76,0.2); color: var(--error); }
#${id} .devtools-actions { display: flex; align-items: center; gap: 4px; }
#${id} .devtools-btn { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: none; background: none; color: var(--text-secondary); cursor: pointer; border-radius: 3px; }
#${id} .devtools-btn:hover { background: var(--bg-hover); color: var(--text); }
#${id} .devtools-btn svg { width: 14px; height: 14px; }

/* Content Area */
#${id} .devtools-content { flex: 1; overflow: hidden; }
#${id} .devtools-pane { display: none; height: 100%; overflow: auto; padding: 8px; }
#${id} .devtools-pane.active { display: block; }

/* Performance Tab */
#${id} .perf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 12px; }
#${id} .perf-card { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 4px; padding: 10px; text-align: center; }
#${id} .perf-card-value { font-size: 20px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace; color: var(--success); }
#${id} .perf-card-label { font-size: 10px; color: var(--text-muted); margin-top: 4px; text-transform: uppercase; }
#${id} .perf-breakdown { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
#${id} .perf-row { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border); }
#${id} .perf-row:last-child { border-bottom: none; }
#${id} .perf-row-label { flex: 1; font-size: 11px; color: var(--text-secondary); }
#${id} .perf-row-value { font-family: 'SF Mono', Monaco, monospace; font-size: 11px; min-width: 60px; text-align: right; }
#${id} .perf-row-bar { flex: 2; height: 4px; background: var(--bg-active); border-radius: 2px; margin: 0 12px; overflow: hidden; }
#${id} .perf-row-fill { height: 100%; border-radius: 2px; }
#${id} .perf-row-fill.lexer { background: ${c.info}; }
#${id} .perf-row-fill.parser { background: ${c.warning}; }
#${id} .perf-row-fill.render { background: ${c.success}; }

/* Context Tab - Tree View */
#${id} .tree { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 11px; }
#${id} .tree-item { }
#${id} .tree-row { display: flex; align-items: center; padding: 2px 4px; cursor: default; border-radius: 2px; }
#${id} .tree-row:hover { background: var(--bg-hover); }
#${id} .tree-row.expandable { cursor: pointer; }
#${id} .tree-arrow { width: 12px; height: 12px; color: var(--text-muted); transition: transform 0.1s; flex-shrink: 0; }
#${id} .tree-item.open > .tree-row .tree-arrow { transform: rotate(90deg); }
#${id} .tree-key { color: var(--keyword); margin-right: 4px; }
#${id} .tree-colon { color: var(--text-muted); margin-right: 6px; }
#${id} .tree-value { color: var(--text); }
#${id} .tree-value.string { color: var(--string); }
#${id} .tree-value.number { color: var(--number); }
#${id} .tree-value.null { color: var(--text-muted); font-style: italic; }
#${id} .tree-type { color: var(--text-muted); margin-left: 6px; font-size: 10px; }
#${id} .tree-children { display: none; padding-left: 16px; }
#${id} .tree-item.open > .tree-children { display: block; }

/* Templates Tab */
#${id} .template-list { display: flex; flex-direction: column; gap: 4px; }
#${id} .template-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: 4px; }
#${id} .template-icon { width: 14px; height: 14px; color: var(--text-muted); }
#${id} .template-name { font-family: 'SF Mono', Monaco, monospace; font-size: 11px; }
#${id} .template-badge { font-size: 9px; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; font-weight: 500; }
#${id} .template-badge.root { background: rgba(0,120,212,0.15); color: var(--accent); }
#${id} .template-badge.extends { background: rgba(156,86,246,0.15); color: #9c56f6; }
#${id} .template-badge.include { background: rgba(78,201,176,0.15); color: var(--success); }

/* Queries Tab */
#${id} .queries-stats { display: flex; gap: 16px; padding: 8px 12px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px; }
#${id} .queries-stat { text-align: center; }
#${id} .queries-stat-value { font-size: 16px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace; }
#${id} .queries-stat-value.warn { color: var(--warning); }
#${id} .queries-stat-value.error { color: var(--error); }
#${id} .queries-stat-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; }
#${id} .query-list { display: flex; flex-direction: column; gap: 4px; }
#${id} .query-item { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
#${id} .query-item.n1 { border-left: 3px solid var(--error); }
#${id} .query-item.slow { border-left: 3px solid var(--warning); }
#${id} .query-header { display: flex; align-items: center; gap: 8px; padding: 6px 10px; }
#${id} .query-sql { flex: 1; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
#${id} .query-meta { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
#${id} .query-badge { font-size: 9px; padding: 2px 5px; border-radius: 3px; font-weight: 600; }
#${id} .query-badge.n1 { background: rgba(241,76,76,0.15); color: var(--error); }
#${id} .query-source { font-size: 9px; padding: 2px 5px; border-radius: 3px; background: var(--bg-active); color: var(--text-muted); text-transform: uppercase; }
#${id} .query-time { font-family: 'SF Mono', Monaco, monospace; font-size: 10px; color: var(--text-secondary); }
#${id} .query-time.slow { color: var(--warning); }
#${id} .query-rows { font-size: 10px; color: var(--text-muted); }

/* Filters Tab */
#${id} .filter-grid { display: flex; flex-wrap: wrap; gap: 6px; }
#${id} .filter-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: 4px; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; }
#${id} .filter-count { color: var(--accent); font-weight: 600; font-size: 10px; }

/* Cache Tab */
#${id} .cache-stats { display: flex; gap: 20px; }
#${id} .cache-stat { flex: 1; background: var(--bg-panel); border: 1px solid var(--border); border-radius: 4px; padding: 16px; text-align: center; }
#${id} .cache-value { font-size: 32px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace; }
#${id} .cache-value.hit { color: var(--success); }
#${id} .cache-value.miss { color: var(--error); }
#${id} .cache-label { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

/* Warnings Tab */
#${id} .warning-list { display: flex; flex-direction: column; gap: 6px; }
#${id} .warning-item { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; background: rgba(241,76,76,0.08); border: 1px solid rgba(241,76,76,0.2); border-radius: 4px; }
#${id} .warning-icon { color: var(--error); flex-shrink: 0; width: 14px; height: 14px; }
#${id} .warning-text { font-size: 11px; color: var(--text); }

/* Empty State */
#${id} .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 12px; }
#${id} .empty-state svg { width: 32px; height: 32px; margin-bottom: 8px; opacity: 0.5; }
`
}

const icons = {
  logo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  minimize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>`,
  dock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18"/></svg>`,
  dockRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg>`,
  popup: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v6h6"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`,
  perf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  context: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`,
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  database: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  cache: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1010 10H12V2z"/><path d="M12 2a10 10 0 00-8.66 15"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
}

function generateHTML(id: string, data: DebugData, c: typeof darkTheme, opts: Required<PanelOptions>): string {
  const time = (data.totalTime || 0).toFixed(1)
  const queryCount = data.queries?.length || 0
  const hasWarnings = data.warnings.length > 0 || data.queryStats?.n1Count > 0

  // Build tabs array with counts
  const tabs = [
    { id: 'perf', icon: icons.perf, label: 'Performance', count: `${time}ms` },
    { id: 'context', icon: icons.context, label: 'Context', count: Object.keys(data.contextSnapshot).length || null },
    { id: 'templates', icon: icons.template, label: 'Templates', count: data.templateChain.length || null },
    { id: 'filters', icon: icons.filter, label: 'Filters', count: data.filtersUsed.size || null },
    { id: 'queries', icon: icons.database, label: 'Queries', count: queryCount || null, warn: data.queryStats?.n1Count > 0 },
    { id: 'cache', icon: icons.cache, label: 'Cache', count: (data.cacheHits + data.cacheMisses) || null },
    { id: 'warnings', icon: icons.warning, label: 'Warnings', count: data.warnings.length || null, warn: hasWarnings },
  ]

  const tabsHtml = tabs.map((t, i) => {
    const countHtml = t.count !== null ? `<span class="count${t.warn ? ' warn' : ''}">${t.count}</span>` : ''
    return `<button class="devtools-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.icon}${t.label}${countHtml}</button>`
  }).join('')

  return `
<button class="devtools-toggle" onclick="document.getElementById('${id}').dataset.open='true'">
  ${icons.logo}
  <span>Binja</span>
  <span class="badge">${time}ms</span>
</button>

<div class="devtools-panel">
  <div class="devtools-resize"></div>
  <div class="devtools-toolbar">
    <div class="devtools-tabs">${tabsHtml}</div>
    <div class="devtools-actions">
      <button class="devtools-btn" title="Dock to bottom" data-dock="bottom">${icons.dock}</button>
      <button class="devtools-btn" title="Dock to right" data-dock="right">${icons.dockRight}</button>
      <button class="devtools-btn" title="Popup" data-dock="popup">${icons.popup}</button>
      <button class="devtools-btn" title="Close" onclick="document.getElementById('${id}').dataset.open='false'">${icons.close}</button>
    </div>
  </div>
  <div class="devtools-content">
    ${generatePerfPane(data)}
    ${generateContextPane(data)}
    ${generateTemplatesPane(data)}
    ${generateFiltersPane(data)}
    ${generateQueriesPane(data)}
    ${generateCachePane(data)}
    ${generateWarningsPane(data)}
  </div>
</div>`
}

function generatePerfPane(data: DebugData): string {
  const total = data.totalTime || 0.01
  const lexer = data.lexerTime || 0
  const parser = data.parserTime || 0
  const render = data.renderTime || 0
  const mode = data.mode === 'aot' ? 'AOT' : 'Runtime'

  return `
<div class="devtools-pane active" data-pane="perf">
  <div class="perf-grid">
    <div class="perf-card">
      <div class="perf-card-value">${total.toFixed(2)}ms</div>
      <div class="perf-card-label">Total Time</div>
    </div>
    <div class="perf-card">
      <div class="perf-card-value" style="color:var(--accent)">${mode}</div>
      <div class="perf-card-label">Mode</div>
    </div>
    <div class="perf-card">
      <div class="perf-card-value">${data.templateChain.length}</div>
      <div class="perf-card-label">Templates</div>
    </div>
    <div class="perf-card">
      <div class="perf-card-value">${data.queries?.length || 0}</div>
      <div class="perf-card-label">Queries</div>
    </div>
  </div>
  <div class="perf-breakdown">
    <div class="perf-row">
      <span class="perf-row-label">Lexer</span>
      <div class="perf-row-bar"><div class="perf-row-fill lexer" style="width:${(lexer/total)*100}%"></div></div>
      <span class="perf-row-value">${lexer.toFixed(2)}ms</span>
    </div>
    <div class="perf-row">
      <span class="perf-row-label">Parser</span>
      <div class="perf-row-bar"><div class="perf-row-fill parser" style="width:${(parser/total)*100}%"></div></div>
      <span class="perf-row-value">${parser.toFixed(2)}ms</span>
    </div>
    <div class="perf-row">
      <span class="perf-row-label">Render</span>
      <div class="perf-row-bar"><div class="perf-row-fill render" style="width:${(render/total)*100}%"></div></div>
      <span class="perf-row-value">${render.toFixed(2)}ms</span>
    </div>
  </div>
</div>`
}

function generateContextPane(data: DebugData): string {
  const keys = Object.keys(data.contextSnapshot)
  if (keys.length === 0) {
    return `<div class="devtools-pane" data-pane="context"><div class="empty-state">${icons.context}<span>No context variables</span></div></div>`
  }

  const items = keys.map(key => renderTreeItem(key, data.contextSnapshot[key])).join('')
  return `<div class="devtools-pane" data-pane="context"><div class="tree">${items}</div></div>`
}

function renderTreeItem(key: string, ctx: ContextValue): string {
  const hasChildren = ctx.expandable && ctx.children && Object.keys(ctx.children).length > 0
  const arrowHtml = hasChildren ? `<span class="tree-arrow">${icons.arrow}</span>` : '<span class="tree-arrow" style="visibility:hidden">${icons.arrow}</span>'
  const expandableClass = hasChildren ? 'expandable' : ''
  const valueClass = getValueClass(ctx.type)

  let childrenHtml = ''
  if (hasChildren && ctx.children) {
    childrenHtml = `<div class="tree-children">${Object.entries(ctx.children).map(([k, v]) => renderTreeItem(k, v)).join('')}</div>`
  }

  return `
<div class="tree-item">
  <div class="tree-row ${expandableClass}">
    ${arrowHtml}
    <span class="tree-key">${escapeHtml(key)}</span>
    <span class="tree-colon">:</span>
    <span class="tree-value ${valueClass}">${escapeHtml(ctx.preview)}</span>
    <span class="tree-type">${ctx.type}</span>
  </div>
  ${childrenHtml}
</div>`
}

function getValueClass(type: string): string {
  if (type === 'string') return 'string'
  if (type === 'number' || type === 'integer' || type === 'float') return 'number'
  if (type === 'null' || type === 'undefined') return 'null'
  return ''
}

function generateTemplatesPane(data: DebugData): string {
  if (data.templateChain.length === 0) {
    return `<div class="devtools-pane" data-pane="templates"><div class="empty-state">${icons.template}<span>No templates loaded</span></div></div>`
  }

  const items = data.templateChain.map(t => `
    <div class="template-item">
      <span class="template-icon">${icons.template}</span>
      <span class="template-name">${escapeHtml(t.name)}</span>
      <span class="template-badge ${t.type}">${t.type}</span>
    </div>
  `).join('')

  return `<div class="devtools-pane" data-pane="templates"><div class="template-list">${items}</div></div>`
}

function generateFiltersPane(data: DebugData): string {
  const filters = Array.from(data.filtersUsed.entries())
  if (filters.length === 0) {
    return `<div class="devtools-pane" data-pane="filters"><div class="empty-state">${icons.filter}<span>No filters used</span></div></div>`
  }

  const items = filters.map(([name, count]) => `
    <span class="filter-chip">${escapeHtml(name)}<span class="filter-count">×${count}</span></span>
  `).join('')

  return `<div class="devtools-pane" data-pane="filters"><div class="filter-grid">${items}</div></div>`
}

function generateQueriesPane(data: DebugData): string {
  if (!data.queries || data.queries.length === 0) {
    return `<div class="devtools-pane" data-pane="queries"><div class="empty-state">${icons.database}<span>No queries recorded</span></div></div>`
  }

  const stats = data.queryStats
  const statsHtml = `
    <div class="queries-stats">
      <div class="queries-stat">
        <div class="queries-stat-value">${stats.count}</div>
        <div class="queries-stat-label">Queries</div>
      </div>
      <div class="queries-stat">
        <div class="queries-stat-value">${stats.totalDuration.toFixed(1)}ms</div>
        <div class="queries-stat-label">Total</div>
      </div>
      <div class="queries-stat">
        <div class="queries-stat-value ${stats.slowCount > 0 ? 'warn' : ''}">${stats.slowCount}</div>
        <div class="queries-stat-label">Slow</div>
      </div>
      <div class="queries-stat">
        <div class="queries-stat-value ${stats.n1Count > 0 ? 'error' : ''}">${stats.n1Count}</div>
        <div class="queries-stat-label">N+1</div>
      </div>
    </div>`

  const queries = data.queries.map(q => {
    const isSlow = q.duration > 100
    const classes = ['query-item', q.isN1 ? 'n1' : '', isSlow ? 'slow' : ''].filter(Boolean).join(' ')
    const badge = q.isN1 ? '<span class="query-badge n1">N+1</span>' : ''
    const source = q.source ? `<span class="query-source">${escapeHtml(q.source)}</span>` : ''
    const rows = q.rows !== undefined ? `<span class="query-rows">${q.rows} rows</span>` : ''

    return `
    <div class="${classes}">
      <div class="query-header">
        <span class="query-sql" title="${escapeHtml(q.sql)}">${escapeHtml(q.sql)}</span>
        <div class="query-meta">
          ${badge}${source}${rows}
          <span class="query-time ${isSlow ? 'slow' : ''}">${q.duration.toFixed(1)}ms</span>
        </div>
      </div>
    </div>`
  }).join('')

  return `<div class="devtools-pane" data-pane="queries">${statsHtml}<div class="query-list">${queries}</div></div>`
}

function generateCachePane(data: DebugData): string {
  const total = data.cacheHits + data.cacheMisses
  if (total === 0) {
    return `<div class="devtools-pane" data-pane="cache"><div class="empty-state">${icons.cache}<span>No cache activity</span></div></div>`
  }

  const hitRate = ((data.cacheHits / total) * 100).toFixed(0)

  return `
<div class="devtools-pane" data-pane="cache">
  <div class="cache-stats">
    <div class="cache-stat">
      <div class="cache-value hit">${data.cacheHits}</div>
      <div class="cache-label">Cache Hits</div>
    </div>
    <div class="cache-stat">
      <div class="cache-value miss">${data.cacheMisses}</div>
      <div class="cache-label">Cache Misses</div>
    </div>
    <div class="cache-stat">
      <div class="cache-value">${hitRate}%</div>
      <div class="cache-label">Hit Rate</div>
    </div>
  </div>
</div>`
}

function generateWarningsPane(data: DebugData): string {
  if (data.warnings.length === 0) {
    return `<div class="devtools-pane" data-pane="warnings"><div class="empty-state">${icons.warning}<span>No warnings</span></div></div>`
  }

  const items = data.warnings.map(w => `
    <div class="warning-item">
      <span class="warning-icon">${icons.warning}</span>
      <span class="warning-text">${escapeHtml(w)}</span>
    </div>
  `).join('')

  return `<div class="devtools-pane" data-pane="warnings"><div class="warning-list">${items}</div></div>`
}

function generateScript(id: string, data: DebugData, opts: Required<PanelOptions>): string {
  return `
(function() {
  var root = document.getElementById('${id}');
  if (!root) return;

  // Tab switching
  root.querySelectorAll('.devtools-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      root.querySelectorAll('.devtools-tab').forEach(function(t) { t.classList.remove('active'); });
      root.querySelectorAll('.devtools-pane').forEach(function(p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var pane = root.querySelector('[data-pane="' + tab.dataset.tab + '"]');
      if (pane) pane.classList.add('active');
    });
  });

  // Tree expand/collapse
  root.querySelectorAll('.tree-row.expandable').forEach(function(row) {
    row.addEventListener('click', function() {
      row.parentElement.classList.toggle('open');
    });
  });

  // Dock position switching
  root.querySelectorAll('[data-dock]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      root.dataset.position = btn.dataset.dock;
    });
  });

  // Resize functionality
  var resize = root.querySelector('.devtools-resize');
  var panel = root.querySelector('.devtools-panel');
  if (resize && panel) {
    var isResizing = false;
    var startY, startX, startHeight, startWidth;

    resize.addEventListener('mousedown', function(e) {
      isResizing = true;
      startY = e.clientY;
      startX = e.clientX;
      startHeight = panel.offsetHeight;
      startWidth = panel.offsetWidth;
      document.body.style.cursor = root.dataset.position === 'right' ? 'ew-resize' : 'ns-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isResizing) return;
      if (root.dataset.position === 'bottom') {
        var newHeight = startHeight - (e.clientY - startY);
        if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
          panel.style.height = newHeight + 'px';
        }
      } else if (root.dataset.position === 'right') {
        var newWidth = startWidth - (e.clientX - startX);
        if (newWidth > 200 && newWidth < window.innerWidth * 0.6) {
          panel.style.width = newWidth + 'px';
        }
      }
    });

    document.addEventListener('mouseup', function() {
      isResizing = false;
      document.body.style.cursor = '';
    });
  }
})();`
}

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
