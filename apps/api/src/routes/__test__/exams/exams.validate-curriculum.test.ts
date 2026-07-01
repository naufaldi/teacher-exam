import { db } from "@teacher-exam/db"
import { Effect } from "effect"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"

import { TestCurriculumFailingLayer } from "../../../api/services/curriculum-service.js"
import type { AiService } from "../../../services/AiService.js"
import { makeChain, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"
import { buildTestApp, makeExamRow } from "./exams-setup.js"

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ op: "eq", col, val })),
  and: vi.fn((...args) => ({ op: "and", args }))
}))

const fakeAiService = {
  validateCurriculum: vi.fn()
} as unknown as AiService

describe("POST /api/exams/:id/validate-curriculum", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fakeAiService.validateCurriculum as Mock).mockImplementation(
      ({ expectedCount }: { expectedCount: number }) =>
        Effect.succeed(
          Array.from({ length: expectedCount }, (_, i) => ({
            number: i + 1,
            status: i === 0 ? ("needs_review" as const) : ("valid" as const),
            reason: i === 0 ? "Level kognitif tinggi." : "Sesuai CP."
          }))
        )
    )
    ;(db.update as Mock).mockReturnValue(makeChain([]))
  })

  it("returns 404 when exam not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp({ aiService: fakeAiService })
    const res = await app.request("/api/exams/missing/validate-curriculum", { method: "POST" })
    expect(res.status).toBe(404)
  })

  it("runs validation and returns updated exam", async () => {
    const examRow = makeExamRow()
    const questionRows = Array.from({ length: 3 }, (_, i) =>
      makeQuestionRow({
        id: `q-${i + 1}`,
        examId: "exam-1",
        number: i + 1,
        validationStatus: null
      }))
    const validatedRows = questionRows.map((q, i) => ({
      ...q,
      validationStatus: i === 0 ? "needs_review" : "valid",
      validationReason: i === 0 ? "Level kognitif tinggi." : "Sesuai CP."
    }))

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      if (selectCount === 2) return makeChain(questionRows)
      if (selectCount === 3) return makeChain([examRow])
      return makeChain(validatedRows)
    })

    const app = buildTestApp({ aiService: fakeAiService })
    const res = await app.request("/api/exams/exam-1/validate-curriculum", { method: "POST" })

    expect(res.status).toBe(200)
    expect(db.update as Mock).toHaveBeenCalled()
    const body = (await res.json()) as { questions: Array<{ validationStatus: string | null }> }
    expect(body.questions[0]?.validationStatus).toBe("needs_review")
    expect(body.questions[1]?.validationStatus).toBe("valid")
  })

  it("bumps parent exam updatedAt when curriculum validation runs", async () => {
    const examRow = makeExamRow()
    const questionRows = [makeQuestionRow({ examId: "exam-1", number: 1, validationStatus: null })]
    const validatedRows = [{
      ...questionRows[0]!,
      validationStatus: "valid",
      validationReason: "Sesuai CP."
    }]

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      if (selectCount === 2) return makeChain(questionRows)
      if (selectCount === 3) return makeChain([examRow])
      return makeChain(validatedRows)
    })

    const capturedUpdates: Array<Record<string, unknown>> = []
    ;(db.update as Mock).mockImplementation(() => {
      const chain = makeChain(validatedRows) as ReturnType<typeof makeChain> & { set: Mock }
      const originalSet = chain.set
      chain.set = vi.fn((value: Record<string, unknown>) => {
        capturedUpdates.push(value)
        return originalSet(value)
      }) as unknown as Mock
      return chain
    })

    const app = buildTestApp({ aiService: fakeAiService })
    const res = await app.request("/api/exams/exam-1/validate-curriculum", { method: "POST" })

    expect(res.status).toBe(200)
    expect(capturedUpdates.some((update) => update["updatedAt"] instanceof Date)).toBe(true)
  })

  it("returns 500 when curriculum lookup fails", async () => {
    const examRow = makeExamRow()
    const questionRows = [makeQuestionRow({ examId: "exam-1", number: 1 })]
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      return makeChain(questionRows)
    })

    const app = buildHttpApiTestApp({
      userId: "test-user-id",
      aiService: fakeAiService,
      curriculumLayer: TestCurriculumFailingLayer()
    })
    const res = await app.request("/api/exams/exam-1/validate-curriculum", { method: "POST" })

    expect(res.status).toBe(500)
    const body = (await res.json()) as { code?: string; error?: string }
    expect(body.code).toBe("DATABASE_ERROR")
    expect(body.error).toContain("Curriculum")
  })

  it("uses the AI rate limit for repeated curriculum validation requests", async () => {
    const examRow = makeExamRow({ userId: "ai-limit-user" })
    const questionRows = [makeQuestionRow({ examId: "exam-1", number: 1 })]
    const validatedRows = [{
      ...questionRows[0]!,
      validationStatus: "valid",
      validationReason: "Sesuai CP."
    }]

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      const step = (selectCount - 1) % 4
      if (step === 0) return makeChain([examRow])
      if (step === 1) return makeChain(questionRows)
      if (step === 2) return makeChain([examRow])
      return makeChain(validatedRows)
    })

    const app = buildHttpApiTestApp({
      userId: "ai-limit-user",
      aiService: fakeAiService,
      aiRateLimit: {
        windows: [{ windowMs: 60_000, max: 2 }]
      }
    })

    for (let i = 0; i < 2; i++) {
      expect((await app.request("/api/exams/exam-1/validate-curriculum", { method: "POST" })).status).toBe(200)
    }
    const limited = await app.request("/api/exams/exam-1/validate-curriculum", { method: "POST" })
    expect(limited.status).toBe(429)
  })
})
