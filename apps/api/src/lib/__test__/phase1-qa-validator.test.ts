import type { Question } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import { validatePhase1Question } from "../phase1-qa-validator"

const BASE: Question = {
  _tag: "mcq_single",
  id: "q1",
  examId: "e1",
  number: 1,
  text: "Which activity do you do every morning before school?",
  topic: "Daily Activities",
  difficulty: "sedang",
  status: "pending",
  validationStatus: null,
  validationReason: null,
  options: {
    a: "Brush teeth",
    b: "Cook dinner",
    c: "Sleep late",
    d: "Watch TV at night"
  },
  correct: "a",
  createdAt: new Date().toISOString()
}

describe("validatePhase1Question", () => {
  it("passes a valid Bahasa Inggris MCQ with English stem and options", () => {
    const result = validatePhase1Question(BASE, "bahasa_inggris")
    expect(result.pass).toBe(true)
  })

  it("fails Bahasa Inggris when stem is mostly Indonesian", () => {
    const result = validatePhase1Question(
      {
        ...BASE,
        text: "Manakah kegiatan yang dilakukan setiap pagi sebelum sekolah?",
        options: {
          a: "Sikat gigi",
          b: "Masak malam",
          c: "Tidur siang",
          d: "Menonton TV malam"
        }
      },
      "bahasa_inggris"
    )
    expect(result.pass).toBe(false)
    expect(result.reason).toMatch(/English/i)
  })

  it("passes a valid IPAS MCQ with Indonesian stem", () => {
    const result = validatePhase1Question(
      {
        ...BASE,
        text: "Manakah sumber cahaya alami yang paling terang di siang hari?",
        topic: "Cahaya dan Bunyi",
        options: {
          a: "Matahari",
          b: "Bulan",
          c: "Lilin",
          d: "Senter"
        }
      },
      "ipas"
    )
    expect(result.pass).toBe(true)
  })

  it("fails when options are not distinct", () => {
    const result = validatePhase1Question(
      {
        ...BASE,
        options: { a: "Same", b: "Same", c: "Other", d: "Another" }
      },
      "bahasa_inggris"
    )
    expect(result.pass).toBe(false)
    expect(result.reason).toMatch(/distinct/i)
  })

  it("fails generationFailed placeholder questions", () => {
    const result = validatePhase1Question(
      { ...BASE, generationFailed: true, text: "Soal belum berhasil dibuat — gunakan Regenerate untuk membuat ulang." },
      "ipas"
    )
    expect(result.pass).toBe(false)
    expect(result.reason).toMatch(/generation/i)
  })
})
