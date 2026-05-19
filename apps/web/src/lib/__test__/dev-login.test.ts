import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDevLoginEnabled } from '../dev-login.js'

describe('isDevLoginEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true when DEV and VITE_DEV_AUTH are set', () => {
    vi.stubEnv('VITE_DEV_AUTH', 'true')
    expect(isDevLoginEnabled()).toBe(import.meta.env.DEV)
  })

  it('returns false when VITE_DEV_AUTH is unset', () => {
    vi.stubEnv('VITE_DEV_AUTH', '')
    expect(isDevLoginEnabled()).toBe(false)
  })
})
