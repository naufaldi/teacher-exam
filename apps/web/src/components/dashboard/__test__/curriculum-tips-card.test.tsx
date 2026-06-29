import type { CurriculumTipsResponse } from "@teacher-exam/shared"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CurriculumTipsCard } from "../curriculum-tips-card.js"

const TIPS: CurriculumTipsResponse = {
  subject: "matematika",
  grade: 5,
  phase: "C",
  subjectLabel: "Matematika",
  title: "Capaian Pembelajaran Matematika",
  intro: "Sistem memakai Capaian Pembelajaran berikut secara otomatis saat Anda memilih mapel Matematika.",
  elements: [
    { label: "Bilangan.", description: "Memahami bilangan cacah dan operasi hitung." },
    { label: "Aljabar.", description: "Mengenali pola dan kalimat matematika." }
  ],
  footer: "CP identik untuk Kelas 5 dan 6 — tidak perlu input manual.",
  source: "corpus"
}

describe("CurriculumTipsCard", () => {
  it("renders dynamic tips from API response", () => {
    render(<CurriculumTipsCard tips={TIPS} />)

    expect(screen.getByText(/Capaian Pembelajaran · Fase C/i)).toBeInTheDocument()
    expect(screen.getByText("Capaian Pembelajaran Matematika")).toBeInTheDocument()
    expect(screen.getByText(/Bilangan\./)).toBeInTheDocument()
    expect(screen.queryByText(/Empat elemen Bahasa Indonesia/i)).not.toBeInTheDocument()
  })
})
