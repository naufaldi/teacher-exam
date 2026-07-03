import type { GenerateExamInput } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import {
  convertGeneratedToQuestion,
  decodeGeneratedFigure,
  examSubjectInsertFields,
  failureReasonForNumber,
  makeFakeQuestionShape,
  makePlaceholderQuestion,
  resolveInputSubjectLabel
} from "../ai-generate-mappers"

describe("resolveInputSubjectLabel", () => {
  it("prefers a trimmed custom subjectLabel", () => {
    const input = { subjectLabel: "  Seni Budaya  " } as GenerateExamInput
    expect(resolveInputSubjectLabel(input)).toBe("Seni Budaya")
  })

  it("falls back to the subject enum label", () => {
    const input = { subject: "bahasa_indonesia" } as GenerateExamInput
    expect(resolveInputSubjectLabel(input)).toBe("Bahasa Indonesia")
  })

  it("defaults when neither is set", () => {
    expect(resolveInputSubjectLabel({} as GenerateExamInput)).toBe("Mata Pelajaran")
  })
})

describe("examSubjectInsertFields", () => {
  it("clears subject and keeps a custom label for pdf_guru", () => {
    const input = { subjectLabel: " Custom " } as GenerateExamInput
    expect(examSubjectInsertFields("pdf_guru", input)).toEqual({ subject: null, subjectLabel: "Custom" })
  })

  it("keeps the subject and nulls the label for default", () => {
    const input = { subject: "matematika" } as GenerateExamInput
    expect(examSubjectInsertFields("default", input)).toEqual({ subject: "matematika", subjectLabel: null })
  })
})

describe("decodeGeneratedFigure", () => {
  it("returns nulls when there is no figure", () => {
    expect(decodeGeneratedFigure(null)).toEqual({ figure: null, status: null, reason: null })
    expect(decodeGeneratedFigure(undefined)).toEqual({ figure: null, status: null, reason: null })
  })

  it("flags an invalid figure for review", () => {
    const result = decodeGeneratedFigure({ not: "a figure" })
    expect(result.figure).toBeNull()
    expect(result.status).toBe("needs_review")
    expect(result.reason).toContain("FigureSpec validation failed")
  })
})

describe("convertGeneratedToQuestion", () => {
  it("maps an mcq_single with no validation issues", () => {
    const q = convertGeneratedToQuestion(makeFakeQuestionShape(3), {
      id: crypto.randomUUID(),
      examId: crypto.randomUUID(),
      number: 3,
      status: "accepted",
      createdAt: new Date("2026-01-01T00:00:00.000Z")
    })
    expect(q._tag).toBe("mcq_single")
    expect(q.number).toBe(3)
    expect(q.validationStatus).toBeNull()
  })
})

describe("failureReasonForNumber", () => {
  it("returns the parse error when the item failed", () => {
    const failed = [{ index: 0, error: "boom" }]
    expect(failureReasonForNumber(1, failed, [])).toBe("boom")
  })

  it("reports missing numbers", () => {
    expect(failureReasonForNumber(4, [], [4])).toBe("Soal tidak ada dalam output AI.")
  })

  it("falls back to a generic validation reason", () => {
    expect(failureReasonForNumber(2, [], [])).toBe("Soal gagal divalidasi.")
  })
})

describe("makePlaceholderQuestion", () => {
  it("produces a failed placeholder flagged for review", () => {
    const q = makePlaceholderQuestion(crypto.randomUUID(), 5, new Date(), "gagal")
    expect(q.generationFailed).toBe(true)
    expect(q.validationStatus).toBe("needs_review")
    expect(q.validationReason).toBe("gagal")
    expect(q.number).toBe(5)
  })
})
