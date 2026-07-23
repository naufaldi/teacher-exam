import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockApiResolvedValueOnce } from "../../../lib/api-test-utils.js"
import { api } from "../../../lib/api.js"
import { makeExamWithQuestions } from "../../../test/fixtures/exam.js"
import { SheetPreviewDialog } from "../sheet-preview-dialog.js"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate
}))

describe("SheetPreviewDialog", () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.restoreAllMocks()
  })

  it("shows accepted questions and footer actions", async () => {
    const exam = makeExamWithQuestions(["Teks"])
    const getSpy = vi.spyOn(api.exams, "get")
    mockApiResolvedValueOnce(getSpy, exam)

    render(
      <SheetPreviewDialog
        examId={exam.id}
        title={exam.title}
        open
        onClose={() => {}}
      />
    )

    expect(await screen.findByText("Soal 1")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Tutup" }).length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Buka halaman cetak" })).toBeInTheDocument()
  })

  it("provides an accessible description for the dialog", async () => {
    const exam = makeExamWithQuestions(["Teks"])
    const getSpy = vi.spyOn(api.exams, "get")
    mockApiResolvedValueOnce(getSpy, exam)

    render(
      <SheetPreviewDialog examId={exam.id} open onClose={() => {}} />
    )

    const dialog = screen.getByRole("dialog")
    const descriptionId = dialog.getAttribute("aria-describedby")

    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(descriptionId ?? "")).toHaveTextContent(
      "Pratinjau soal yang sudah diterima."
    )
  })

  it("navigates to preview page when Buka halaman cetak clicked", async () => {
    const user = userEvent.setup()
    const exam = makeExamWithQuestions(["Teks"], { id: "exam-print" })
    const getSpy = vi.spyOn(api.exams, "get")
    mockApiResolvedValueOnce(getSpy, exam)

    const onClose = vi.fn()
    render(
      <SheetPreviewDialog examId={exam.id} open onClose={onClose} />
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Buka halaman cetak" })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Buka halaman cetak" }))

    expect(onClose).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/preview",
      search: { examId: exam.id }
    })
  })

  it("hides print footer when showPrintFooter is false", async () => {
    const exam = makeExamWithQuestions(["Teks"], { id: "exam-dialog-1" })
    const getSpy = vi.spyOn(api.exams, "get")
    mockApiResolvedValueOnce(getSpy, exam)

    render(
      <SheetPreviewDialog
        examId={exam.id}
        open
        onClose={() => {}}
        showPrintFooter={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Soal 1")).toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: "Buka halaman cetak" })).not.toBeInTheDocument()
  })
})
