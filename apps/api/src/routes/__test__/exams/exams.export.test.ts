import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { ExportService } from "../../../api/services/export-service.js"
import { makeChain, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ op: "eq", col, val })),
  and: vi.fn((...args) => ({ op: "and", args }))
}))

const NOW = "2024-01-01T00:00:00.000Z"

function makeExamRow(overrides: Record<string, unknown> = {}) {
  return {
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
  }
}

/** Fake export service that returns deterministic bytes without launching a browser. */
function makeFakeExportServiceLayer() {
  const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // "%PDF-1.4"
  const fakeDocx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]) // "PK.."
  return Layer.succeed(ExportService, {
    exportExamPdf: () => Effect.succeed(fakePdf),
    exportExamDocx: () => Effect.succeed(fakeDocx)
  })
}

function buildTestApp() {
  return buildHttpApiTestApp({
    userId: "test-user-id",
    exportServiceLayer: makeFakeExportServiceLayer()
  })
}

describe("GET /api/exams/:id/export", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    const app = buildHttpApiTestApp({
      authenticated: false,
      exportServiceLayer: makeFakeExportServiceLayer()
    })
    const res = await app.request("/api/exams/exam-1/export?format=pdf&variant=soal")
    expect(res.status).toBe(401)
  })

  it("returns 404 for a missing exam", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp()
    const res = await app.request("/api/exams/no-exam/export?format=pdf&variant=soal")
    expect(res.status).toBe(404)
  })

  it("returns 400 when the exam is still a draft", async () => {
    const examRow = makeExamRow({ status: "draft" })
    const questionRow = makeQuestionRow({ status: "accepted" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow]) // ownership + status check
      return makeChain([questionRow]) // questions
    })

    const app = buildTestApp()
    const res = await app.request("/api/exams/exam-1/export?format=pdf&variant=soal")
    expect(res.status).toBe(400)
  })

  it("returns 200 with application/pdf for a final exam (pdf format)", async () => {
    const examRow = makeExamRow({ status: "final" })
    const questionRow = makeQuestionRow({ status: "accepted" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow]) // ownership + status
      return makeChain([questionRow]) // questions
    })

    const app = buildTestApp()
    const res = await app.request("/api/exams/exam-1/export?format=pdf&variant=soal")
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/pdf")
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename=".+\.pdf"/i)
    const buf = await res.arrayBuffer()
    const head = new Uint8Array(buf).slice(0, 4)
    expect(String.fromCharCode(...head)).toBe("%PDF")
  })

  it("returns 200 with the docx content-type for a final exam (docx format)", async () => {
    const examRow = makeExamRow({ status: "final" })
    const questionRow = makeQuestionRow({ status: "accepted" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      return makeChain([questionRow])
    })

    const app = buildTestApp()
    const res = await app.request("/api/exams/exam-1/export?format=docx&variant=kunci")
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toMatch(/wordprocessingml\.document/i)
    expect(res.headers.get("content-disposition")).toMatch(/\.docx/i)
  })
})

describe("GET /api/public/exams/:slug/export", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 404 when there is no matching public exam", async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildHttpApiTestApp({
      authenticated: false,
      exportServiceLayer: makeFakeExportServiceLayer()
    })
    const res = await app.request("/api/public/exams/missing-slug/export?format=pdf&variant=soal")
    expect(res.status).toBe(404)
  })

  it("returns 200 with application/pdf for a published public exam", async () => {
    const examRow = makeExamRow({
      isPublic: true,
      publicShareSlug: "share-abc",
      publishedAt: new Date("2026-05-08T09:00:00.000Z"),
      status: "final"
    })
    const questionRow = makeQuestionRow({ examId: "exam-1", status: "accepted" })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      return makeChain([questionRow])
    })

    const app = buildHttpApiTestApp({
      authenticated: false,
      exportServiceLayer: makeFakeExportServiceLayer()
    })
    const res = await app.request("/api/public/exams/share-abc/export?format=pdf&variant=soal")
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/pdf")
  })
})
