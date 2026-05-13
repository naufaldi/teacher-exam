type OriginEnv = {
  APP_URL?: string | undefined
  API_PORT?: string | undefined
  BETTER_AUTH_URL?: string | undefined
  AUTH_TRUSTED_ORIGINS?: string | undefined
  WEB_PORT?: string | undefined
}

const DEFAULT_APP_URL = 'http://localhost:5173'
const DEFAULT_VITE_DEV_ORIGIN = 'http://localhost:5173'
const DEFAULT_API_PORT = 3000

export function resolveApiPort(env: OriginEnv = process.env): number {
  const rawPort = env.API_PORT?.trim()
  const port = rawPort ? parsePort(rawPort) : DEFAULT_API_PORT

  const rawWebPort = env.WEB_PORT?.trim()
  if (rawWebPort && port === parsePort(rawWebPort)) {
    throw new Error('API_PORT must not equal WEB_PORT')
  }

  return port
}

export function resolveTrustedOrigins(env: OriginEnv = process.env): string[] {
  const appUrl = env.APP_URL?.trim() || DEFAULT_APP_URL
  const origins = [appUrl]

  if (isLocalhostOrigin(appUrl)) {
    origins.push(DEFAULT_APP_URL, DEFAULT_VITE_DEV_ORIGIN)
    if (env.WEB_PORT?.trim()) {
      origins.push(`http://localhost:${env.WEB_PORT.trim()}`)
    }
  }

  origins.push(...parseOriginList(env.AUTH_TRUSTED_ORIGINS))
  return Array.from(new Set(origins))
}

export function resolveAllowedCorsOrigins(env: OriginEnv = process.env): string[] {
  return resolveTrustedOrigins(env)
}

export function resolveAuthBaseURL(env: OriginEnv = process.env): string {
  const explicitBaseURL = env.BETTER_AUTH_URL?.trim()
  if (explicitBaseURL) return explicitBaseURL

  const appUrl = env.APP_URL?.trim() || DEFAULT_APP_URL
  if (isLocalhostOrigin(appUrl)) {
    return `http://localhost:${resolveApiPort(env)}`
  }

  return appUrl
}

function parseOriginList(value: string | undefined): string[] {
  return value
    ?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0) ?? []
}

function isLocalhostOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function parsePort(value: string): number {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_API_PORT
}
