import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"
import { TestCurriculumLayer } from "../../../api/services/curriculum-service.js"
import { DbClient } from "../../../api/services/db.js"
import { ObjectStorage } from "../../../api/services/object-storage.js"
import { TestSqlLayer } from "../../../api/services/test-db.js"
import { generateExam } from "../../../lib/ai-generate.js"
import { extractPdfText } from "../../../lib/pdf-text-extract.js"
import * as promptModule from "../../../lib/prompt.js"
import { chunkText } from "../../../lib/retrieval/chunk-text.js"
import { embedText } from "../../../lib/retrieval/embed.js"
import { resolveRetrievalContext } from "../../../lib/retrieval/retrieval-service.js"
import type { AiService, GeneratedQuestion } from "../../../services/AiService.js"
import { makeChain, makeExamRow, makeQuestionRow } from "../helpers.js"
import { buildHttpApiTestApp } from "../http-api-setup.js"

vi.mock("drizzle-orm", async () => {
  const { createDrizzleOrmMock } = await import("../drizzle-mock.js")
  return createDrizzleOrmMock()
})

const fixturePath = join(
  fileURLToPath(new URL("../../../__test__/fixtures/sample-worksheet.pdf", import.meta.url))
)
const pdfBytes = readFileSync(fixturePath)
const pdfUploadId = "550e8400-e29b-41d4-a716-446655440000"
const userId = "test-user-id"
const storageKey = `documents/${userId}/${pdfUploadId}/original.pdf`
const freeTopic = "Ekosistem dan pencemaran lingkungan"

const PDF_GURU_INPUT = {
  sourceMode: "pdf_guru" as const,
  subjectLabel: "IPAS",
  grade: 6,
  difficulty: "sedang" as const,
  topics: ["Ekosistem"],
  freeTopic,
  pdfUploadId,
  reviewMode: "fast" as const,
  examType: "formatif" as const
}

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

async function buildFixtureChunkRows(docId: string) {
  const { text } = await extractPdfText(pdfBytes)
  const chunks = chunkText(text, { source: "teacher_pdf", docId })
  return chunks.map((chunk, index) => ({
    id: `chunk-${index}`,
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: [...embedText(chunk.content)]
  }))
}

const readyUploadRow = {
  id: pdfUploadId,
  userId,
  fileName: "sample-worksheet.pdf",
  fileSize: pdfBytes.length,
  storageKey,
  status: "ready" as const,
  uploadedAt: new Date("2026-06-30T00:00:00.000Z"),
  readyAt: new Date("2026-06-30T00:00:01.000Z"),
  deletedAt: null,
  pageCount: 1,
  extractedText: null,
  errorMessage: null
}

function buildObjectStorageLayer() {
  return Layer.succeed(ObjectStorage, {
    putObject: () => Effect.void,
    getObject: () => Effect.succeed(pdfBytes),
    deleteObject: () => Effect.void
  })
}

function mockPdfGuruDbSelects(opts: {
  chunkRows: ReadonlyArray<Record<string, unknown>>
  examRow: Record<string, unknown>
  questionRows: ReadonlyArray<Record<string, unknown>>
}) {
  let selectCount = 0
  ;(db.select as Mock).mockImplementation(() => {
    selectCount++
    if (selectCount <= 3) return makeChain([...opts.chunkRows])
    if (selectCount === 4) return makeChain([readyUploadRow])
    if (selectCount === 5) return makeChain([opts.examRow])
    return makeChain([...opts.questionRows])
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(fakeAiService.generateRaw as Mock).mockReturnValue(
    Effect.succeed(JSON.stringify(FAKE_AI_QUESTIONS))
  )
  ;(db.insert as Mock).mockReturnValue(makeChain(undefined))
  ;(db.update as Mock).mockReturnValue(makeChain(undefined))
})

describe("pdf_guru integration — resolveRetrievalContext", () => {
  it("retrieves fixture PDF materi containing ekosistem", async () => {
    const chunkRows = await buildFixtureChunkRows(pdfUploadId)
    ;(db.select as Mock).mockReturnValue(makeChain(chunkRows))

    const result = await Effect.runPromise(
      resolveRetrievalContext({
        sourceMode: "pdf_guru",
        subject: "",
        grade: 6,
        topics: ["Ekosistem"],
        freeTopic,
        pdfUploadId
      }).pipe(
        Effect.provide(Layer.mergeAll(
          Layer.succeed(DbClient, db as never),
          TestSqlLayer,
          TestCurriculumLayer()
        ))
      )
    )

    expect(result.curriculumText.toLowerCase()).toContain("ekosistem")
    expect(result.curriculumText.trim().length).toBeGreaterThanOrEqual(50)
    expect(result.retrievalTrace.length).toBeGreaterThan(0)
  })
})

describe("pdf_guru integration — generateExam", () => {
  it("completes with success using fixture-derived retrieval", async () => {
    const chunkRows = await buildFixtureChunkRows(pdfUploadId)
    const examRow = makeExamRow({
      id: "exam-pdf-guru-1",
      subject: null,
      subjectLabel: "IPAS",
      grade: 6,
      topics: ["Ekosistem"],
      sourceMode: "pdf_guru",
      pdfUploadId,
      freeTopic
    })
    const questionRows = Array.from(
      { length: 20 },
      (_, i) => makeQuestionRow({ id: `q-${i + 1}`, examId: "exam-pdf-guru-1", number: i + 1 })
    )
    mockPdfGuruDbSelects({ chunkRows, examRow, questionRows })

    const buildExamPromptSpy = vi.spyOn(promptModule, "buildExamPrompt")

    const result = await Effect.runPromise(
      generateExam(userId, PDF_GURU_INPUT, fakeAiService).pipe(
        Effect.provide(Layer.mergeAll(
          Layer.succeed(DbClient, db as never),
          TestSqlLayer,
          TestCurriculumLayer(),
          buildObjectStorageLayer()
        ))
      )
    )

    expect(result._tag).toBe("success")
    if (result._tag === "success") {
      expect(result.body.subjectLabel).toBe("IPAS")
      expect(result.body.subject).toBeNull()
      expect(result.body.questions).toHaveLength(20)
    }

    expect(buildExamPromptSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceMode: "pdf_guru",
        subjectLabel: "IPAS",
        curriculumText: expect.stringMatching(/ekosistem/i)
      })
    )

    buildExamPromptSpy.mockRestore()
  })
})

describe("POST /api/ai/generate — pdf_guru HTTP smoke", () => {
  it("returns 201 and persists free-text mapel with null subject", async () => {
    const chunkRows = await buildFixtureChunkRows(pdfUploadId)
    const examRow = makeExamRow({
      id: "exam-pdf-guru-http",
      subject: null,
      subjectLabel: "IPAS",
      grade: 6,
      topics: ["Ekosistem"],
      sourceMode: "pdf_guru",
      pdfUploadId,
      freeTopic
    })
    const questionRows = Array.from(
      { length: 20 },
      (_, i) => makeQuestionRow({ id: `q-http-${i + 1}`, examId: "exam-pdf-guru-http", number: i + 1 })
    )
    mockPdfGuruDbSelects({ chunkRows, examRow, questionRows })

    const uploadRoot = process.env["UPLOAD_DIR"]?.trim() || "./uploads"
    const uploadPath = join(uploadRoot, storageKey)
    mkdirSync(dirname(uploadPath), { recursive: true })
    writeFileSync(uploadPath, pdfBytes)

    const insertChain = makeChain(undefined)
    ;(db.insert as Mock).mockReturnValue(insertChain)

    const app = buildHttpApiTestApp({ userId, aiService: fakeAiService })
    const res = await app.request("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(PDF_GURU_INPUT)
    })

    if (res.status !== 201) {
      throw new Error(`expected 201, got ${res.status}: ${await res.text()}`)
    }

    const json = await res.json() as { subject: string | null; subjectLabel: string | null }
    expect(json.subject).toBeNull()
    expect(json.subjectLabel).toBe("IPAS")

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: null,
        subjectLabel: "IPAS",
        sourceMode: "pdf_guru",
        pdfUploadId
      })
    )
  })
})
