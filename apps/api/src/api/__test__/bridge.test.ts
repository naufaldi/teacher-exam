import { HttpApi, HttpApiBuilder, HttpServer } from '@effect/platform'
import { Layer } from 'effect'
import { describe, expect, it } from 'vitest'
import { HealthGroup } from '../groups/health'
import { HealthLive } from '../handlers/health'
import { createCorsLayer } from '../cors'
import { isAuthPath, isHttpApiPath } from '../bridge/migrated-routes'

const TestApi = HttpApi.make('TestApi').add(HealthGroup).prefix('/api')

describe('HttpApi bridge routing', () => {
  it('treats /api/auth/* as auth paths', () => {
    expect(isAuthPath('/api/auth/sign-in/social')).toBe(true)
    expect(isHttpApiPath('/api/auth/session')).toBe(false)
  })

  it('treats migrated /api/* paths as HttpApi paths', () => {
    expect(isHttpApiPath('/api/health')).toBe(true)
    expect(isHttpApiPath('/api/me')).toBe(true)
    expect(isHttpApiPath('/api/exams')).toBe(true)
  })

  it('does not treat non-api paths as HttpApi paths', () => {
    expect(isHttpApiPath('/health')).toBe(false)
  })
})

describe('HttpApi health handler', () => {
  it('GET /api/health returns ok payload', async () => {
    const ApiLive = HttpApiBuilder.api(TestApi).pipe(Layer.provide(HealthLive))
    const layer = Layer.mergeAll(ApiLive, createCorsLayer(), HttpServer.layerContext)
    const { handler, dispose } = HttpApiBuilder.toWebHandler(layer)

    const res = await handler(new Request('http://localhost/api/health'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body['status']).toBe('ok')
    expect(body['service']).toBe('teacher-exam-api')
    expect(typeof body['timestamp']).toBe('string')

    await dispose()
  })
})
