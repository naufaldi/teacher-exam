import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { createRateLimiter } from '../rate-limit'

function makeApp(opts: {
  windows: ReadonlyArray<{ windowMs: number; max: number }>
  userId?: string
  now: () => number
}) {
  const limiter = createRateLimiter(opts.windows, { now: opts.now })
  const app = new Hono()
  app.use('*', async (c, next) => {
    if (opts.userId) c.set('userId', opts.userId)
    await next()
  })
  app.use('*', limiter)
  app.get('/ping', (c) => c.json({ ok: true }))
  return { app, limiter }
}

describe('rate-limit middleware', () => {
  it('allows requests under the limit', async () => {
    let now = 0
    const { app } = makeApp({
      windows: [{ windowMs: 60_000, max: 3 }],
      userId: 'u1',
      now: () => now,
    })

    for (let i = 0; i < 3; i++) {
      const res = await app.request('/ping')
      expect(res.status).toBe(200)
    }
  })

  it('returns 429 when the limit is exceeded and resets after the window', async () => {
    let now = 1_000_000
    const { app } = makeApp({
      windows: [{ windowMs: 60_000, max: 3 }],
      userId: 'u1',
      now: () => now,
    })

    for (let i = 0; i < 3; i++) await app.request('/ping')
    const blocked = await app.request('/ping')
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).not.toBeNull()
    const body = (await blocked.json()) as { code: string; retryAfterSec: number }
    expect(body.code).toBe('RATE_LIMITED')
    expect(body.retryAfterSec).toBeGreaterThan(0)

    now += 61_000
    const allowed = await app.request('/ping')
    expect(allowed.status).toBe(200)
  })

  it('keeps separate buckets per userId', async () => {
    let now = 0
    const limiter = createRateLimiter(
      [{ windowMs: 60_000, max: 1 }],
      { now: () => now },
    )
    const app = new Hono()
    app.use('*', async (c, next) => {
      const u = c.req.header('x-user') ?? ''
      if (u) c.set('userId', u)
      await next()
    })
    app.use('*', limiter)
    app.get('/ping', (c) => c.json({ ok: true }))

    expect((await app.request('/ping', { headers: { 'x-user': 'a' } })).status).toBe(200)
    expect((await app.request('/ping', { headers: { 'x-user': 'b' } })).status).toBe(200)
    expect((await app.request('/ping', { headers: { 'x-user': 'a' } })).status).toBe(429)
    expect((await app.request('/ping', { headers: { 'x-user': 'b' } })).status).toBe(429)
  })

  it('returns 401 when no userId is set', async () => {
    let now = 0
    const { app } = makeApp({
      windows: [{ windowMs: 60_000, max: 5 }],
      now: () => now,
    })
    const res = await app.request('/ping')
    expect(res.status).toBe(401)
  })

  it('enforces multiple windows simultaneously (per-minute and per-day)', async () => {
    let now = 0
    const { app } = makeApp({
      windows: [
        { windowMs: 60_000, max: 5 },
        { windowMs: 24 * 60 * 60_000, max: 7 },
      ],
      userId: 'ai-user',
      now: () => now,
    })

    for (let i = 0; i < 5; i++) {
      const res = await app.request('/ping')
      expect(res.status).toBe(200)
    }
    expect((await app.request('/ping')).status).toBe(429)

    now += 61_000
    for (let i = 0; i < 2; i++) {
      const res = await app.request('/ping')
      expect(res.status).toBe(200)
    }

    now += 61_000
    const dailyBlocked = await app.request('/ping')
    expect(dailyBlocked.status).toBe(429)

    now += 24 * 60 * 60_000
    expect((await app.request('/ping')).status).toBe(200)
  })
})
