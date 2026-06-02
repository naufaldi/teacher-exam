import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { examDraftStore } from "../../../lib/exam-draft-store.js"
import { makeMcqSingle } from "../../../test/fixtures/exam.js"
import { renderPreviewPage } from "./setup.js"

function seedAcceptedQuestions(count: number) {
  const questions = Array.from({ length: count }, (_, i) => makeMcqSingle(i + 1))
  examDraftStore.setQuestions(questions)
  examDraftStore.setReviewMode("fast")
  examDraftStore.setConfig({
    subject: "bahasa_indonesia",
    grade: 5,
    topic: "Teks Narasi",
    examType: "latihan"
  })
  examDraftStore.setMetadata({
    schoolName: "SD Nusantara",
    academicYear: "2025/2026",
    examDate: "23 April 2026",
    durationMinutes: 60,
    instructions: "Pilih jawaban yang benar."
  })
}

describe("PreviewPage bank status", () => {
  it("shows one auto-save summary instead of per-question Tersimpan badges", () => {
    seedAcceptedQuestions(5)
    renderPreviewPage()

    expect(screen.getByText(/5 soal tersimpan otomatis di/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /bank soal/i })).toHaveAttribute("href", "/bank-soal")
    expect(screen.queryByText("Simpan ke bank:")).not.toBeInTheDocument()
    expect(screen.queryAllByText("Tersimpan")).toHaveLength(0)
  })

  it("hides bank status on tabs that do not show soal", async () => {
    seedAcceptedQuestions(5)
    renderPreviewPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole("tab", { name: /kunci/i }))

    expect(screen.queryByText(/5 soal tersimpan otomatis di/i)).not.toBeInTheDocument()
  })
})
