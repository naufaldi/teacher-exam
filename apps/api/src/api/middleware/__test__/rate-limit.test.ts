import { describe, expect, it, vi } from "vitest"

import { buildHttpApiTestApp } from "../../../routes/__test__/http-api-setup"

const getSessionMock = vi.fn(async () => ({ user: { id: "u1" } }))

vi.mock("../../../lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: Array<unknown>) => getSessionMock(...args)
    }
  }
}))

describe("rate-limit HttpApi middleware", () => {
  it("allows requests under the limit", async () => {
    const now = 0
    const app = buildHttpApiTestApp({
      userId: "u1",
      rateLimit: { windows: [{ windowMs: 60_000, max: 3 }], now: () => now }
    })

    for (let i = 0; i < 3; i++) {
      const res = await app.request("/api/me")
      expect(res.status).not.toBe(429)
    }
  })

  it("returns 429 when the limit is exceeded and resets after the window", async () => {
    let now = 1_000_000
    const app = buildHttpApiTestApp({
      userId: "u1",
      rateLimit: { windows: [{ windowMs: 60_000, max: 3 }], now: () => now }
    })

    for (let i = 0; i < 3; i++) await app.request("/api/me")
    const blocked = await app.request("/api/me")
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("Retry-After")).not.toBeNull()
    const body = (await blocked.json()) as { code: string; retryAfterSec: number }
    expect(body.code).toBe("RATE_LIMITED")
    expect(body.retryAfterSec).toBeGreaterThan(0)

    now += 60_001
    const afterWindow = await app.request("/api/me")
    expect(afterWindow.status).not.toBe(429)
  })

  it("returns 401 without authenticated user before rate limiting", async () => {
    getSessionMock.mockImplementation(async () => null)

    const app = buildHttpApiTestApp({
      authenticated: false,
      rateLimit: { windows: [{ windowMs: 60_000, max: 1 }], now: () => 0 }
    })
    const res = await app.request("/api/me")
    expect(res.status).toBe(401)
  })
})
