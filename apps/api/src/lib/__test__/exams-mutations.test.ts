import type { questions } from "@teacher-exam/db"
import type { UpdateExamInput } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import { buildExamUpdateData, mapDuplicatedQuestionRows } from "../exams-mutations"

describe("buildExamUpdateData", () => {
  it("includes only provided fields", () => {
    const input = { title: "Baru", durationMinutes: 90 } as UpdateExamInput
    expect(buildExamUpdateData(input)).toEqual({ title: "Baru", durationMinutes: 90 })
  })

  it("returns an empty map when nothing is provided", () => {
    expect(buildExamUpdateData({} as UpdateExamInput)).toEqual({})
  })

  it("does not inject updatedAt (caller owns it)", () => {
    const result = buildExamUpdateData({ status: "final" } as UpdateExamInput)
    expect(result["updatedAt"]).toBeUndefined()
    expect(result["status"]).toBe("final")
  })
})

describe("mapDuplicatedQuestionRows", () => {
  const now = new Date("2026-01-01T00:00:00.000Z")
  const source = [
    {
      id: "old-1",
      examId: "exam-old",
      number: 1,
      text: "Soal 1",
      type: "mcq_single",
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      correctAnswer: "a",
      payload: null,
      topic: "T",
      difficulty: "sedang",
      status: "accepted",
      validationStatus: null,
      validationReason: null,
      createdAt: now
    }
  ] as unknown as Array<typeof questions.$inferSelect>

  it("re-parents rows to the new exam id with fresh ids and createdAt", () => {
    const rows = mapDuplicatedQuestionRows(source, "exam-new", now)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.examId).toBe("exam-new")
    expect(rows[0]?.id).not.toBe("old-1")
    expect(rows[0]?.number).toBe(1)
    expect(rows[0]?.createdAt).toBe(now)
  })

  it("returns an empty array for no source questions", () => {
    expect(mapDuplicatedQuestionRows([], "exam-new", now)).toEqual([])
  })
})
