import { Effect, Stream } from "effect"
import { type Mock, vi } from "vitest"
import type { AiService, GeneratedQuestion } from "../../../services/AiService.js"

import { db } from "@teacher-exam/db"
import { makeChain, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

const { mockBuildExamPrompt } = vi.hoisted(() => ({
  mockBuildExamPrompt: vi.fn(() => ({ system: "mock system", user: "mock user" }))
}))

vi.mock("drizzle-orm", async () => {
  const { createDrizzleOrmMock } = await import("../drizzle-mock.js")
  return createDrizzleOrmMock()
})

vi.mock("../../../lib/prompt.js", () => ({
  buildExamPrompt: mockBuildExamPrompt
}))

const buildExamPrompt = mockBuildExamPrompt

const NOW = "2024-01-01T00:00:00.000Z"

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
    topic: "Teks Narasi",
    difficulty: "sedang"
  }
}

const FAKE_AI_QUESTIONS: Array<GeneratedQuestion> = Array.from({ length: 20 }, (_, i) => makeFakeQuestion(i + 1))

function fakeGenerateRawJson(questions: ReadonlyArray<GeneratedQuestion> = FAKE_AI_QUESTIONS) {
  return JSON.stringify(questions)
}

const fakeAiService: AiService = {
  generate: vi.fn(() => Effect.succeed(FAKE_AI_QUESTIONS)),
  generateRaw: vi.fn(() => Effect.succeed(fakeGenerateRawJson())),
  validateCurriculum: vi.fn(({ expectedCount }) =>
    Effect.succeed(
      Array.from({ length: expectedCount }, (_, i) => ({
        number: i + 1,
        status: "valid" as const,
        reason: "Sesuai CP."
      }))
    )
  ),
  generateDiscussion: vi.fn(),
  streamDiscussion: vi.fn(() => Stream.succeed(""))
}

function makeExamRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "exam-gen-1",
    userId: "test-user-id",
    title: "Bahasa Indonesia · Kelas 6 · Teks Narasi",
    subject: "bahasa_indonesia",
    grade: 6,
    difficulty: "sedang",
    topics: ["Teks Narasi"],
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
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides
  }
}

const VALID_BODY = {
  subject: "bahasa_indonesia",
  grade: 6,
  difficulty: "sedang",
  topics: ["Teks Narasi"],
  reviewMode: "fast",
  examType: "formatif"
}

function buildUnauthApp() {
  return buildHttpApiTestApp({ aiService: fakeAiService, authenticated: false })
}

function buildTestApp() {
  return buildHttpApiTestApp({ userId: "test-user-id", aiService: fakeAiService })
}

function mockGenerateDbSelects(opts: {
  examRow: Record<string, unknown>
  questionRows: ReadonlyArray<Record<string, unknown>>
  reviewMode?: "fast" | "slow"
}) {
  const reviewMode = opts.reviewMode ??
    (typeof opts.examRow["reviewMode"] === "string"
      ? (opts.examRow["reviewMode"] as "fast" | "slow")
      : "fast")

  let selectCount = 0
  ;(db.select as Mock).mockImplementation(() => {
    selectCount++
    if (reviewMode === "fast") {
      if (selectCount === 1) return makeChain([...opts.questionRows])
      if (selectCount === 2) return makeChain([opts.examRow])
      if (selectCount === 3) return makeChain([opts.examRow])
      return makeChain([...opts.questionRows])
    }
    if (selectCount === 1) return makeChain([opts.examRow])
    return makeChain([...opts.questionRows])
  })
}

export {
  buildExamPrompt,
  buildTestApp,
  buildUnauthApp,
  db,
  FAKE_AI_QUESTIONS,
  fakeAiService,
  fakeGenerateRawJson,
  makeChain,
  makeExamRow,
  makeFakeQuestion,
  makeQuestionRow,
  mockGenerateDbSelects,
  VALID_BODY
}
