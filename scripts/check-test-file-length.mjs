#!/usr/bin/env node
/**
 * Warn when route integration test files exceed ~500 LOC.
 * Excludes harness/setup/helpers/fixtures files.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const MAX_LINES = 500
const TEST_GLOB = /\.test\.(ts|tsx)$/
const EXCLUDE = /(?:^|\/)(setup|fixtures|helpers)(?:\.[^/]+)?$|[-]setup\.(ts|tsx)$/

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      await walk(path, out)
      continue
    }
    if (!path.includes('__test__')) continue
    if (!TEST_GLOB.test(entry.name)) continue
    if (EXCLUDE.test(path)) continue
    out.push(path)
  }
  return out
}

const targets = []
for (const pkg of ['apps/web', 'apps/api', 'packages/shared', 'packages/ui']) {
  const src = join(ROOT, pkg, 'src')
  try {
    await stat(src)
    await walk(src, targets)
  } catch {
    // package may not exist
  }
}

const offenders = []
for (const file of targets) {
  const content = await readFile(file, 'utf8')
  const lines = content.split('\n').length
  if (lines > MAX_LINES) {
    offenders.push({ file: relative(ROOT, file), lines })
  }
}

if (offenders.length > 0) {
  console.error(`Test files over ${MAX_LINES} lines:`)
  for (const { file, lines } of offenders.sort((a, b) => b.lines - a.lines)) {
    console.error(`  ${lines}\t${file}`)
  }
  process.exit(1)
}

console.log(`OK: no test files over ${MAX_LINES} lines (${targets.length} checked)`)
