import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

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

const { requireAuth } = await import('../auth')

function makeApp() {
  const app = new Hono()
  app.use('*', requireAuth)
  app.get('/protected', (c) => c.json({ userId: c.get('userId') }))
  return app
}

describe('requireAuth middleware', () => {
  it('returns 401 with JSON error when no session is present', async () => {
    const app = makeApp()
    const res = await app.request('/protected')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('attaches userId on the context for authenticated requests', async () => {
    const app = makeApp()
    const res = await app.request('/protected', {
      headers: { 'x-test-user': 'user_42' },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ userId: 'user_42' })
  })
})
