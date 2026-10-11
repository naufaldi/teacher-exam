import { brandExamId, brandUserId, type ExamWithQuestions } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
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
})
