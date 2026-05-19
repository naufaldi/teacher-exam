import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DevAuthForbiddenError,
  assertDevAuthAllowed,
  getDevCredentials,
  isDevAuthEnabled,
  isLocalhostHost,
} from '../dev-auth'

describe('isDevAuthEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false when DEV_AUTH_ENABLED is unset', () => {
    vi.stubEnv('DEV_AUTH_ENABLED', '')
    vi.stubEnv('NODE_ENV', 'development')
    expect(isDevAuthEnabled()).toBe(false)
  })

  it('returns false in production even when flag is set', () => {
    vi.stubEnv('DEV_AUTH_ENABLED', 'true')
    vi.stubEnv('NODE_ENV', 'production')
    expect(isDevAuthEnabled()).toBe(false)
  })

  it('returns true when enabled in non-production', () => {
    vi.stubEnv('DEV_AUTH_ENABLED', 'true')
    vi.stubEnv('NODE_ENV', 'development')
    expect(isDevAuthEnabled()).toBe(true)
  })
})

describe('isLocalhostHost', () => {
  it('accepts localhost with port', () => {
    expect(isLocalhostHost('localhost:3001')).toBe(true)
    expect(isLocalhostHost('localhost:5173')).toBe(true)
  })

  it('accepts 127.0.0.1 with port', () => {
    expect(isLocalhostHost('127.0.0.1:3001')).toBe(true)
  })

  it('rejects production hostnames', () => {
    expect(isLocalhostHost('ujian-sekolah.faldi.xyz')).toBe(false)
    expect(isLocalhostHost('api-ujian-sekolah.faldi.xyz')).toBe(false)
  })
})

describe('assertDevAuthAllowed', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws DevAuthForbiddenError when dev auth is disabled', () => {
    vi.stubEnv('DEV_AUTH_ENABLED', '')
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => assertDevAuthAllowed('localhost:3001')).toThrow(DevAuthForbiddenError)
  })

  it('throws DevAuthForbiddenError for non-local host', () => {
    vi.stubEnv('DEV_AUTH_ENABLED', 'true')
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => assertDevAuthAllowed('evil.example.com')).toThrow(DevAuthForbiddenError)
  })

  it('does not throw when enabled and host is local', () => {
    vi.stubEnv('DEV_AUTH_ENABLED', 'true')
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => assertDevAuthAllowed('localhost:3001')).not.toThrow()
  })
})

describe('getDevCredentials', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads email and password from env', () => {
    vi.stubEnv('DEV_AUTH_EMAIL', 'dev@guru.local')
    vi.stubEnv('DEV_AUTH_PASSWORD', 'secret')
    expect(getDevCredentials()).toEqual({
      email: 'dev@guru.local',
      password: 'secret',
    })
  })

  it('throws when credentials are missing', () => {
    vi.stubEnv('DEV_AUTH_EMAIL', '')
    vi.stubEnv('DEV_AUTH_PASSWORD', '')
    expect(() => getDevCredentials()).toThrow('DEV_AUTH_EMAIL')
  })
})
