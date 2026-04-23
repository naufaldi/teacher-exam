import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => null),
    },
  },
}))

vi.mock('@teacher-exam/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
  },
  user: {},
}))

const { requireAuth } = await import('../middleware/auth')
const { meRouter } = await import('../routes/me')
const { createAiRouter } = await import('../routes/ai')
const { healthRouter } = await import('../routes/health')

function buildApp() {
  const app = new Hono()
  app.route('/api/health', healthRouter)
  app.use('/api/*', requireAuth)
  app.route('/api/me', meRouter)
  app.route('/api/ai', createAiRouter())
  return app
}

describe('auth protection on protected API routes', () => {
  it('GET /api/health is reachable without a session', async () => {
    const app = buildApp()
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
  })

  it('GET /api/me returns 401 without a session', async () => {
    const app = buildApp()
    const res = await app.request('/api/me')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('POST /api/ai/generate returns 401 without a session and never invokes the AI service', async () => {
    const app = buildApp()
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'bahasa_indonesia',
        grade: 5,
        difficulty: 'sedang',
      }),
    })
    expect(res.status).toBe(401)
  })
})
