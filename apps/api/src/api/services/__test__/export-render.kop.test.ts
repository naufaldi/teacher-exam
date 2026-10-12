import { brandExamId, brandUserId, type ExamWithQuestions } from "@teacher-exam/shared"
import { inflateRawSync } from "node:zlib"
import { describe, expect, it } from "vitest"
import { renderExamDocx } from "../export-docx.js"
import { renderExamHtml } from "../export-render.js"

const NOW = "2024-01-01T00:00:00.000Z"
const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
const SCHOOL = "SD Negeri 2 Menteng"
const ADDRESS = "Jl. Melati No. 12"

type HeaderKop = {
  name: string
  address: string
  logoDataUrl: string | null
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
    schoolName: "SD Lama",
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

function withKop(kop: HeaderKop) {
  return { ...makeExam(), kop }
}

describe("paper header kop", () => {
  it("prints the school name, the street address, and the logo data URL", () => {
    const html = renderExamHtml(
      withKop({ name: SCHOOL, address: ADDRESS, logoDataUrl: LOGO }),
      "soal"
    )
    expect(html).toContain(SCHOOL)
    expect(html).toContain(ADDRESS)
    expect(html).toContain(`<img class="logo" alt="" src="${LOGO}">`)
  })

  it("omits the img when the logo is null and still prints the address", () => {
    const html = renderExamHtml(
      withKop({ name: SCHOOL, address: ADDRESS, logoDataUrl: null }),
      "soal"
    )
    expect(html).toContain(SCHOOL)
    expect(html).toContain(ADDRESS)
    expect(html).not.toContain("<img")
  })

  it("omits the address line when the address is blank", () => {
    const html = renderExamHtml(
      withKop({ name: SCHOOL, address: "   ", logoDataUrl: null }),
      "soal"
    )
    expect(html).toContain(SCHOOL)
    expect(html).not.toContain("class=\"address\"")
    expect(html).not.toContain("<img")
  })

  it("prints the school name and address in the docx header and stores the logo", async () => {
    const bytes = await renderExamDocx(
      withKop({ name: SCHOOL, address: ADDRESS, logoDataUrl: LOGO }),
      "soal"
    )
    const xml = docxDocumentXml(bytes)
    expect(xml).toContain(SCHOOL)
    expect(xml).toContain(ADDRESS)
    expect(zipNames(bytes).join("\n")).toMatch(/word\/media\/.+\.png/)
  })

  it("prints one letter in html and docx when the choice text already has that letter", async () => {
    const exam = makeExam()
    const first = exam.questions[0]
    if (first === undefined || first._tag !== "mcq_single") throw new Error("fixture soal missing")
    const doubled = {
      ...exam,
      questions: [{
        ...first,
        options: {
          a: "a. kalimat penjelas",
          b: "b. gagasan utama",
          c: "c. kalimat tanya",
          d: "d. kalimat seru"
        }
      }]
    }
    const html = renderExamHtml(doubled, "soal")
    expect(html).toContain("<span class=\"opt-letter\">a.</span> <span>kalimat penjelas</span>")
    expect(html).not.toContain("a. a.")
    const xml = docxDocumentXml(await renderExamDocx(doubled, "soal")).replace(/<[^>]+>/g, "")
    expect(xml).toContain("kalimat penjelas")
    expect(xml).not.toMatch(/a\.\s*a\./)
  })

  it("omits the docx image when the logo is null", async () => {
    const bytes = await renderExamDocx(
      withKop({ name: SCHOOL, address: ADDRESS, logoDataUrl: null }),
      "soal"
    )
    expect(docxDocumentXml(bytes)).toContain(ADDRESS)
    expect(zipNames(bytes).some((name) => name.startsWith("word/media/"))).toBe(false)
  })
})

function zipNames(bytes: Uint8Array): Array<string> {
  const buf = Buffer.from(bytes)
  const names: Array<string> = []
  let offset = 0
  while (offset + 30 <= buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break
    const compSize = buf.readUInt32LE(offset + 18)
    const nameLen = buf.readUInt16LE(offset + 26)
    const extraLen = buf.readUInt16LE(offset + 28)
    names.push(buf.subarray(offset + 30, offset + 30 + nameLen).toString("utf8"))
    offset = offset + 30 + nameLen + extraLen + compSize
  }
  return names
}

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
