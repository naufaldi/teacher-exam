import { db } from "@teacher-exam/db"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain, makeExamRow, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const NOW = "2024-01-01T00:00:00.000Z"
const OPEN = "2024-01-01T08:00:00.000Z"
const CLOSE = "2024-01-01T10:00:00.000Z"

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
    opensAt: new Date(OPEN),
    closesAt: new Date(CLOSE),
    durationMinutes: 90,
    status: "open",
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides
  }
}

function makeSessionStudentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ss-1",
    sessionId: "ses-1",
    studentId: "std-1",
    studentName: "Budi",
    identifier: null,
    token: "tok-abc",
    joinedAt: new Date(NOW),
    submittedAt: null,
    answers: null,
    ...overrides
  }
}

function makeQuestion(overrides: Record<string, unknown> = {}) {
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

describe("POST /api/exams/:id/sessions (teacher)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a session from a final owned exam and returns 201", async () => {
    const exam = makeExamRow({ status: "final" })
    const session = makeSessionRow({ id: "ses-new", sessionCode: "XYZ789" })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      return makeChain(selectCount === 1 ? [exam] : [])
    })
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => makeChain([session]))
      }))
    })

    const app = authedApp()
    const res = await app.request("/api/exams/exam-1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: "cls-1",
        opensAt: OPEN,
        closesAt: CLOSE,
        durationMinutes: 90
      })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["sessionCode"]).toBe("XYZ789")
  })

  it("returns 404 when exam is not owned/found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = authedApp()
    const res = await app.request("/api/exams/missing/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: "cls-1",
        opensAt: OPEN,
        closesAt: CLOSE,
        durationMinutes: 90
      })
    })
    expect(res.status).toBe(404)
  })

  it("returns 400 when exam is not final", async () => {
    const exam = makeExamRow({ status: "draft" })
    ;(db.select as Mock).mockReturnValue(makeChain([exam]))

    const app = authedApp()
    const res = await app.request("/api/exams/exam-1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: "cls-1",
        opensAt: OPEN,
        closesAt: CLOSE,
        durationMinutes: 90
      })
    })
    expect(res.status).toBe(400)
  })

  it("returns 401 when not authenticated", async () => {
    const app = publicApp()
    const res = await app.request("/api/exams/exam-1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: "cls-1",
        opensAt: OPEN,
        closesAt: CLOSE,
        durationMinutes: 90
      })
    })
    expect(res.status).toBe(401)
  })
})

describe("GET /api/sessions/:code (public)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns exam + window + timer WITHOUT correct answers", async () => {
    const session = makeSessionRow()
    const exam = makeExamRow({ status: "final" })
    const question = makeQuestion()
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([session])
      if (selectCount === 2) return makeChain([exam])
      return makeChain([question])
    })

    const app = publicApp()
    const res = await app.request("/api/sessions/ABC123")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["sessionCode"]).toBe("ABC123")
    expect(body["durationMinutes"]).toBe(90)
    const json = JSON.stringify(body)
    expect(json).not.toContain("\"correct\"")
    expect(json).not.toContain("correctAnswer")
  })

  it("returns 404 when session code not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = publicApp()
    const res = await app.request("/api/sessions/NOPE")
    expect(res.status).toBe(404)
  })

  it("does NOT require authentication", async () => {
    const session = makeSessionRow()
    const exam = makeExamRow({ status: "final" })
    const question = makeQuestion()
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([session])
      if (selectCount === 2) return makeChain([exam])
      return makeChain([question])
    })

    const app = publicApp()
    const res = await app.request("/api/sessions/ABC123")
    expect(res.status).toBe(200)
  })
})

describe("POST /api/sessions/:code/start (public)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("enrolls a new student by name and returns a token", async () => {
    const session = makeSessionRow()
    const enrolled = makeSessionStudentRow({ id: "ss-new", token: "tok-new", studentName: "Siti" })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      // 1: session lookup, 2: existing-token lookup (none)
      return makeChain(selectCount === 1 ? [session] : [])
    })
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => makeChain([enrolled]))
      }))
    })

    const app = publicApp()
    const res = await app.request("/api/sessions/ABC123/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName: "Siti" })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["token"]).toBe("tok-new")
    expect(body["studentName"]).toBe("Siti")
  })

  it("returns existing enrollment when token is provided", async () => {
    const session = makeSessionRow()
    const existing = makeSessionStudentRow({ token: "tok-existing" })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([session])
      return makeChain([existing])
    })

    const app = publicApp()
    const res = await app.request("/api/sessions/ABC123/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "tok-existing" })
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["token"]).toBe("tok-existing")
  })

  it("returns 404 when session code not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = publicApp()
    const res = await app.request("/api/sessions/NOPE/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName: "Siti" })
    })
    expect(res.status).toBe(404)
  })
})

describe("POST /api/sessions/:code/submit (public)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("stores answers and marks the student submitted", async () => {
    const session = makeSessionRow()
    const student = makeSessionStudentRow({ submittedAt: null, answers: null })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([session])
      return makeChain([student])
    })
    ;(db.update as Mock).mockReturnValue(makeChain(undefined))

    const app = publicApp()
    const res = await app.request("/api/sessions/ABC123/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "tok-abc",
        answers: { "q-1": { _tag: "mcq_single", answer: "a" } }
      })
    })
    expect(res.status).toBe(200)
    expect(db.update).toHaveBeenCalled()
  })

  it("returns 404 when session code not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = publicApp()
    const res = await app.request("/api/sessions/NOPE/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "tok-abc", answers: {} })
    })
    expect(res.status).toBe(404)
  })

  it("rejects duplicate submit (already submitted)", async () => {
    const session = makeSessionRow()
    const student = makeSessionStudentRow({ submittedAt: new Date(NOW) })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([session])
      return makeChain([student])
    })

    const app = publicApp()
    const res = await app.request("/api/sessions/ABC123/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "tok-abc", answers: {} })
    })
    expect(res.status).toBe(409)
  })
})
