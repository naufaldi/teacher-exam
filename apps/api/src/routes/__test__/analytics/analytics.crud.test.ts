import { db } from "@teacher-exam/db"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain, makeExamRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const NOW = "2024-01-01T00:00:00.000Z"

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

function makeResultRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "res-1",
    sessionId: "ses-1",
    sessionStudentId: "ss-1",
    examId: "exam-1",
    studentName: "Budi",
    score: 80,
    correctCount: 8,
    totalCount: 10,
    gradedStatus: "auto",
    answers: [{ questionId: "q-1", number: 1, type: "mcq_single", isCorrect: true }],
    gradedAt: new Date(NOW),
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides
  }
}

function makeClassRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cls-1",
    userId: "test-user-id",
    name: "Kelas 5A",
    grade: 5,
    subject: "ipas",
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides
  }
}

describe("GET /api/analytics/exams/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns exam analytics with distribution and per-question stats", async () => {
    const exam = makeExamRow({ status: "final", title: "Latihan IPAS" })
    const session = makeSessionRow()
    const result = makeResultRow()
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([exam])
      if (selectCount === 2) return makeChain([session])
      return makeChain([result])
    })

    const app = authedApp()
    const res = await app.request("/api/analytics/exams/exam-1")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["examId"]).toBe("exam-1")
    expect(body["participantCount"]).toBe(1)
    expect((body["scoreDistribution"] as Array<unknown>).length).toBeGreaterThan(0)
    expect((body["perQuestion"] as Array<unknown>).length).toBe(1)
  })

  it("returns 404 when exam not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = authedApp()
    const res = await app.request("/api/analytics/exams/missing")
    expect(res.status).toBe(404)
  })

  it("returns 403 when exam not owned by user", async () => {
    const exam = makeExamRow({ status: "final", userId: "someone-else" })
    ;(db.select as Mock).mockReturnValue(makeChain([exam]))

    const app = authedApp()
    const res = await app.request("/api/analytics/exams/exam-1")
    expect(res.status).toBe(403)
  })

  it("returns 401 when not authenticated", async () => {
    const app = publicApp()
    const res = await app.request("/api/analytics/exams/exam-1")
    expect(res.status).toBe(401)
  })
})

describe("GET /api/analytics/classes/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns class analytics aggregate", async () => {
    const cls = makeClassRow()
    const session = makeSessionRow()
    const result = makeResultRow()
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([cls])
      if (selectCount === 2) return makeChain([session])
      return makeChain([result])
    })

    const app = authedApp()
    const res = await app.request("/api/analytics/classes/cls-1")
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body["classId"]).toBe("cls-1")
    expect(body["className"]).toBe("Kelas 5A")
    expect(body["participantCount"]).toBe(1)
  })

  it("returns 404 when class not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = authedApp()
    const res = await app.request("/api/analytics/classes/missing")
    expect(res.status).toBe(404)
  })

  it("returns 403 when class not owned by user", async () => {
    const cls = makeClassRow({ userId: "someone-else" })
    ;(db.select as Mock).mockReturnValue(makeChain([cls]))

    const app = authedApp()
    const res = await app.request("/api/analytics/classes/cls-1")
    expect(res.status).toBe(403)
  })
})
