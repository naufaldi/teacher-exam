import { Effect, Stream } from "effect"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { AiGenerationError } from "../../errors"
import type { AiService } from "../../services/AiService"

import { db } from "@teacher-exam/db"
import { makeChain, makeExamRow } from "./helpers"
import { buildHttpApiTestApp } from "./http-api-setup"

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ op: "eq", col, val })),
  and: vi.fn((...args) => ({ op: "and", args }))
}))

vi.mock("../../lib/exams-query", () => ({
  fetchExamWithQuestions: vi.fn(),
  toExam: vi.fn((row: unknown) => row)
}))

const FAKE_DISCUSSION_MD = `## 1. Soal pertama\n**Jawaban Benar: B**\n\nPenjelasan.\n\n**Tip:** Kunci.\n\n---`

function makeFakeAiService(opts: { discussion?: string; fail?: boolean } = {}): AiService {
  const md = opts.discussion ?? FAKE_DISCUSSION_MD
  return {
    generate: vi.fn(),
    validateCurriculum: vi.fn(),
    generateDiscussion: vi.fn(() =>
      opts.fail
        ? Effect.fail(new Error("AI error"))
        : Effect.succeed(md)
    ),
    streamDiscussion: opts.fail
      ? () => Stream.fail(new AiGenerationError({ cause: "AI error" }))
      : () => Stream.succeed(md)
  } as unknown as AiService
}

function buildTestApp(aiService: AiService) {
  return buildHttpApiTestApp({ userId: "test-user-id", aiService })
}

describe("POST /api/exams/:id/discussion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 404 when exam is not found", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp(makeFakeAiService())
    const res = await app.request("/api/exams/missing/discussion", { method: "POST" })
    expect(res.status).toBe(404)
  })

  it("returns 400 when exam is not final", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([makeExamRow({ status: "draft" })]))
    const app = buildTestApp(makeFakeAiService())
    const res = await app.request("/api/exams/exam-1/discussion", { method: "POST" })
    expect(res.status).toBe(400)
  })

  it("returns 409 when discussion already exists", async () => {
    ;(db.select as Mock).mockReturnValue(
      makeChain([makeExamRow({ status: "final", discussionMd: "existing" })])
    )
    const app = buildTestApp(makeFakeAiService())
    const res = await app.request("/api/exams/exam-1/discussion", { method: "POST" })
    expect(res.status).toBe(409)
  })
})
