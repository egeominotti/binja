import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

interface PackageManifest {
  name: string
  version: string
}

interface PackedPackage {
  filename: string
}

const projectRoot = resolve(import.meta.dir, '..')
const manifest = JSON.parse(
  await readFile(join(projectRoot, 'package.json'), 'utf8')
) as PackageManifest
const workspace = await mkdtemp(join(tmpdir(), 'binja-package-smoke-'))

try {
  const packOutput = await run(
    ['npm', 'pack', '--json', '--ignore-scripts', '--pack-destination', workspace],
    projectRoot
  )
  const packedPackages = parsePackedPackages(packOutput)
  const packedPackage = packedPackages[0]
  if (!packedPackage) throw new Error('npm pack did not produce a tarball')

  const tarball = join(workspace, packedPackage.filename)
  const consumer = join(workspace, 'consumer')
  await Bun.write(join(consumer, 'package.json'), '{"name":"binja-smoke","private":true}')
  await run(
    ['npm', 'install', '--ignore-scripts', '--omit=peer', '--no-audit', '--no-fund', tarball],
    consumer
  )

  const smokeFile = join(consumer, 'smoke.ts')
  await writeFile(
    smokeFile,
    `
const [root, ai, debug, hono, elysia, engines, handlebars, liquid, twig] = await Promise.all([
  import('binja'),
  import('binja/ai'),
  import('binja/debug'),
  import('binja/hono'),
  import('binja/elysia'),
  import('binja/engines'),
  import('binja/engines/handlebars'),
  import('binja/engines/liquid'),
  import('binja/engines/twig'),
])

const rendered = await root.render('Hello {{ name }}!', { name: 'stable' })
if (rendered !== 'Hello stable!') throw new Error(\`Unexpected runtime output: \${rendered}\`)

const compiled = root.compile('{{ value|upper }}')
const compiledOutput = await compiled({ value: 'stable' })
if (compiledOutput !== 'STABLE') {
  throw new Error(\`Unexpected AOT output: \${compiledOutput}\`)
}

if (await handlebars.render('Hello {{name}}', { name: 'HBS' }) !== 'Hello HBS') {
  throw new Error('Handlebars subpath failed')
}
if (await liquid.render('{{ name | upcase }}', { name: 'liquid' }) !== 'LIQUID') {
  throw new Error('Liquid subpath failed')
}
if (await twig.render('{{ enabled ? "yes" : "no" }}', { enabled: true }) !== 'yes') {
  throw new Error('Twig subpath failed')
}

for (const [name, module] of Object.entries({
  root,
  ai,
  debug,
  hono,
  elysia,
  engines,
  handlebars,
  liquid,
  twig,
})) {
  if (Object.keys(module).length === 0) throw new Error(\`Empty public export: \${name}\`)
}
`
  )
  await run(['bun', smokeFile], consumer)

  const executable = join(
    consumer,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'binja.cmd' : 'binja'
  )
  const versionOutput = await run([executable, '--version'], consumer)
  if (versionOutput !== `${manifest.name} v${manifest.version}`) {
    throw new Error(`Unexpected CLI version: ${versionOutput}`)
  }

  console.log(`Package smoke test passed for ${manifest.name}@${manifest.version}`)
} finally {
  await rm(workspace, { force: true, recursive: true })
}

async function run(command: string[], cwd: string): Promise<string> {
  const process = Bun.spawn(command, {
    cwd,
    env: { ...Bun.env, HUSKY: '0' },
    stderr: 'pipe',
    stdout: 'pipe',
  })
  const [exitCode, stderr, stdout] = await Promise.all([
    process.exited,
    new Response(process.stderr).text(),
    new Response(process.stdout).text(),
  ])

  if (exitCode !== 0) {
    throw new Error(
      [`Command failed (${exitCode}): ${command.join(' ')}`, stdout, stderr]
        .filter(Boolean)
        .join('\n')
    )
  }

  return stdout.trim()
}

function parsePackedPackages(output: string): PackedPackage[] {
  const end = output.lastIndexOf(']')
  if (end < 0) throw new Error(`npm pack did not emit JSON:\n${output}`)

  for (
    let start = output.indexOf('[');
    start >= 0 && start < end;
    start = output.indexOf('[', start + 1)
  ) {
    try {
      const value = JSON.parse(output.slice(start, end + 1))
      if (Array.isArray(value)) return value as PackedPackage[]
    } catch {
      // Lifecycle scripts can write to stdout before npm's JSON payload.
    }
  }

  throw new Error(`Unable to parse npm pack JSON:\n${output}`)
}
