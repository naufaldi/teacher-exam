import { db } from "@teacher-exam/db"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const NOW = "2024-01-01T00:00:00.000Z"

function makePublicBankRow(overrides: Record<string, unknown> = {}) {
  return {
    bank: {
      id: "bank-public-1",
      userId: "other-user",
      questionId: "q-1",
      subject: "ipas",
      grade: 5,
      topics: ["Energi"],
      difficulty: "sedang",
      type: "mcq_single",
      payload: { source: "ai" },
      isPublic: true,
      usageCount: 3,
      createdAt: new Date(NOW),
      ...overrides
    },
    authorName: "Guru Publik"
  }
}

describe("GET /api/bank/public", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 200 for anonymous requests", async () => {
    const row = makePublicBankRow()
    const questionRow = makeQuestionRow({ id: "q-1", text: "Soal publik" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ count: 1 }])
      if (selectCount === 2) return makeChain([row])
      return makeChain([questionRow])
    })

    const app = buildHttpApiTestApp({ authenticated: false })
    const res = await app.request("/api/bank/public")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    const data = body["data"] as Array<Record<string, unknown>>
    expect(data[0]?.["authorName"]).toBe("Guru Publik")
    expect(data[0]?.["text"]).toBe("Soal publik")
    expect(data[0]?.["userId"]).toBeUndefined()
  })

  it("authenticated user can see their own public soal in the public bank (regression for empty state bug)", async () => {
    const row = makePublicBankRow({ userId: "test-user-id" })
    const questionRow = makeQuestionRow({ id: "q-1", text: "Soal saya yang dipublikasikan" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ count: 1 }])
      if (selectCount === 2) return makeChain([row])
      return makeChain([questionRow])
    })

    const app = buildHttpApiTestApp({ userId: "test-user-id" })
    const res = await app.request("/api/bank/public")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    const data = body["data"] as Array<Record<string, unknown>>
    expect(data).toHaveLength(1)
    expect(data[0]?.["text"]).toBe("Soal saya yang dipublikasikan")
  })

  it("returns 429 after rate limit exceeded", async () => {
    let t = 0
    const app = buildHttpApiTestApp({
      authenticated: false,
      publicBankRateLimit: {
        windows: [{ windowMs: 60_000, max: 2 }],
        now: () => {
          t += 1
          return t
        }
      }
    })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount % 2 === 1) return makeChain([{ count: 0 }])
      return makeChain([])
    })

    expect((await app.request("/api/bank/public")).status).toBe(200)
    expect((await app.request("/api/bank/public")).status).toBe(200)
    const limited = await app.request("/api/bank/public")
    expect(limited.status).toBe(429)
  })

  it("does not let rotated forwarding headers bypass the anonymous rate limit", async () => {
    let t = 0
    const app = buildHttpApiTestApp({
      authenticated: false,
      publicBankRateLimit: {
        windows: [{ windowMs: 60_000, max: 2 }],
        now: () => {
          t += 1
          return t
        }
      }
    })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount % 2 === 1) return makeChain([{ count: 0 }])
      return makeChain([])
    })

    const makeHeaders = (ip: string) => ({
      "x-forwarded-for": ip,
      "x-real-ip": ip
    })

    expect((await app.request("/api/bank/public", { headers: makeHeaders("203.0.113.10") })).status).toBe(200)
    expect((await app.request("/api/bank/public", { headers: makeHeaders("203.0.113.11") })).status).toBe(200)
    const limited = await app.request("/api/bank/public", { headers: makeHeaders("203.0.113.12") })
    expect(limited.status).toBe(429)
  })
})
