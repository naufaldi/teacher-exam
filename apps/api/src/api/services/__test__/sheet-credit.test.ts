import { brandExamId, brandUserId, type ExamWithQuestions } from "@teacher-exam/shared"
import { inflateRawSync } from "node:zlib"
import { describe, expect, it } from "vitest"
import { renderExamDocx } from "../export-docx.js"
import { renderExamHtml } from "../export-render.js"

const NOW = "2024-01-01T00:00:00.000Z"
const CREDIT_SENTENCE = "Dibuat dengan Ujian Sekolah"
const CREDIT_URL = "https://ujian-sekolah.naufaldi.com"
const CREDIT_LINK = `<a href="${CREDIT_URL}">${CREDIT_SENTENCE}</a>`

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

function docxPart(bytes: Uint8Array, partName: string): string {
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
    if (name === partName) {
      const raw = method === 0 ? compressed : inflateRawSync(compressed)
      return raw.toString("utf8")
    }
    offset = dataStart + compSize
  }
  throw new Error(`${partName} missing`)
}

function expectHtmlCredit(html: string, marker: string): void {
  const markerAt = html.indexOf(marker)
  const creditAt = html.indexOf(CREDIT_LINK)
  const bodyClose = html.lastIndexOf("</body>")
  expect(markerAt).toBeGreaterThan(0)
  expect(creditAt).toBeGreaterThan(markerAt)
  expect(creditAt).toBeLessThan(bodyClose)
}

describe("sheet credit footer", () => {
  it("links the product sentence on the soal HTML sheet", () => {
    const html = renderExamHtml(makeExam(), "soal")
    expectHtmlCredit(html, "2 + 2")
  })

  it("links the product sentence on the kisi-kisi HTML sheet", () => {
    const html = renderExamHtml(makeExam(), "kisi_kisi")
    expectHtmlCredit(html, "KISI-KISI")
  })

  it("writes the product sentence into the soal docx", async () => {
    const bytes = await renderExamDocx(makeExam(), "soal")
    const xml = docxPart(bytes, "word/document.xml")
    const rels = docxPart(bytes, "word/_rels/document.xml.rels")
    expect(xml).toContain(CREDIT_SENTENCE)
    expect(rels).toContain(CREDIT_URL)
    expect(xml.indexOf(CREDIT_SENTENCE)).toBeGreaterThan(xml.indexOf("2 + 2"))
  })

  it("writes the product sentence into the kartu soal docx", async () => {
    const bytes = await renderExamDocx(makeExam(), "kartu_soal")
    const xml = docxPart(bytes, "word/document.xml")
    expect(xml).toContain("KARTU SOAL")
    expect(xml.indexOf(CREDIT_SENTENCE)).toBeGreaterThan(xml.indexOf("KARTU SOAL"))
  })
})
