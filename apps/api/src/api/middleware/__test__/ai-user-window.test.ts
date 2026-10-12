import { beforeEach, describe, expect, it, vi } from "vitest"

import { buildHttpApiTestApp } from "../../../routes/__test__/http-api-setup"

vi.mock("../../../lib/auth", () => ({
  auth: {
    api: {
      getSession: async ({ headers }: { headers: { readonly [key: string]: string } }) => {
        const id = headers["x-test-user"]
        return id ? { user: { id } } : null
      }
    }
  }
}))

function regenerate(app: { request: (input: string, init: RequestInit) => Promise<Response> }, userId: string) {
  return app.request("/api/questions/q-1/regenerate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user": userId },
    body: JSON.stringify({})
  })
}

describe("per-user AI window", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not spend a second guru's daily cap when the first guru is limited", async () => {
    const app = buildHttpApiTestApp({
      userId: "guru-a",
      aiRateLimit: {
        windows: [{ windowMs: 86_400_000, max: 1 }],
        now: () => 1_000_000
      }
    })

    const first = await regenerate(app, "guru-a")
    const blocked = await regenerate(app, "guru-a")
    const other = await regenerate(app, "guru-b")

    expect(first.status).not.toBe(429)
    expect(blocked.status).toBe(429)
    const body = (await blocked.json()) as { code: string; retryAfterSec: number }
    expect(body).toEqual({
      _tag: "ApiRateLimited",
      code: "RATE_LIMITED",
      error: "Terlalu banyak permintaan. Silakan coba lagi sebentar.",
      retryAfterSec: 86_400
    })
    expect(other.status).not.toBe(429)
  })

  it("counts pembahasan against that guru's daily cap only", async () => {
    const app = buildHttpApiTestApp({
      userId: "guru-a",
      aiRateLimit: {
        windows: [{ windowMs: 86_400_000, max: 1 }],
        now: () => 1_000_000
      }
    })

    const regen = await regenerate(app, "guru-a")
    const discussion = await app.request("/api/exams/exam-1/discussion", {
      method: "POST",
      headers: { "x-test-user": "guru-a" }
    })
    const other = await app.request("/api/exams/exam-1/discussion", {
      method: "POST",
      headers: { "x-test-user": "guru-b" }
    })

    expect(regen.status).not.toBe(429)
    expect(discussion.status).toBe(429)
    expect(other.status).not.toBe(429)
  })
})
