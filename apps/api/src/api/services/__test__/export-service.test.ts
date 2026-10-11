import { brandExamId, brandUserId, type ExamWithQuestions, type ExportVariant } from "@teacher-exam/shared"
import { Effect } from "effect"
import fs from "node:fs"
import { inflateRawSync } from "node:zlib"
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

  it("prints a soal image in grayscale and keeps the geometry figure", () => {
    const exam = makeExam()
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#336699"/></svg>`
    const question = exam.questions[0]
    if (question === undefined) throw new Error("missing question")
    exam.questions = [{
      ...question,
      figure: { type: "circle", radius: 7, label: "r = 7 cm" },
      image: { source: "svg", svg }
    }]
    const html = renderExamHtml(exam, "soal")
    expect(html).toContain("filter:grayscale(1)")
    expect(html).toContain("<rect")
    expect(html).toContain("circle")
  })
})

function docxDocumentXml(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes)
  let offset = 0
  while (offset + 30 <= buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break
    const method = buf.readUInt16LE(offset + 8)
    const compSize = buf.readUInt32LE(offset + 18)
    const nameLen = buf.readUInt16LE(offset + 26)
    const extraLen = buf.readUInt16LE(offset + 28)
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString("utf8")
    const dataStart = offset + 30 + nameLen + extraLen
    const compressed = buf.subarray(dataStart, dataStart + compSize)
    if (name === "word/document.xml") {
      const raw = method === 0 ? compressed : inflateRawSync(compressed)
      return raw.toString("utf8")
    }
    offset = dataStart + compSize
  }
  throw new Error("word/document.xml missing")
}

async function exportDocxXml(variant: ExportVariant): Promise<string> {
  const exam = makeExam()
  exam.questions = [
    exam.questions[0]!,
    {
      ...exam.questions[0]!,
      id: "q-2" as never,
      number: 2,
      text: "Mana yang lebih panjang?",
      correct: "c"
    }
  ]
  exam.questions[0] = {
    ...exam.questions[0]!,
    text: "Hitung $3 + 3$."
  }
  const program = Effect.gen(function*() {
    const service = yield* ExportService
    return yield* service.exportExamDocx(exam, { variant })
  })
  const bytes = await Effect.runPromise(program.pipe(Effect.provide(ExportServiceLive)))
  return docxDocumentXml(bytes)
}

describe("kisi-kisi and kartu soal docx", () => {
  it("puts each question stem on its own kisi-kisi row", async () => {
    const xml = await exportDocxXml("kisi_kisi")
    expect(xml).toContain("KISI-KISI")
    expect(xml).toContain("Hitung 3 + 3.")
    expect(xml).not.toContain("$")
    expect(xml).toContain("Mana yang lebih panjang?")
    expect(xml).toContain("Pilihan ganda")
    expect(xml).toContain("mudah")
    expect(xml).toContain("Teks Narasi")
    expect(xml.match(/<w:tr[\s>]/g)?.length).toBe(3)
  })

  it("puts the stem and answer key on each kartu soal row", async () => {
    const xml = await exportDocxXml("kartu_soal")
    expect(xml).toContain("KARTU SOAL")
    expect(xml).toContain("Hitung 3 + 3.")
    expect(xml).toContain("Mana yang lebih panjang?")
    expect(xml).toContain(">B</w:t>")
    expect(xml).toContain(">C</w:t>")
    expect(xml.match(/<w:tr[\s>]/g)?.length).toBe(3)
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
