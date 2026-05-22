import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(async ({ headers }: { headers: Headers }) => {
        const userId = headers.get('x-test-user')
        return userId ? { user: { id: userId } } : null
      }),
    },
  },
}))

import { db } from '@teacher-exam/db'
import { buildHttpApiTestApp } from '../../../routes/__test__/http-api-setup'
import { makeChain } from '../../../routes/__test__/helpers'

describe('Authorization HttpApi middleware', () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReturnValue(makeChain([]))
  })

  it('returns 401 with JSON error when no session is present', async () => {
    const app = buildHttpApiTestApp({ authenticated: false })
    const res = await app.request('/api/me')
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('allows authenticated requests through to handlers', async () => {
    const app = buildHttpApiTestApp({ userId: 'user_42' })
    const res = await app.request('/api/me')
    expect(res.status).toBe(404)
  })
})
