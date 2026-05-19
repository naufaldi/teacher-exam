import { afterEach, describe, expect, it, vi } from 'vitest'
import { logAiEvent } from '../ai-log.js'

describe('logAiEvent', () => {
  const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  afterEach(() => {
    infoSpy.mockClear()
    warnSpy.mockClear()
    delete process.env['AI_LOG']
    delete process.env['DEV_AUTH_ENABLED']
    delete process.env['NODE_ENV']
  })

  it('emits info when AI_LOG=1', () => {
    process.env['AI_LOG'] = '1'
    logAiEvent('test.scope', 'info', { durationMs: 1 })
    expect(infoSpy).toHaveBeenCalledOnce()
  })

  it('emits info when DEV_AUTH_ENABLED=true', () => {
    process.env['DEV_AUTH_ENABLED'] = 'true'
    logAiEvent('test.scope', 'info', { durationMs: 1 })
    expect(infoSpy).toHaveBeenCalledOnce()
  })

  it('emits info when NODE_ENV=development', () => {
    process.env['NODE_ENV'] = 'development'
    logAiEvent('test.scope', 'info', { durationMs: 1 })
    expect(infoSpy).toHaveBeenCalledOnce()
  })

  it('skips info when no dev flags and AI_LOG unset', () => {
    logAiEvent('test.scope', 'info', { durationMs: 1 })
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it('always emits warn regardless of AI_LOG', () => {
    logAiEvent('test.scope', 'warn', { message: 'fail' })
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(infoSpy).not.toHaveBeenCalled()
  })
})
