import { brandExamId, brandUserId, type ExamWithQuestions } from "@teacher-exam/shared"
import { Effect } from "effect"
import fs from "node:fs"
import { describe, expect, it } from "vitest"
import { renderExamHtml } from "../export-render.js"
import { ExportService, ExportServiceLive } from "../export-service.js"

const NOW = "2024-01-01T00:00:00.000Z"

/**
 * Playwright ships the chromium module whether or not the browser binary is
 * installed. The PDF path needs the actual binary, so we resolve its
 * executable path and confirm it exists on disk. CI runners without
 * `playwright install` skip the PDF test; local dev and any runner with the
 * browser installed run it for real.
 */
async function chromiumBinaryAvailable(): Promise<boolean> {
  try {
    const { chromium } = await import("playwright")
    return fs.existsSync(chromium.executablePath())
  } catch {
    return false
  }
}

function makeExam(): ExamWithQuestions {
  return {
    id: brandExamId("exam-export-1"),
    userId: brandUserId("test-user-id"),
    title: "Bahasa Indonesia · Kelas 6 · Teks Narasi",
    subject: "bahasa_indonesia",
    grade: 6,
    difficulty: "sedang",
    topics: ["Teks Narasi"],
    reviewMode: "fast",
    status: "final",
    schoolName: "SD Nusantara",
    academicYear: "2025/2026",
    examType: "formatif",
    examDate: "23 April 2026",
    durationMinutes: 60,
    instructions: "Pilih jawaban yang benar.",
    classContext: null,
    discussionMd: null,
    createdAt: NOW,
    updatedAt: NOW,
    questions: [
      {
        _tag: "mcq_single",
        id: "q-1" as never,
        examId: brandExamId("exam-export-1"),
        number: 1,
        text: "Berapakah hasil dari 2 + 2?",
        options: { a: "3", b: "4", c: "5", d: "6" },
        correct: "b",
        topic: "Teks Narasi",
        difficulty: "mudah",
        status: "accepted",
        validationStatus: null,
        validationReason: null,
        createdAt: NOW
      }
    ]
  }
}

describe("renderExamHtml", () => {
  it("produces an HTML document containing the exam title and question text", () => {
    const html = renderExamHtml(makeExam(), "soal")
    expect(html).toContain("<!DOCTYPE html>")
    expect(html).toContain("Bahasa Indonesia")
    expect(html).toContain("2 + 2")
  })

  it("renders the kunci (answer key) variant with the correct answer", () => {
    const html = renderExamHtml(makeExam(), "kunci")
    expect(html).toContain("KUNCI JAWABAN")
    expect(html).toContain("B")
  })

  it("renders the pembahasan variant heading even without discussion markdown", () => {
    const html = renderExamHtml(makeExam(), "pembahasan")
    expect(html).toContain("PEMBAHASAN")
  })
})

describe("ExportService", () => {
  it("exportExamDocx returns a valid Office Open XML (zip) document", async () => {
    const layer = ExportServiceLive
    const program = Effect.gen(function*() {
      const service = yield* ExportService
      return yield* service.exportExamDocx(makeExam(), { variant: "soal" })
    })
    const bytes = await Effect.runPromise(program.pipe(Effect.provide(layer)))
    expect(bytes.length).toBeGreaterThan(0)
    // DOCX is a ZIP archive — local file header magic bytes are "PK\x03\x04"
    expect(bytes[0]).toBe(0x50) // P
    expect(bytes[1]).toBe(0x4b) // K
  })

  it("exportExamPdf returns bytes beginning with the PDF signature", async (ctx) => {
    if (!(await chromiumBinaryAvailable())) {
      ctx.skip()
      return
    }
    const layer = ExportServiceLive
    const program = Effect.gen(function*() {
      const service = yield* ExportService
      return yield* service.exportExamPdf(makeExam(), { variant: "soal" })
    })
    const bytes = await Effect.runPromise(program.pipe(Effect.provide(layer)))
    expect(bytes.length).toBeGreaterThan(0)
    const head = String.fromCharCode(...Array.from(bytes.slice(0, 4)))
    expect(head).toBe("%PDF")
  })
})
