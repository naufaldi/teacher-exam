import { afterEach, describe, expect, it, vi } from 'vitest'
import { logError, logInfo, logWarn } from '../server-log'

describe('server-log', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('emits single-line JSON in production with service, level, msg, time, extra', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logError('request_failed', { method: 'GET', code: 'X' })
    expect(spy).toHaveBeenCalledTimes(1)
    const line = spy.mock.calls[0]?.[0]
    expect(typeof line).toBe('string')
    const obj = JSON.parse(line as string) as Record<string, unknown>
    expect(obj).toMatchObject({
      service: 'teacher-exam-api',
      level: 'error',
      msg: 'request_failed',
      extra: { method: 'GET', code: 'X' },
    })
    expect(typeof obj['time']).toBe('string')
  })

  it('emits human-readable line when not production (info)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logInfo('listening', { port: 3001 })
    expect(spy).toHaveBeenCalledTimes(1)
    const line = spy.mock.calls[0]?.[0] as string
    expect(line).toMatch(/^\[teacher-exam-api\] INFO /)
    expect(line).toContain('listening')
    expect(line).toContain('"port":3001')
  })

  it('emits human-readable line when not production (warn)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logWarn('slow_query', { ms: 1200 })
    expect(spy).toHaveBeenCalledTimes(1)
    const line = spy.mock.calls[0]?.[0] as string
    expect(line).toMatch(/^\[teacher-exam-api\] WARN /)
    expect(line).toContain('slow_query')
  })
})
