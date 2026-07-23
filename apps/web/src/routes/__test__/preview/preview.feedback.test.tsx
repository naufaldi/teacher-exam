import type { ExamPilotOutcome } from "@teacher-exam/shared"
import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Either } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NetworkClientError } from "../../../lib/api.js"
import { makeExamWithQuestions } from "../../../test/fixtures/exam.js"
import { mockExamsExport, mockFeedbackSetExamOutcome, previewTestCtx, renderPreviewPage } from "./setup.js"

const unansweredOutcome = {
  id: "outcome-1",
  examId: "exam-feedback",
  trigger: "export_pdf",
  readiness: null,
  firstExportAt: "2026-07-23T08:00:00.000Z",
  answeredAt: null,
  createdAt: "2026-07-23T08:00:00.000Z",
  updatedAt: "2026-07-23T08:00:00.000Z"
} as ExamPilotOutcome

beforeEach(() => {
  previewTestCtx.mockLoaderData = {
    ...makeExamWithQuestions(["Teks Narasi"]),
    id: unansweredOutcome.examId
  }
  mockExamsExport.mockResolvedValue(undefined)
  mockFeedbackSetExamOutcome.mockResolvedValue(Either.right(unansweredOutcome))
})

async function exportPdf() {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: "Unduh / Cetak" }))
  await user.click(await screen.findByRole("button", { name: "PDF" }))
}

describe("Preview teacher feedback flow", () => {
  it("prompts after a successful PDF export and submits readiness", async () => {
    renderPreviewPage()
    await exportPdf()

    expect(mockExamsExport).toHaveBeenCalledWith("exam-feedback", "pdf", "soal")
    expect(mockFeedbackSetExamOutcome).toHaveBeenCalledWith("exam-feedback", {
      trigger: "export_pdf",
      readiness: null
    })
    expect(
      await screen.findByRole("heading", {
        name: "Apakah lembar ini siap digunakan?"
      })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /ya, siap digunakan/i }))
    expect(mockFeedbackSetExamOutcome).toHaveBeenLastCalledWith("exam-feedback", {
      trigger: "export_pdf",
      readiness: "ready"
    })
  })

  it("does not prompt when export fails", async () => {
    mockExamsExport.mockRejectedValueOnce(new Error("export failed"))
    renderPreviewPage()
    await exportPdf()
    expect(mockFeedbackSetExamOutcome).not.toHaveBeenCalled()
    expect(screen.queryByText("Apakah lembar ini siap digunakan?")).not.toBeInTheDocument()
  })

  it("suppresses the prompt when the outcome already has readiness", async () => {
    mockFeedbackSetExamOutcome.mockResolvedValueOnce(
      Either.right({ ...unansweredOutcome, readiness: "ready", answeredAt: unansweredOutcome.updatedAt })
    )
    renderPreviewPage()
    await exportPdf()
    expect(screen.queryByText("Apakah lembar ini siap digunakan?")).not.toBeInTheDocument()
  })

  it("does not let feedback failure affect a completed export", async () => {
    mockFeedbackSetExamOutcome.mockResolvedValueOnce(
      Either.left(new NetworkClientError({ message: "offline" }))
    )
    renderPreviewPage()
    await exportPdf()
    expect(mockExamsExport).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Apakah lembar ini siap digunakan?")).not.toBeInTheDocument()
  })

  it("records print intent while opening the browser print flow", async () => {
    vi.useFakeTimers()
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {})
    renderPreviewPage()
    fireEvent.click(screen.getByRole("button", { name: "Cetak Soal" }))
    vi.advanceTimersByTime(50)

    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(mockFeedbackSetExamOutcome).toHaveBeenCalledWith("exam-feedback", {
      trigger: "print_intent",
      readiness: null
    })
  })
})
