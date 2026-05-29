import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"

import { db } from "@teacher-exam/db"
import { makeChain, makeQuestionRow } from "./helpers"
import { buildHttpApiTestApp } from "./http-api-setup"

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ op: "eq", col, val })),
  and: vi.fn((...args) => ({ op: "and", args }))
}))

function buildTestApp() {
  return buildHttpApiTestApp({ userId: "test-user-id" })
}

describe("PATCH /api/questions/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 on invalid JSON", async () => {
    const app = buildTestApp()
    const res = await app.request("/api/questions/q-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json"
    })
    expect(res.status).toBe(400)
  })

  it("returns 422 on invalid body (bad status value)", async () => {
    const app = buildTestApp()
    const res = await app.request("/api/questions/q-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "bogus-value" })
    })
    expect(res.status).toBe(422)
  })

  it("returns 422 when body has no recognized fields", async () => {
    const app = buildTestApp()
    const res = await app.request("/api/questions/q-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    })
    expect(res.status).toBe(422)
  })

  it("returns 404 when question not found or belongs to another user", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([])) // ownership JOIN returns nothing
    const app = buildTestApp()
    const res = await app.request("/api/questions/q-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted" })
    })
    expect(res.status).toBe(404)
  })

  it("returns 200 with updated question on success", async () => {
    const questionRow = makeQuestionRow({ status: "accepted" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ questionId: "q-1", examUserId: "test-user-id" }]) // ownership
      return makeChain([questionRow]) // re-fetch after update
    })

    const updateChain = makeChain([questionRow])
    ;(db.update as Mock).mockReturnValue(updateChain)

    const app = buildTestApp()
    const res = await app.request("/api/questions/q-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted" })
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body["id"]).toBe("q-1")
    expect(body["status"]).toBe("accepted")
  })
})
