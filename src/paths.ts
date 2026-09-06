import { resolve, sep } from 'node:path'

/** Check a name without I/O. File loads must additionally resolve symlinks. */
export function resolveContainedLexically(root: string, name: string): string | null {
  const normalizedRoot = resolve(root)
  const candidate = resolve(normalizedRoot, name)
  return candidate === normalizedRoot || candidate.startsWith(normalizedRoot + sep)
    ? candidate
    : null
}
