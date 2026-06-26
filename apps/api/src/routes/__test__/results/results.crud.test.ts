import { db } from "@teacher-exam/db"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain, makeExamRow, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const NOW = "2024-01-01T00:00:00.000Z"
const GRADED = "2024-01-01T10:05:00.000Z"

function authedApp() {
  return buildHttpApiTestApp({ userId: "test-user-id" })
}

function publicApp() {
  return buildHttpApiTestApp({ authenticated: false })
}

function makeSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ses-1",
    examId: "exam-1",
    classId: "cls-1",
    sessionCode: "ABC123",
    opensAt: new Date(NOW),
    closesAt: new Date("2024-01-01T23:59:59.000Z"),
    durationMinutes: 60,
    status: "closed",
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides
  }
}

function makeSubmittedStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: "ss-1",
    sessionId: "ses-1",
    studentId: null,
    studentName: "Budi",
    identifier: null,
    token: "tok-abc",
    joinedAt: new Date(NOW),
    submittedAt: new Date(NOW),
    answers: { "q-1": { _tag: "mcq_single", answer: "b" } },
    ...overrides
  }
}

function makeResultRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "res-1",
    sessionId: "ses-1",
    sessionStudentId: "ss-1",
    examId: "exam-1",
    studentName: "Budi",
    score: 100,
    correctCount: 1,
    totalCount: 1,
    gradedStatus: "auto",
    answers: [{ questionId: "q-1", number: 1, type: "mcq_single", isCorrect: true }],
    gradedAt: new Date(GRADED),
    createdAt: new Date(NOW),
    updatedAt: new Date(GRADED),
    ...overrides
  }
}

function makeCorrectQuestion(overrides: Record<string, unknown> = {}) {
  return makeQuestionRow({
    id: "q-1",
    type: "mcq_single",
    optionA: "3",
    optionB: "4",
    optionC: "5",
    optionD: "6",
    correctAnswer: "b",
    ...overrides
  })
}

describe("POST /api/sessions/:sessionId/grade (auto-grade)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("auto-grades submitted students and returns the graded count", async () => {
    const session = makeSessionRow()
    const exam = makeExamRow({ status: "final" })
    const question = makeCorrectQuestion()
    const student = makeSubmittedStudent()
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([session])
      if (selectCount === 2) return makeChain([exam])
      if (selectCount === 3) return makeChain([question])
      return makeChain([student])
    })

    const app = authedApp()
    const res = await app.request("/api/sessions/ses-1/grade", { method: "POST" })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["gradedCount"]).toBe(1)
  })

  it("returns 404 when session not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = authedApp()
    const res = await app.request("/api/sessions/missing/grade", { method: "POST" })
    expect(res.status).toBe(404)
  })

  it("returns 401 when not authenticated", async () => {
    const app = publicApp()
    const res = await app.request("/api/sessions/ses-1/grade", { method: "POST" })
    expect(res.status).toBe(401)
  })

  it("returns 403 when session exam is not owned by user", async () => {
    const session = makeSessionRow()
    const exam = makeExamRow({ status: "final", userId: "someone-else" })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([session])
      return makeChain([exam])
    })

    const app = authedApp()
    const res = await app.request("/api/sessions/ses-1/grade", { method: "POST" })
    expect(res.status).toBe(403)
  })
})

describe("GET /api/sessions/:sessionId/results (teacher)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("lists graded results with stats", async () => {
    const session = makeSessionRow()
    const exam = makeExamRow({ status: "final" })
    const result = makeResultRow()
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([session])
      if (selectCount === 2) return makeChain([exam])
      return makeChain([result])
    })

    const app = authedApp()
    const res = await app.request("/api/sessions/ses-1/results")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["sessionId"]).toBe("ses-1")
    expect((body["results"] as Array<unknown>).length).toBe(1)
    const stats = body["stats"] as Record<string, unknown>
    expect(stats["participantCount"]).toBe(1)
    expect(stats["averageScore"]).toBe(100)
  })

  it("returns 404 when session not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = authedApp()
    const res = await app.request("/api/sessions/missing/results")
    expect(res.status).toBe(404)
  })

  it("returns 401 when not authenticated", async () => {
    const app = publicApp()
    const res = await app.request("/api/sessions/ses-1/results")
    expect(res.status).toBe(401)
  })
})

describe("GET /api/results/:id (single)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a single result with per-question breakdown", async () => {
    const result = makeResultRow()
    const session = makeSessionRow()
    const exam = makeExamRow({ status: "final" })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([result])
      if (selectCount === 2) return makeChain([session])
      return makeChain([exam])
    })

    const app = authedApp()
    const res = await app.request("/api/results/res-1")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["id"]).toBe("res-1")
    expect((body["answers"] as Array<unknown>).length).toBe(1)
  })

  it("returns 404 when result not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = authedApp()
    const res = await app.request("/api/results/missing")
    expect(res.status).toBe(404)
  })

  it("returns 403 when result's exam is not owned by user", async () => {
    const result = makeResultRow()
    const session = makeSessionRow()
    const exam = makeExamRow({ status: "final", userId: "someone-else" })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([result])
      if (selectCount === 2) return makeChain([session])
      return makeChain([exam])
    })

    const app = authedApp()
    const res = await app.request("/api/results/res-1")
    expect(res.status).toBe(403)
  })
})
