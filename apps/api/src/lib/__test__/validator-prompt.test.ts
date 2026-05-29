import type { Question } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import { buildValidatorPrompt } from "../validator-prompt.js"

const SAMPLE_QUESTION: Question = {
  id: "q-1",
  examId: "exam-1",
  number: 1,
  text: "Bacalah teks berikut...",
  topic: "Teks Narasi",
  difficulty: "sedang",
  status: "pending",
  validationStatus: null,
  validationReason: null,
  figure: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  _tag: "mcq_single",
  options: { a: "A", b: "B", c: "C", d: "D" },
  correct: "a"
}

describe("buildValidatorPrompt", () => {
  it("includes curriculum corpus in the system prompt", () => {
    const corpus = "--- KORPUS CP Fase C ---\nCapaian Pembelajaran"
    const { system } = buildValidatorPrompt({
      exam: { subject: "bahasa_indonesia", grade: 6, examType: "formatif" },
      curriculumText: corpus,
      questions: [SAMPLE_QUESTION]
    })
    expect(system).toContain(corpus)
    expect(system).toContain("valid")
    expect(system).toContain("needs_review")
    expect(system).toContain("invalid")
  })

  it("includes grounding, completeness, and JSON output contract blocks", () => {
    const corpus = "--- KORPUS CP Fase C ---\nCapaian Pembelajaran"
    const { system } = buildValidatorPrompt({
      exam: { subject: "bahasa_indonesia", grade: 6, examType: "formatif" },
      curriculumText: corpus,
      questions: [SAMPLE_QUESTION]
    })
    expect(system).toContain("# Grounding")
    expect(system).toContain("# Kelengkapan")
    expect(system).toContain("# Kontrak output JSON")
    expect(system).toContain("# Verifikasi")
  })

  it("serializes questions as JSON in the user message", () => {
    const { user } = buildValidatorPrompt({
      exam: { subject: "bahasa_indonesia", grade: 6, examType: "formatif" },
      curriculumText: "corpus",
      questions: [SAMPLE_QUESTION]
    })
    const parsed = JSON.parse(user) as Array<{ number: number; text: string }>
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.number).toBe(1)
    expect(parsed[0]?.text).toContain("Bacalah")
  })

  it("throws when questions array is empty", () => {
    expect(() =>
      buildValidatorPrompt({
        exam: { subject: "bahasa_indonesia", grade: 6, examType: "formatif" },
        curriculumText: "corpus",
        questions: []
      })
    ).toThrow(/must not be empty/)
  })
})
