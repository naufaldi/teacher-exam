import type { BankQuestion } from "@teacher-exam/shared"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { BankQuestionPreviewDialog } from "../bank-question-preview-dialog.js"

const sampleQuestion: BankQuestion = {
  id: "bank-1" as BankQuestion["id"],
  questionId: "q-1" as BankQuestion["questionId"],
  userId: "user-1" as BankQuestion["userId"],
  subject: "ipas",
  grade: 5,
  topics: ["Energi"],
  difficulty: "sedang",
  type: "mcq_single",
  payload: {},
  isPublic: true,
  usageCount: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  text: "Apa itu energi?",
  optionA: "Sumber daya alam",
  optionB: "Cuaca",
  optionC: "Angin",
  optionD: "Hujan",
  correctAnswer: "a"
}

vi.mock("../../math-text.js", () => ({
  MathText: ({ text }: { text: string }) => <span>{text}</span>
}))

describe("BankQuestionPreviewDialog", () => {
  it("renders stem, options, and answer key when open", () => {
    render(
      <BankQuestionPreviewDialog
        item={sampleQuestion}
        open
        onClose={() => undefined}
      />
    )

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Pratinjau soal")).toBeInTheDocument()
    expect(screen.queryByText("Pratinjau tampilan guru")).not.toBeInTheDocument()
    expect(screen.getByText("Apa itu energi?")).toBeInTheDocument()
    expect(screen.getByText("Sumber daya alam")).toBeInTheDocument()
    expect(screen.getByText("Kunci A")).toBeInTheDocument()
    expect(screen.getByTestId("bank-readonly-option-a")).toHaveClass("bg-success-bg")
    expect(screen.getByText(/Publik/i)).toBeInTheDocument()
  })

  it("renders nothing when item is null", () => {
    const { container } = render(
      <BankQuestionPreviewDialog item={null} open onClose={() => undefined} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
