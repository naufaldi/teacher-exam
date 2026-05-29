import { db } from "@teacher-exam/db"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain, makeQuestionRow } from "../helpers.js"
import { buildTestApp, makeExamRow } from "./exams-setup.js"

describe("POST /api/exams/:id/finalize", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 404 for non-existent or unowned exam", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp()
    const res = await app.request("/api/exams/no-exam/finalize", { method: "POST" })
    expect(res.status).toBe(404)
  })

  it("returns 422 when exam has no questions", async () => {
    const examRow = makeExamRow()

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow]) // ownership check
      return makeChain([]) // no questions
    })

    const app = buildTestApp()
    const res = await app.request("/api/exams/exam-1/finalize", { method: "POST" })
    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body["code"]).toBe("FINALIZE_NOT_ALLOWED")
  })

  it("returns 422 when any question is pending or rejected in slow mode", async () => {
    const examRow = makeExamRow({ reviewMode: "slow" })
    // 19 accepted + 1 pending
    const acceptedQ = makeQuestionRow({ status: "accepted" })
    const pendingQ = makeQuestionRow({ id: "q-pending", status: "pending" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow]) // ownership check
      return makeChain([acceptedQ, pendingQ]) // questions select
    })

    const app = buildTestApp()
    const res = await app.request("/api/exams/exam-1/finalize", { method: "POST" })
    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body["code"]).toBe("FINALIZE_NOT_ALLOWED")
    const details = body["details"] as Record<string, unknown>
    expect(details["pendingCount"]).toBe(1)
    expect(details["rejectedCount"]).toBe(0)
  })

  it("auto-accepts pending questions and finalizes when exam reviewMode is fast", async () => {
    const examRow = makeExamRow({ reviewMode: "fast" })
    const pendingQ = makeQuestionRow({ status: "pending" })
    const finalExamRow = makeExamRow({ status: "final", reviewMode: "fast" })
    const acceptedQ = makeQuestionRow({ status: "accepted" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow]) // ownership check
      if (selectCount === 2) return makeChain([pendingQ]) // questions
      if (selectCount === 3) return makeChain([finalExamRow]) // fetchExamWithQuestions → exam
      return makeChain([acceptedQ]) // fetchExamWithQuestions → questions
    })

    const updateChain = makeChain([])
    ;(db.update as Mock).mockReturnValue(updateChain)

    const app = buildTestApp()
    const res = await app.request("/api/exams/exam-1/finalize", { method: "POST" })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body["status"]).toBe("final")
    // db.update called twice: once to auto-accept questions, once to set exam status=final
    expect(db.update).toHaveBeenCalledTimes(2)
  })

  it("returns 200 with status=final when all questions accepted", async () => {
    const examRow = makeExamRow()
    const finalExamRow = makeExamRow({ status: "final" })
    const acceptedQ = makeQuestionRow({ status: "accepted" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow]) // ownership check
      if (selectCount === 2) return makeChain([acceptedQ]) // questions — all accepted
      if (selectCount === 3) return makeChain([finalExamRow]) // fetchExamWithQuestions → exam
      return makeChain([acceptedQ]) // fetchExamWithQuestions → questions
    })

    const updateChain = makeChain([])
    ;(db.update as Mock).mockReturnValue(updateChain)

    const app = buildTestApp()
    const res = await app.request("/api/exams/exam-1/finalize", { method: "POST" })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body["status"]).toBe("final")
    expect(Array.isArray(body["questions"])).toBe(true)
  })
})

describe("POST /api/exams/:id/share", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 404 when exam not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp()
    const res = await app.request("/api/exams/no-exam/share", { method: "POST" })
    expect(res.status).toBe(404)
  })

  it("creates or returns a public share slug for an owned exam", async () => {
    const examRow = makeExamRow()
    ;(db.select as Mock).mockReturnValue(makeChain([examRow]))
    ;(db.update as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request("/api/exams/exam-1/share", { method: "POST" })

    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body["publicUrlPath"]).toMatch(/^\/share\//)
    expect(body["slug"]).toEqual(expect.any(String))
    expect(body["publishedAt"]).toEqual(expect.any(String))
  })
})
