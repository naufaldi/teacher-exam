import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

function portsFromEnvFile() {
  const envPath = resolve(root, '.env')
  const ports = new Set([3000, 5173, 5174])
  if (!existsSync(envPath)) return [...ports]

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('API_PORT=')) {
      const value = Number(trimmed.slice('API_PORT='.length))
      if (Number.isFinite(value)) ports.add(value)
    }
    if (trimmed.startsWith('WEB_PORT=')) {
      const value = Number(trimmed.slice('WEB_PORT='.length))
      if (Number.isFinite(value)) ports.add(value)
    }
  }

  return [...ports]
}

function killPort(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim()
    if (!pids) return false
    execSync(`kill -9 ${pids.replace(/\n/g, ' ')}`, { stdio: 'ignore' })
    console.log(`Freed port ${port} (pids: ${pids.replace(/\n/g, ', ')})`)
    return true
  } catch {
    return false
  }
}

let freed = 0
for (const port of portsFromEnvFile()) {
  if (killPort(port)) freed += 1
}

console.log(
  freed > 0
    ? 'Dev ports cleared. Starting API + Web…'
    : 'Starting API ( :3000 ) + Web ( :5173 )…',
)
