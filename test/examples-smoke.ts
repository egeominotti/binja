import { resolve } from 'node:path'

const repositoryRoot = resolve(import.meta.dir, '..')
const examples = [
  'examples/01-basic-usage.ts',
  'examples/02-template-inheritance.ts',
  'examples/03-filters-advanced.ts',
  'examples/04-test-functions.ts',
  'examples/05-loops-advanced.ts',
  'examples/06-ecommerce-template.ts',
  'examples/07-complete-reference.ts',
  'examples/08-aot-usage.ts',
  'examples/09-multi-engine.ts',
]

for (const example of examples) {
  const child = Bun.spawn([process.execPath, resolve(repositoryRoot, example)], {
    cwd: repositoryRoot,
    env: Bun.env,
    stderr: 'pipe',
    stdout: 'ignore',
  })
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()])

  if (exitCode !== 0) {
    throw new Error(`${example} failed (${exitCode})\n${stderr}`)
  }
}

console.log(`Example smoke test passed for ${examples.length} executable examples`)

const serverExamples = [
  {
    example: 'examples/10-hono-app.ts',
    port: 31_300,
    routes: ['/', '/users', '/users/1', '/products', '/about', '/api/users'],
  },
  {
    example: 'examples/11-elysia-app.ts',
    port: 31_301,
    routes: [
      '/',
      '/blog',
      '/blog/1',
      '/categories',
      '/categories/tutorials',
      '/about',
      '/search?q=binja',
      '/api/posts',
    ],
  },
]

for (const { example, port, routes } of serverExamples) {
  const child = Bun.spawn([process.execPath, resolve(repositoryRoot, example)], {
    cwd: repositoryRoot,
    env: { ...Bun.env, BINJA_EXAMPLE_PORT: String(port) },
    stderr: 'pipe',
    stdout: 'ignore',
  })

  try {
    await waitForServer(port, child)
    for (const route of routes) {
      const response = await fetch(`http://127.0.0.1:${port}${route}`)
      if (!response.ok) {
        throw new Error(`${example} returned HTTP ${response.status} for ${route}`)
      }
      await response.arrayBuffer()
    }
  } finally {
    child.kill()
    await child.exited
  }
}

console.log(`Server smoke test passed for ${serverExamples.length} framework examples`)

async function waitForServer(
  port: number,
  child: Bun.Subprocess<any, 'ignore', 'pipe'>
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) {
      const stderr = await new Response(child.stderr).text()
      throw new Error(`Server example exited before startup (${child.exitCode})\n${stderr}`)
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`)
      await response.arrayBuffer()
      return
    } catch {
      await Bun.sleep(25)
    }
  }

  throw new Error(`Server example did not listen on port ${port}`)
}
