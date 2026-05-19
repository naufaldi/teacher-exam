export class DevAuthForbiddenError extends Error {
  override readonly name = 'DevAuthForbiddenError'
}

export function isDevAuthEnabled(): boolean {
  if (process.env['NODE_ENV'] === 'production') {
    return false
  }
  return process.env['DEV_AUTH_ENABLED'] === 'true'
}

export function isLocalhostHost(host: string): boolean {
  const hostname = host.split(':')[0]?.toLowerCase() ?? ''
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

export function assertDevAuthAllowed(host: string): void {
  if (!isDevAuthEnabled() || !isLocalhostHost(host)) {
    throw new DevAuthForbiddenError('Dev auth is not allowed')
  }
}

export function getDevCredentials(): { email: string; password: string } {
  const email = process.env['DEV_AUTH_EMAIL']
  const password = process.env['DEV_AUTH_PASSWORD']
  if (email === undefined || email === '') {
    throw new Error('DEV_AUTH_EMAIL is required when DEV_AUTH_ENABLED=true')
  }
  if (password === undefined || password === '') {
    throw new Error('DEV_AUTH_PASSWORD is required when DEV_AUTH_ENABLED=true')
  }
  return { email, password }
}

export function assertDevAuthNotEnabledInProduction(): void {
  if (process.env['NODE_ENV'] === 'production' && process.env['DEV_AUTH_ENABLED'] === 'true') {
    throw new Error('DEV_AUTH_ENABLED must not be set in production')
  }
}
