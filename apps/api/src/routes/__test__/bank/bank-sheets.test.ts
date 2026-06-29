import { db } from "@teacher-exam/db"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain, makeExamRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const NOW = "2024-01-01T00:00:00.000Z"

function buildTestApp() {
  return buildHttpApiTestApp({ userId: "test-user-id" })
}

function makeBankedExamRow(overrides: Record<string, unknown> = {}) {
  return makeExamRow({
    status: "final",
    isPublic: true,
    bankedAt: new Date(NOW),
    ...overrides
  })
}

describe("GET /api/bank/sheets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns paginated bank sheets for the current user", async () => {
    const examRow = makeBankedExamRow()

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ count: 1 }])
      if (selectCount === 2) return makeChain([{ exam: examRow }])
      return makeChain([{ examId: examRow.id, questionCount: 18 }])
    })

    const app = buildTestApp()
    const res = await app.request("/api/bank/sheets")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["total"]).toBe(1)
    const data = body["data"] as Array<Record<string, unknown>>
    expect(data[0]?.["questionCount"]).toBe(18)
    expect(data[0]?.["status"]).toBe("final")
  })
})

describe("GET /api/bank/sheets/public", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns public bank sheets without auth", async () => {
    const examRow = makeBankedExamRow({ userId: "other-user" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ count: 1 }])
      if (selectCount === 2) {
        return makeChain([{ exam: examRow, authorName: "Guru Lain" }])
      }
      return makeChain([{ examId: examRow.id, questionCount: 20 }])
    })

    const app = buildHttpApiTestApp()
    const res = await app.request("/api/bank/sheets/public")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    const data = body["data"] as Array<Record<string, unknown>>
    expect(data[0]?.["authorName"]).toBe("Guru Lain")
  })
})

describe("POST /api/bank/use-sheet", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a draft exam from a public bank sheet", async () => {
    const sourceExam = makeBankedExamRow({ userId: "other-user", id: "source-exam" })
    const sourceQuestion = {
      id: "q-1",
      examId: "source-exam",
      number: 1,
      text: "Soal bank",
      type: "mcq_single",
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      correctAnswer: "a",
      payload: null,
      topic: "Topik",
      difficulty: "sedang",
      status: "accepted",
      validationStatus: null,
      validationReason: null,
      createdAt: new Date(NOW)
    }

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([sourceExam])
      return makeChain([sourceQuestion])
    })
    ;(db.insert as Mock).mockImplementation(() => makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/bank/use-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceExamId: "source-exam" })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["examId"]).toBeTruthy()
    expect(db.insert).toHaveBeenCalledTimes(2)
  })
})
