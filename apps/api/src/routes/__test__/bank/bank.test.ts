import { db } from "@teacher-exam/db"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain, makeExamRow, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const NOW = "2024-01-01T00:00:00.000Z"

function buildTestApp() {
  return buildHttpApiTestApp({ userId: "test-user-id" })
}

function makeBankQuestionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "bank-1",
    userId: "test-user-id",
    questionId: "q-1",
    subject: "ipas",
    grade: 5,
    topics: ["Energi"],
    difficulty: "sedang",
    type: "mcq_single",
    payload: {},
    isPublic: false,
    usageCount: 0,
    createdAt: new Date(NOW),
    ...overrides
  }
}

describe("GET /api/bank", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns paginated bank questions for the current user", async () => {
    const bankRow = makeBankQuestionRow()
    const questionRow = makeQuestionRow({ id: "q-1", text: "Apa itu energi?" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ count: 1 }])
      if (selectCount === 2) return makeChain([bankRow])
      return makeChain([questionRow])
    })

    const app = buildTestApp()
    const res = await app.request("/api/bank")
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body["total"]).toBe(1)
    const data = body["data"] as Array<Record<string, unknown>>
    expect(data[0]?.["text"]).toBe("Apa itu energi?")
  })

  it("returns filtered items for combined query params", async () => {
    const bankRow = makeBankQuestionRow({
      subject: "ipas",
      grade: 5,
      difficulty: "sedang",
      type: "mcq_single"
    })
    const questionRow = makeQuestionRow({ id: "q-1", text: "Soal IPAS" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ count: 1 }])
      if (selectCount === 2) return makeChain([bankRow])
      return makeChain([questionRow])
    })

    const app = buildTestApp()
    const res = await app.request(
      "/api/bank?subject=ipas&grade=5&difficulty=sedang&type=mcq_single"
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["total"]).toBe(1)
    const data = body["data"] as Array<Record<string, unknown>>
    expect(data[0]?.["subject"]).toBe("ipas")
  })

  it("returns page 2 with correct pagination metadata", async () => {
    const bankRow = makeBankQuestionRow({ id: "bank-page2" })
    const questionRow = makeQuestionRow({ id: "q-page2", text: "Soal halaman 2" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ count: 25 }])
      if (selectCount === 2) return makeChain([bankRow])
      return makeChain([questionRow])
    })

    const app = buildTestApp()
    const res = await app.request("/api/bank?page=2&limit=10")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["total"]).toBe(25)
    expect(body["page"]).toBe(2)
    expect(body["limit"]).toBe(10)
    const data = body["data"] as Array<Record<string, unknown>>
    expect(data.length).toBeLessThanOrEqual(10)
  })

  it("sorts by popularity (terpopuler) with highest usage first", async () => {
    const popularRow = makeBankQuestionRow({ id: "bank-popular", usageCount: 10 })
    const lessPopularRow = makeBankQuestionRow({ id: "bank-less", usageCount: 2 })
    const questionPopular = makeQuestionRow({ id: "q-popular", text: "Soal populer" })
    const questionLess = makeQuestionRow({ id: "q-less", text: "Soal jarang" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ count: 2 }])
      if (selectCount === 2) return makeChain([popularRow, lessPopularRow])
      if (selectCount === 3) return makeChain([questionPopular])
      return makeChain([questionLess])
    })

    const app = buildTestApp()
    const res = await app.request("/api/bank?sort=terpopuler")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    const data = body["data"] as Array<Record<string, unknown>>
    expect(data[0]?.["usageCount"]).toBe(10)
    expect(data[1]?.["usageCount"]).toBe(2)
  })

  it("filters by search term matching question text", async () => {
    const bankRow = makeBankQuestionRow()
    const questionRow = makeQuestionRow({ id: "q-1", text: "Apa itu energi?" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ count: 1 }])
      if (selectCount === 2) return makeChain([bankRow])
      return makeChain([questionRow])
    })

    const app = buildTestApp()
    const res = await app.request("/api/bank?search=energi")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    const data = body["data"] as Array<Record<string, unknown>>
    expect(String(data[0]?.["text"]).toLowerCase()).toContain("energi")
  })
})

describe("POST /api/bank", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 404 when question is not owned by user", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: "missing-q" })
    })
    expect(res.status).toBe(404)
  })

  it("saves a question to bank and returns 201", async () => {
    const examRow = makeExamRow({ subject: "ipas", grade: 5 })
    const questionRow = makeQuestionRow({ id: "q-1", examId: "exam-1", text: "Soal bank" })
    const bankRow = makeBankQuestionRow()

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ ...questionRow, examId: examRow.id }])
      if (selectCount === 2) return makeChain([examRow])
      return makeChain([questionRow])
    })

    const insertChain = makeChain([bankRow])
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => insertChain)
        }))
      }))
    })

    const app = buildTestApp()
    const res = await app.request("/api/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: "q-1" })
    })
    expect(res.status).toBe(201)
    const body = await res.json() as Record<string, unknown>
    expect(body["text"]).toBe("Soal bank")
  })

  it("returns existing row when question is already saved (201 per API contract)", async () => {
    const examRow = makeExamRow({ subject: "ipas", grade: 5 })
    const questionRow = makeQuestionRow({ id: "q-1", examId: "exam-1", text: "Soal sudah ada" })
    const existingBankRow = makeBankQuestionRow({ id: "bank-existing" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ ...questionRow, examId: examRow.id }])
      if (selectCount === 2) return makeChain([examRow])
      return makeChain([existingBankRow])
    })
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => makeChain([]))
        }))
      }))
    })

    const app = buildTestApp()
    const res = await app.request("/api/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: "q-1" })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["id"]).toBe("bank-existing")
    expect(body["text"]).toBe("Soal sudah ada")
  })

  it("surfaces 5xx when insert fails even if a later select would find a row (DB error masking regression)", async () => {
    const examRow = makeExamRow({ subject: "ipas", grade: 5 })
    const questionRow = makeQuestionRow({ id: "q-1", examId: "exam-1", text: "Soal insert-fail" })
    const existingBankRow = makeBankQuestionRow({ id: "bank-existing" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ ...questionRow, examId: examRow.id }])
      if (selectCount === 2) return makeChain([examRow])
      return makeChain([existingBankRow])
    }) // Insert returns a failing Promise — simulates a real DB error.
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => ({
            then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
              Promise.reject(new Error("connection reset"))
                .then(resolve, reject)
          }))
        }))
      }))
    })

    const app = buildTestApp()
    const res = await app.request("/api/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: "q-1" })
    })

    // Must NOT return 201 with a stale row.
    expect(res.status).toBeGreaterThanOrEqual(500)
    expect(res.status).not.toBe(201)
  })
})

describe("PATCH /api/bank/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("toggles isPublic and returns updated bank question", async () => {
    const bankRow = makeBankQuestionRow({ isPublic: false })
    const updatedBankRow = makeBankQuestionRow({ isPublic: true })
    const questionRow = makeQuestionRow({ id: "q-1", text: "Soal toggle" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([bankRow])
      if (selectCount === 2) return makeChain([updatedBankRow])
      return makeChain([questionRow])
    })
    ;(db.update as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/bank/bank-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: true })
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["isPublic"]).toBe(true)
  })

  it("returns 404 when bank question not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/bank/missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: true })
    })
    expect(res.status).toBe(404)
  })

  it("returns unchanged row when PATCH body is empty", async () => {
    const bankRow = makeBankQuestionRow({ isPublic: false })
    const questionRow = makeQuestionRow({ id: "q-1", text: "Soal unchanged" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([bankRow])
      if (selectCount === 2) return makeChain([bankRow])
      return makeChain([questionRow])
    })

    const app = buildTestApp()
    const res = await app.request("/api/bank/bank-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["isPublic"]).toBe(false)
  })
})

describe("DELETE /api/bank/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 404 when bank question not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/bank/missing", { method: "DELETE" })
    expect(res.status).toBe(404)
  })

  it("deletes owned bank question", async () => {
    const bankRow = makeBankQuestionRow()
    ;(db.select as Mock).mockReturnValue(makeChain([bankRow]))
    ;(db.delete as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/bank/bank-1", { method: "DELETE" })
    expect(res.status).toBe(204)
  })
})

function makeFiveBankRows() {
  return Array.from({ length: 5 }, (_, index) =>
    makeBankQuestionRow({
      id: `bank-${index + 1}`,
      questionId: `q-${index + 1}`,
      usageCount: index
    }))
}

describe("POST /api/bank/build-exam", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 422 when fewer than 5 questions", async () => {
    const app = buildTestApp()
    const res = await app.request("/api/bank/build-exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankQuestionIds: ["a", "b", "c", "d"],
        metadata: { subject: "ipas", grade: 5 }
      })
    })
    expect(res.status).toBe(400)
  })

  it("creates exam from 5 bank questions and returns 201", async () => {
    const bankRows = makeFiveBankRows()
    const questionRows = bankRows.map((row, index) =>
      makeQuestionRow({ id: row.questionId, text: `Soal ${index + 1}` })
    )

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain(bankRows)
      return makeChain(questionRows)
    })
    ;(db.insert as Mock).mockReturnValue(makeChain(undefined))
    ;(db.update as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request("/api/bank/build-exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankQuestionIds: bankRows.map((row) => row.id),
        metadata: { subject: "ipas", grade: 5, examType: "latihan" }
      })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["examId"]).toEqual(expect.any(String))
  })

  it("returns 422 when bank question ids are not all owned", async () => {
    const bankRows = makeFiveBankRows().slice(0, 4)
    ;(db.select as Mock).mockReturnValue(makeChain(bankRows))

    const app = buildTestApp()
    const res = await app.request("/api/bank/build-exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankQuestionIds: ["bank-1", "bank-2", "bank-3", "bank-4", "bank-5"],
        metadata: { subject: "ipas", grade: 5 }
      })
    })
    expect(res.status).toBe(422)
  })

  it("returns 422 when more than 50 bank questions requested", async () => {
    const tooManyIds = Array.from({ length: 51 }, (_, index) => `bank-${index + 1}`)

    const app = buildTestApp()
    const res = await app.request("/api/bank/build-exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankQuestionIds: tooManyIds,
        metadata: { subject: "ipas", grade: 5 }
      })
    })
    expect(res.status).toBe(400)
  })
})
