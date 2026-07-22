import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const projectRoot = dirname(import.meta.dir)
const cliPath = join(projectRoot, 'src', 'cli.ts')
const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true })))
})

async function makeWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(projectRoot, '.binja-cli-test-'))
  workspaces.push(workspace)
  return workspace
}

async function runCli(
  args: string[]
): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  const child = Bun.spawn([process.execPath, cliPath, ...args], {
    cwd: projectRoot,
    stderr: 'pipe',
    stdout: 'pipe',
  })
  const [exitCode, stderr, stdout] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
    new Response(child.stdout).text(),
  ])
  return { exitCode, stderr, stdout }
}

describe('CLI integration', () => {
  test('compiled modules execute built-in filters and tests', async () => {
    const workspace = await makeWorkspace()
    const source = join(workspace, 'views', 'card.html')
    const output = join(workspace, 'compiled')
    await mkdir(dirname(source), { recursive: true })
    await writeFile(source, '{{ items|length }}:{% if value is even %}even{% else %}odd{% endif %}')

    const result = await runCli(['compile', source, '-o', output, '--name', 'renderCard'])
    expect(result.exitCode, result.stderr || result.stdout).toBe(0)

    const generated = await import(`${join(output, 'card.js')}?test=${Date.now()}`)
    expect(generated.render({ items: [1, 2, 3], value: 4 })).toBe('3:even')
  })

  test('check rejects dynamic template loading with a non-zero exit code', async () => {
    const workspace = await makeWorkspace()
    const source = join(workspace, 'dynamic.html')
    await writeFile(source, '{% include template_name %}')

    const result = await runCli(['check', source])
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('Dynamic include at line 1')
  })
})
