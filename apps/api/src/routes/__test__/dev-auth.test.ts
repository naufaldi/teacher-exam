import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Hono } from 'hono'

vi.mock('../../lib/auth', () => ({
  auth: {
    api: {
      signInEmail: vi.fn(),
    },
  },
}))

import { auth } from '../../lib/auth'
import { devAuthRouter } from '../dev-auth'

function buildApp() {
  return new Hono().route('/api/dev', devAuthRouter)
}

describe('POST /api/dev/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns 403 when dev auth is disabled', async () => {
    vi.stubEnv('DEV_AUTH_ENABLED', '')
    vi.stubEnv('NODE_ENV', 'development')

    const app = buildApp()
    const res = await app.request('/api/dev/login', {
      method: 'POST',
      headers: { Host: 'localhost:3000' },
    })

    expect(res.status).toBe(403)
    expect(auth.api.signInEmail as Mock).not.toHaveBeenCalled()
  })

  it('returns 403 when host is not localhost', async () => {
    vi.stubEnv('DEV_AUTH_ENABLED', 'true')
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DEV_AUTH_EMAIL', 'dev@guru.local')
    vi.stubEnv('DEV_AUTH_PASSWORD', 'secret')

    const app = buildApp()
    const res = await app.request('/api/dev/login', {
      method: 'POST',
      headers: { Host: 'ujian-sekolah.faldi.xyz' },
    })

    expect(res.status).toBe(403)
    expect(auth.api.signInEmail as Mock).not.toHaveBeenCalled()
  })

  it('returns 200 and forwards Set-Cookie when dev auth is enabled', async () => {
    vi.stubEnv('DEV_AUTH_ENABLED', 'true')
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DEV_AUTH_EMAIL', 'dev@guru.local')
    vi.stubEnv('DEV_AUTH_PASSWORD', 'secret')

    const mockResponse = new Response(JSON.stringify({ user: { id: 'u1' } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'better-auth.session_token=abc; Path=/; HttpOnly',
      },
    })
    ;(auth.api.signInEmail as Mock).mockResolvedValueOnce(mockResponse)

    const app = buildApp()
    const res = await app.request('/api/dev/login', {
      method: 'POST',
      headers: { Host: 'localhost:3000' },
    })

    expect(res.status).toBe(200)
    expect(auth.api.signInEmail as Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { email: 'dev@guru.local', password: 'secret' },
        asResponse: true,
      }),
    )
    expect(res.headers.get('set-cookie')).toContain('better-auth.session_token')
  })

  it('returns 401 when sign-in fails', async () => {
    vi.stubEnv('DEV_AUTH_ENABLED', 'true')
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DEV_AUTH_EMAIL', 'dev@guru.local')
    vi.stubEnv('DEV_AUTH_PASSWORD', 'secret')

    ;(auth.api.signInEmail as Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 }),
    )

    const app = buildApp()
    const res = await app.request('/api/dev/login', {
      method: 'POST',
      headers: { Host: 'localhost:3000' },
    })

    expect(res.status).toBe(401)
  })
})
