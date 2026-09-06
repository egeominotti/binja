import { expect, spyOn, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { CacheRegistry } from '../src/adapters/cache-registry'
import { TemplateRenderer } from '../src/adapters/renderer'

type CompiledTemplate = (context: Record<string, any>) => Promise<string>

test('concurrent cache misses share compilation without sharing render context', async () => {
  const registry = new CacheRegistry()
  const renderer = new TemplateRenderer({ engine: 'liquid', cache: true }, registry)
  const pending = Promise.withResolvers<CompiledTemplate>()
  const compile = spyOn(
    renderer as unknown as { compileFile: () => Promise<CompiledTemplate> },
    'compileFile'
  ).mockImplementation(() => pending.promise)
  try {
    const results = Array.from({ length: 20 }, (_, marker) => renderer.render('page', { marker }))
    expect(compile).toHaveBeenCalledTimes(1)
    pending.resolve(async ({ marker }) => String(marker))
    expect(await Promise.all(results)).toEqual(
      Array.from({ length: 20 }, (_, marker) => String(marker))
    )
    expect(registry.stats().size).toBe(1)
  } finally {
    compile.mockRestore()
  }
})

test('clearCache cannot be undone by an older in-flight compilation', async () => {
  const registry = new CacheRegistry()
  const renderer = new TemplateRenderer({ engine: 'liquid', cache: true }, registry)
  const oldLoad = Promise.withResolvers<CompiledTemplate>()
  const newLoad = Promise.withResolvers<CompiledTemplate>()
  const compile = spyOn(
    renderer as unknown as { compileFile: () => Promise<CompiledTemplate> },
    'compileFile'
  )
    .mockImplementationOnce(() => oldLoad.promise)
    .mockImplementationOnce(() => newLoad.promise)
  try {
    const oldRender = renderer.render('page')
    registry.clear()
    const newRender = renderer.render('page')
    oldLoad.resolve(async () => 'old')
    expect(await oldRender).toBe('old')
    expect(registry.stats().size).toBe(0)
    const joinedRender = renderer.render('page')
    expect(compile).toHaveBeenCalledTimes(2)
    newLoad.resolve(async () => 'new')
    expect(await newRender).toBe('new')
    expect(await joinedRender).toBe('new')
    expect(await renderer.render('page')).toBe('new')
    expect(registry.stats().size).toBe(1)
  } finally {
    compile.mockRestore()
  }
})

test('failed loads are not retained and a later valid file can be loaded', async () => {
  const root = mkdtempSync(join(tmpdir(), 'binja-load-retry-'))
  const registry = new CacheRegistry()
  const renderer = new TemplateRenderer({ root, engine: 'liquid', cache: true }, registry)
  try {
    await expect(renderer.render('page')).rejects.toThrow()
    expect(registry.stats().size).toBe(0)
    writeFileSync(join(root, 'page.html'), '{% unknown %}')
    await expect(renderer.render('page')).rejects.toThrow()
    expect(registry.stats().size).toBe(0)
    writeFileSync(join(root, 'page.html'), 'recovered {{ value }}')
    expect(await renderer.render('page', { value: 'yes' })).toBe('recovered yes')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

for (const adapter of ['hono', 'elysia']) {
  test(`${adapter} releases registry entries after discarded adapter instances are collected`, async () => {
    // Isolate global framework registries and JSC object counts from the test runner.
    const child = Bun.spawn(
      [
        process.execPath,
        '--eval',
        `
      import { heapStats } from 'bun:jsc';
      import { binja } from './src/adapters/${adapter}.ts';
      const samples = [];
      for (let batch = 0; batch < 6; batch++) {
        for (let i = 0; i < 1000; i++) binja({ root: '/tmp/unused-' + batch + '-' + i, cache: true });
        for (let turn = 0; turn < 4; turn++) { await Bun.sleep(10); Bun.gc(true); }
        samples.push(heapStats().objectTypeCounts.WeakRef ?? 0);
      }
      console.log(JSON.stringify(samples));
    `,
      ],
      {
        cwd: resolve(import.meta.dir, '..'),
        stdout: 'pipe',
        stderr: 'pipe',
      }
    )
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect({ exit, stderr }).toEqual({ exit: 0, stderr: '' })
    const samples: number[] = JSON.parse(stdout)
    expect(samples).toHaveLength(6)
    // JSC retains a small finalizer metadata batch even after all registry entries
    // are deleted. Leave headroom for it; the old registry retains 6,000 entries.
    expect(Math.max(...samples)).toBeLessThan(1_024)
  }, 10_000)
}
