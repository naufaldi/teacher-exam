import { QuestionSchema } from "@teacher-exam/shared"
import { vi } from "vitest"

import { db } from "@teacher-exam/db"
import { makeChain, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

vi.mock("drizzle-orm", async () => {
  const { createDrizzleOrmMock } = await import("../drizzle-mock.js")
  return createDrizzleOrmMock()
})

const NOW = "2024-01-01T00:00:00.000Z"

const makeExamRow = (overrides: Record<string, unknown> = {}) => ({
  id: "exam-1",
  userId: "test-user-id",
  title: "Test Exam",
  subject: "bahasa_indonesia",
  grade: 5,
  difficulty: "mudah",
  topics: ["topic-a"],
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
  isPublic: false,
  publicShareSlug: null,
  publishedAt: null,
  createdAt: new Date(NOW),
  updatedAt: new Date(NOW),
  ...overrides
})

function buildTestApp(opts: { aiService?: import("../../services/AiService.js").AiService } = {}) {
  return buildHttpApiTestApp({
    userId: "test-user-id",
    ...(opts.aiService !== undefined ? { aiService: opts.aiService } : {})
  })
}

export { buildTestApp, db, makeChain, makeExamRow, makeQuestionRow, NOW, QuestionSchema }
