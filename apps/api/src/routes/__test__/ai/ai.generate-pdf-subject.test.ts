import { db } from "@teacher-exam/db"
import { Effect } from "effect"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"

import type { AiService, GeneratedQuestion } from "../../../services/AiService.js"
import { makeChain, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const { mockBuildExamPrompt, mockResolveRetrievalContext } = vi.hoisted(() => ({
  mockBuildExamPrompt: vi.fn(() => ({ system: "mock system", user: "mock user" })),
  mockResolveRetrievalContext: vi.fn(() =>
    Effect.succeed({
      curriculumText: "mock pdf excerpt ".repeat(20),
      retrievalTrace: ["mock"]
    })
  )
}))

vi.mock("drizzle-orm", async () => {
  const { createDrizzleOrmMock } = await import("../drizzle-mock.js")
  return createDrizzleOrmMock()
})

vi.mock("../../../lib/prompt.js", () => ({
  buildExamPrompt: mockBuildExamPrompt
}))

vi.mock("../../../lib/pdf-upload-service.js", () => ({
  loadReadyPdfUpload: vi.fn(() =>
    Effect.succeed({
      bytes: Buffer.from("fake-pdf"),
      filename: "worksheet.pdf"
    })
  )
}))

vi.mock("../../../lib/retrieval/retrieval-service.js", () => ({
  InsufficientMateriError: class InsufficientMateriError {
    readonly _tag = "InsufficientMateriError"
    constructor(readonly message: string) {}
  },
  resolveRetrievalContext: mockResolveRetrievalContext
}))

function makeFakeQuestion(n: number): GeneratedQuestion {
  return {
    _tag: "mcq_single",
    number: n,
    text: `Question ${n}`,
    option_a: "Option A",
    option_b: "Option B",
    option_c: "Option C",
    option_d: "Option D",
    correct_answer: "a",
    topic: "Ekosistem",
    difficulty: "sedang"
  }
}

const FAKE_AI_QUESTIONS = Array.from({ length: 20 }, (_, i) => makeFakeQuestion(i + 1))

const fakeAiService: AiService = {
  generate: vi.fn(() => Effect.succeed(FAKE_AI_QUESTIONS)),
  generateRaw: vi.fn(() => Effect.succeed(JSON.stringify(FAKE_AI_QUESTIONS))),
  validateCurriculum: vi.fn(({ expectedCount }: { expectedCount: number }) =>
    Effect.succeed(
      Array.from({ length: expectedCount }, (_, i) => ({
        number: i + 1,
        status: "valid" as const,
        reason: "Sesuai CP."
      }))
    )
  ),
  generateDiscussion: vi.fn(),
  streamDiscussion: vi.fn()
}

function makeExamRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "exam-gen-1",
    userId: "test-user-id",
    title: "Seni Budaya · Kelas 5",
    subject: null,
    subjectLabel: "Seni Budaya",
    grade: 5,
    difficulty: "sedang",
    topics: ["Ekosistem"],
    reviewMode: "fast",
    status: "draft",
    schoolName: null,
    academicYear: null,
    examType: "formatif",
    examDate: null,
    durationMinutes: null,
    instructions: null,
    classContext: null,
    discussionMd: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides
  }
}

function mockGenerateDbSelects(opts: {
  examRow: Record<string, unknown>
  questionRows: ReadonlyArray<Record<string, unknown>>
}) {
  let selectCount = 0
  ;(db.select as Mock).mockImplementation(() => {
    selectCount++
    if (selectCount === 1) return makeChain([opts.examRow])
    return makeChain([...opts.questionRows])
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(fakeAiService.generateRaw as Mock).mockReturnValue(
    Effect.succeed(JSON.stringify(FAKE_AI_QUESTIONS))
  )
  ;(db.update as Mock).mockReturnValue(makeChain([]))
})

describe("POST /api/ai/generate — pdf_guru free-text mapel", () => {
  it("persists subjectLabel with null subject on insert", async () => {
    const insertChain = makeChain([])
    ;(db.insert as Mock).mockReturnValue(insertChain)

    const examRow = makeExamRow()
    const questionRows = Array.from(
      { length: 20 },
      (_, i) => makeQuestionRow({ id: `q-${i + 1}`, examId: "exam-gen-1", number: i + 1 })
    )
    mockGenerateDbSelects({ examRow, questionRows })

    const app = buildHttpApiTestApp({ userId: "test-user-id", aiService: fakeAiService })
    const res = await app.request("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceMode: "pdf_guru",
        subjectLabel: "Seni Budaya",
        grade: 5,
        difficulty: "sedang",
        topics: ["Ekosistem"],
        reviewMode: "fast",
        freeTopic: "Ekosistem dan pencemaran lingkungan",
        pdfUploadId: "550e8400-e29b-41d4-a716-446655440000"
      })
    })

    if (res.status !== 201) {
      throw new Error(`expected 201, got ${res.status}: ${await res.text()}`)
    }

    expect(mockBuildExamPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectLabel: "Seni Budaya"
      })
    )
    expect(db.insert).toHaveBeenCalled()
    const insertValues = insertChain.values as Mock
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: null,
        subjectLabel: "Seni Budaya"
      })
    )
  })
})
