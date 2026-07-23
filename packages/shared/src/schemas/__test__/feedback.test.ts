import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { ExamPilotOutcomeSchema, SetExamPilotOutcomeInputSchema } from "../feedback.js"

describe("teacher feedback schemas", () => {
  it("accepts an unanswered export denominator", () => {
    const decoded = Schema.decodeUnknownEither(SetExamPilotOutcomeInputSchema)({
      trigger: "export_pdf",
      readiness: null
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("accepts each readiness answer", () => {
    for (const readiness of ["ready", "ready_after_edit", "not_ready"] as const) {
      const decoded = Schema.decodeUnknownEither(SetExamPilotOutcomeInputSchema)({
        trigger: "export_docx",
        readiness
      })
      expect(Either.isRight(decoded)).toBe(true)
    }
  })

  it("rejects unknown triggers and readiness values", () => {
    expect(Either.isLeft(
      Schema.decodeUnknownEither(SetExamPilotOutcomeInputSchema)({
        trigger: "download",
        readiness: "maybe"
      })
    )).toBe(true)
  })

  it("decodes the API response timestamps", () => {
    const decoded = Schema.decodeUnknownEither(ExamPilotOutcomeSchema)({
      id: "outcome-1",
      examId: "exam-1",
      trigger: "print_intent",
      readiness: null,
      firstExportAt: "2026-07-23T08:00:00.000Z",
      answeredAt: null,
      createdAt: "2026-07-23T08:00:00.000Z",
      updatedAt: "2026-07-23T08:00:00.000Z"
    })
    expect(Either.isRight(decoded)).toBe(true)
  })
})
