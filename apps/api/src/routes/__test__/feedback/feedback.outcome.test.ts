import { db } from "@teacher-exam/db"
import { Effect } from "effect"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { makeChain, makeExamRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const now = new Date("2026-07-23T08:00:00.000Z")

function makeOutcomeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "outcome-1",
    userId: "test-user-id",
    examId: "exam-1",
    trigger: "export_pdf",
    readiness: null,
    firstExportAt: now,
    answeredAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe("PUT /api/feedback/exams/:examId/outcome", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates the first export denominator and returns the outcome", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([makeExamRow()]))
    const insertChain = makeChain([makeOutcomeRow()])
    insertChain.values.mockReturnValue(insertChain)
    insertChain.onConflictDoUpdate.mockReturnValue(insertChain)
    insertChain.returning.mockReturnValue(makeChain([makeOutcomeRow()]))
    ;(db.insert as Mock).mockReturnValue(insertChain)

    const app = buildHttpApiTestApp({ userId: "test-user-id" })
    const response = await app.request("/api/feedback/exams/exam-1/outcome", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trigger: "export_pdf", readiness: null })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      examId: "exam-1",
      trigger: "export_pdf",
      readiness: null,
      firstExportAt: now.toISOString()
    })
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalledTimes(1)
  })

  it("records readiness on the same idempotent outcome", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([makeExamRow()]))
    const insertChain = makeChain([
      makeOutcomeRow({ readiness: "ready_after_edit", answeredAt: now })
    ])
    ;(db.insert as Mock).mockReturnValue(insertChain)

    const app = buildHttpApiTestApp({ userId: "test-user-id" })
    const response = await app.request("/api/feedback/exams/exam-1/outcome", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trigger: "export_docx", readiness: "ready_after_edit" })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      examId: "exam-1",
      trigger: "export_pdf",
      readiness: "ready_after_edit"
    })
  })

  it("returns 404 for missing or cross-user exams", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildHttpApiTestApp({ userId: "test-user-id" })
    const response = await app.request("/api/feedback/exams/exam-other/outcome", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trigger: "print_intent", readiness: null })
    })
    expect(response.status).toBe(404)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it("requires authentication", async () => {
    const app = buildHttpApiTestApp({ authenticated: false })
    const response = await app.request("/api/feedback/exams/exam-1/outcome", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trigger: "export_pdf", readiness: null })
    })
    expect(response.status).toBe(401)
  })

  it("rejects invalid feedback payloads", async () => {
    const app = buildHttpApiTestApp({ userId: "test-user-id" })
    const response = await app.request("/api/feedback/exams/exam-1/outcome", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trigger: "download", readiness: "maybe" })
    })
    expect(response.status).toBe(400)
    expect(db.select).not.toHaveBeenCalled()
  })

  it("returns 500 when the database query fails", async () => {
    const failingChain = makeChain([])
    failingChain.from.mockReturnValue(failingChain)
    failingChain.where.mockReturnValue(failingChain)
    failingChain.limit.mockReturnValue(
      Effect.fail({ _tag: "SqlError", message: "database unavailable" })
    )
    ;(db.select as Mock).mockReturnValue(failingChain)

    const app = buildHttpApiTestApp({ userId: "test-user-id" })
    const response = await app.request("/api/feedback/exams/exam-1/outcome", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trigger: "export_pdf", readiness: null })
    })
    expect(response.status).toBe(500)
  })
})
