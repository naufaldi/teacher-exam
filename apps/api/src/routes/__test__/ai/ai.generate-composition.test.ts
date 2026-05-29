import { db } from "@teacher-exam/db"
import { Effect } from "effect"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import type { GeneratedQuestion } from "../../../services/AiService.js"
import { makeChain, makeQuestionRow } from "../helpers.js"
import {
  buildExamPrompt,
  buildTestApp,
  FAKE_AI_QUESTIONS,
  fakeAiService,
  makeExamRow,
  makeFakeQuestion,
  mockGenerateDbSelects,
  VALID_BODY
} from "./ai-setup.js"

describe("POST /api/ai/generate — composition & totalSoal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fakeAiService.generateRaw as Mock).mockReturnValue(
      Effect.succeed(JSON.stringify(FAKE_AI_QUESTIONS))
    )
    ;(fakeAiService.validateCurriculum as Mock).mockImplementation(({ expectedCount }: { expectedCount: number }) =>
      Effect.succeed(
        Array.from({ length: expectedCount }, (_, i) => ({
          number: i + 1,
          status: "valid" as const,
          reason: "Sesuai CP."
        }))
      )
    )
    ;(db.update as Mock).mockReturnValue(makeChain([]))
  })

  describe("totalSoal resolution", () => {
    function setupDbMocks(examType = "formatif") {
      const examRow = makeExamRow({ examType })
      const questionRows = Array.from(
        { length: 20 },
        (_, i) => makeQuestionRow({ id: `q-${i + 1}`, examId: "exam-gen-1", number: i + 1 })
      )
      const insertChain = makeChain([])
      ;(db.insert as Mock).mockReturnValue(insertChain)
      mockGenerateDbSelects({ examRow, questionRows })
      return { examRow, questionRows, insertChain }
    }

    it("uses input.totalSoal when provided (sas, totalSoal: 30)", async () => {
      setupDbMocks("sas")
      const app = buildTestApp()
      await app.request("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BODY, examType: "sas", totalSoal: 30 })
      })
      expect(buildExamPrompt as Mock).toHaveBeenCalledWith(
        expect.objectContaining({ totalSoal: 30 })
      )
    })

    it("uses profile defaultTotalSoal when totalSoal omitted (sas → 25)", async () => {
      setupDbMocks("sas")
      const app = buildTestApp()
      await app.request("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BODY, examType: "sas" })
      })
      expect(buildExamPrompt as Mock).toHaveBeenCalledWith(
        expect.objectContaining({ totalSoal: 25 })
      )
    })

    it("uses profile defaultTotalSoal when totalSoal omitted (latihan → 20)", async () => {
      setupDbMocks("latihan")
      const app = buildTestApp()
      await app.request("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BODY, examType: "latihan" })
      })
      expect(buildExamPrompt as Mock).toHaveBeenCalledWith(
        expect.objectContaining({ totalSoal: 20 })
      )
    })
  })

  describe("composition", () => {
    it("resolves composition from profile default when not provided", async () => {
      const app = buildTestApp()
      ;(db.insert as Mock).mockReturnValue(makeChain([]))
      ;(db.transaction as Mock).mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db))

      const examRow = makeExamRow({ examType: "latihan" })
      const questionRows = Array.from(
        { length: 20 },
        (_, i) => makeQuestionRow({ id: `q-${i + 1}`, examId: "exam-gen-1", number: i + 1 })
      )
      mockGenerateDbSelects({ examRow, questionRows })

      const buildMock = buildExamPrompt as Mock
      buildMock.mockClear()
      buildMock.mockReturnValue({ system: "sys", user: "usr" })

      await app.request("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BODY, examType: "latihan" })
      })

      const callArg = buildMock.mock.calls[0]?.[0] as {
        composition: { mcqSingle: number; mcqMulti: number; trueFalse: number }
      }
      expect(callArg?.composition).toEqual({ mcqSingle: 20, mcqMulti: 0, trueFalse: 0 })
    })

    it("resolves sas composition default {15,5,5} when composition not provided", async () => {
      const app = buildTestApp()
      ;(db.insert as Mock).mockReturnValue(makeChain([]))
      ;(db.transaction as Mock).mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db))

      const examRow = makeExamRow({ examType: "sas" })
      const questionRows = Array.from(
        { length: 25 },
        (_, i) => makeQuestionRow({ id: `q-${i + 1}`, examId: "exam-gen-1", number: i + 1 })
      )
      mockGenerateDbSelects({ examRow, questionRows })
      ;(fakeAiService.generateRaw as Mock).mockReturnValueOnce(
        Effect.succeed(JSON.stringify(Array.from({ length: 25 }, (_, i) => makeFakeQuestion(i + 1))))
      )

      const buildMock = buildExamPrompt as Mock
      buildMock.mockClear()
      buildMock.mockReturnValue({ system: "sys", user: "usr" })

      await app.request("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BODY, examType: "sas" })
      })

      const callArg = buildMock.mock.calls[0]?.[0] as {
        composition: { mcqSingle: number; mcqMulti: number; trueFalse: number }
      }
      expect(callArg?.composition).toEqual({ mcqSingle: 15, mcqMulti: 5, trueFalse: 5 })
    })

    it("accepts valid composition override and passes it to buildExamPrompt", async () => {
      const app = buildTestApp()
      ;(db.insert as Mock).mockReturnValue(makeChain([]))
      ;(db.transaction as Mock).mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db))

      const examRow = makeExamRow({ examType: "sas" })
      const questionRows = Array.from(
        { length: 25 },
        (_, i) => makeQuestionRow({ id: `q-${i + 1}`, examId: "exam-gen-1", number: i + 1 })
      )
      mockGenerateDbSelects({ examRow, questionRows })
      ;(fakeAiService.generateRaw as Mock).mockReturnValueOnce(
        Effect.succeed(JSON.stringify(Array.from({ length: 25 }, (_, i) => makeFakeQuestion(i + 1))))
      )

      const buildMock = buildExamPrompt as Mock
      buildMock.mockClear()
      buildMock.mockReturnValue({ system: "sys", user: "usr" })

      const res = await app.request("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...VALID_BODY,
          examType: "sas",
          totalSoal: 25,
          composition: { mcqSingle: 10, mcqMulti: 10, trueFalse: 5 }
        })
      })

      expect(res.status).toBe(201)
      const callArg = buildMock.mock.calls[0]?.[0] as {
        composition: { mcqSingle: number; mcqMulti: number; trueFalse: number }
      }
      expect(callArg?.composition).toEqual({ mcqSingle: 10, mcqMulti: 10, trueFalse: 5 })
    })

    it("returns 400 when composition sum !== totalSoal", async () => {
      const app = buildTestApp()
      const res = await app.request("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...VALID_BODY,
          totalSoal: 25,
          composition: { mcqSingle: 10, mcqMulti: 10, trueFalse: 10 }
        })
      })
      expect(res.status).toBe(400)
    })

    it("persisted mcq_multi row has type=mcq_multi, non-null payload, null legacy columns", async () => {
      const mcqMultiQuestion: GeneratedQuestion = {
        _tag: "mcq_multi" as const,
        number: 5,
        text: "Pilih dua jawaban yang benar!",
        option_a: "A",
        option_b: "B",
        option_c: "C",
        option_d: "D",
        correct_answers: ["a", "c"],
        topic: "Test",
        difficulty: "mudah"
      }
      const mixedQuestions: Array<GeneratedQuestion> = [
        makeFakeQuestion(1),
        makeFakeQuestion(2),
        makeFakeQuestion(3),
        makeFakeQuestion(4),
        mcqMultiQuestion
      ]
      ;(fakeAiService.generateRaw as Mock).mockReturnValueOnce(
        Effect.succeed(JSON.stringify(mixedQuestions))
      )

      const examRow = makeExamRow({ examType: "formatif" })
      const questionRows = Array.from(
        { length: 5 },
        (_, i) => makeQuestionRow({ id: `q-${i + 1}`, examId: "exam-gen-1", number: i + 1 })
      )
      mockGenerateDbSelects({ examRow, questionRows })

      const insertChain = makeChain([])
      ;(db.insert as Mock).mockReturnValue(insertChain)
      ;(db.transaction as Mock).mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db))

      const app = buildTestApp()
      await app.request("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...VALID_BODY,
          examType: "formatif",
          totalSoal: 5,
          composition: { mcqSingle: 4, mcqMulti: 1, trueFalse: 0 }
        })
      })

      const capturedInsertValues = (insertChain["values"] as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as
        | Array<Record<string, unknown>>
        | undefined
      expect(capturedInsertValues).toBeDefined()
      const mcqMultiRow = capturedInsertValues?.find((r) => r["type"] === "mcq_multi")
      expect(mcqMultiRow).toBeDefined()
      expect(mcqMultiRow?.["type"]).toBe("mcq_multi")
      expect(mcqMultiRow?.["payload"]).not.toBeNull()
      expect(mcqMultiRow?.["payload"]).toMatchObject({
        options: expect.any(Object),
        correct: expect.any(Array)
      })
      expect(mcqMultiRow?.["optionA"]).toBeNull()
      expect(mcqMultiRow?.["correctAnswer"]).toBeNull()
    })
  })

  it("uses formatExamTitle unified format for the generated exam title", async () => {
    const examRow = makeExamRow({ examType: "formatif", examDate: null, topics: ["Teks Narasi"] })
    const questionRows = Array.from(
      { length: 20 },
      (_, i) => makeQuestionRow({ id: `q-${i + 1}`, examId: "exam-gen-1", number: i + 1 })
    )

    const insertedValues: Array<unknown> = []
    ;(db.insert as Mock).mockImplementation(() => {
      const chain = makeChain([])
      ;(chain["values"] as ReturnType<typeof vi.fn>).mockImplementation((vals: unknown) => {
        insertedValues.push(vals)
        return chain
      })
      return chain
    })

    mockGenerateDbSelects({ examRow, questionRows })

    const app = buildTestApp()
    await app.request("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY)
    })

    const examInsert = insertedValues[0] as Record<string, unknown>
    expect(examInsert["title"]).not.toContain("·")
    expect(examInsert["title"]).toBe("Bahasa Indonesia / Kelas 6 / formatif")
  })
})
