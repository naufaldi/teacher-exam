import { describe, expect, it } from "vitest"

import { buildHttpApiTestApp } from "../../../routes/__test__/http-api-setup"

describe("AI generate window on regenerate", () => {
  it("returns the rate-limit error once regenerate is past the window", async () => {
    const app = buildHttpApiTestApp({
      userId: "guru-1",
      aiRateLimit: {
        windows: [{ windowMs: 60_000, max: 1 }],
        now: () => 1_000_000
      }
    })

    const first = await app.request("/api/questions/q-1/regenerate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    })
    const second = await app.request("/api/questions/q-1/regenerate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    })

    expect(first.status).not.toBe(429)
    expect(second.status).toBe(429)
    const body = (await second.json()) as { code: string; error: string }
    expect(body).toEqual({
      _tag: "ApiRateLimited",
      code: "RATE_LIMITED",
      error: "Terlalu banyak permintaan. Silakan coba lagi sebentar.",
      retryAfterSec: 60
    })
  })

  it("counts pembahasan against the same window as regenerate", async () => {
    const app = buildHttpApiTestApp({
      userId: "guru-1",
      aiRateLimit: {
        windows: [{ windowMs: 60_000, max: 1 }],
        now: () => 1_000_000
      }
    })

    const regen = await app.request("/api/questions/q-1/regenerate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    })
    const discussion = await app.request("/api/exams/exam-1/discussion", { method: "POST" })

    expect(regen.status).not.toBe(429)
    expect(discussion.status).toBe(429)
    const body = (await discussion.json()) as { code: string; retryAfterSec: number }
    expect(body.code).toBe("RATE_LIMITED")
    expect(body.retryAfterSec).toBe(60)
  })
})

describe("public bank windows per client IP", () => {
  it("keeps a second cf-connecting-ip on its own window", async () => {
    const app = buildHttpApiTestApp({
      publicBankRateLimit: { windows: [{ windowMs: 60_000, max: 1 }] }
    })

    const firstA = await app.request("/api/bank/sheets/public", {
      headers: { "cf-connecting-ip": "203.0.113.10" }
    })
    const secondA = await app.request("/api/bank/sheets/public", {
      headers: { "cf-connecting-ip": "203.0.113.10" }
    })
    const firstB = await app.request("/api/bank/sheets/public", {
      headers: { "cf-connecting-ip": "203.0.113.11" }
    })

    expect(firstA.status).not.toBe(429)
    expect(secondA.status).toBe(429)
    const blocked = (await secondA.json()) as { code: string }
    expect(blocked.code).toBe("RATE_LIMITED")
    expect(firstB.status).not.toBe(429)
  })
})
