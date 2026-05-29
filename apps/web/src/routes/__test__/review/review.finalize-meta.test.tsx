import type { ExamWithQuestions } from "@teacher-exam/shared"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { mockApiSpyResolvedValue } from "../../../lib/api-test-utils.js"
import { examDraftStore } from "../../../lib/exam-draft-store.js"
import { makeExamWithCompleteMetadata, makeExamWithQuestions } from "./fixtures.js"
import {
  getLoader,
  mockApiResolvedValueOnce,
  mockExamsFinalize,
  mockExamsGet,
  mockExamsPatch,
  mockNavigate,
  mockQuestionsPatch,
  mockToast,
  renderReviewPage,
  setReviewSearch
} from "./setup.js"

test("Nama Sekolah onBlur PATCHes exam with schoolName only", async () => {
  const examsPatchSpy = mockApiSpyResolvedValue(mockExamsPatch, {} as never)
  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions("E"))
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  const input = screen.getByLabelText(/nama sekolah/i)
  await userEvent.clear(input)
  await userEvent.type(input, "SD Negeri 1")
  fireEvent.blur(input)
  await waitFor(() => {
    expect(examsPatchSpy).toHaveBeenCalledWith("E", { schoolName: "SD Negeri 1" })
  })
  examsPatchSpy.mockRestore()
})

test("persistMetaField skips PATCH when examId is undefined", async () => {
  const examsPatchSpy = mockApiSpyResolvedValue(mockExamsPatch, {} as never)
  setReviewSearch({ mode: "fast" })
  examDraftStore.reset()
  renderReviewPage()

  const input = screen.getByLabelText(/nama sekolah/i)
  await userEvent.clear(input)
  await userEvent.type(input, "SD Negeri 2")
  fireEvent.blur(input)

  await new Promise((r) => setTimeout(r, 50))
  expect(examsPatchSpy).not.toHaveBeenCalled()
  examsPatchSpy.mockRestore()
})

test("persistMetaField skips PATCH when Durasi value is NaN", async () => {
  const examsPatchSpy = mockApiSpyResolvedValue(mockExamsPatch, {} as never)
  setReviewSearch({ mode: "fast", examId: "E2" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions("E2"))
  await getLoader()({ deps: { examId: "E2" } })
  renderReviewPage()

  const input = screen.getByLabelText(/durasi/i) as HTMLInputElement
  Object.defineProperty(input, "value", { configurable: true, writable: true, value: "abc" })
  fireEvent.blur(input)

  await new Promise((r) => setTimeout(r, 50))
  expect(examsPatchSpy).not.toHaveBeenCalled()
  examsPatchSpy.mockRestore()
})

test("Preview Lembar click calls api.exams.finalize then navigates with examId", async () => {
  const user = userEvent.setup()
  const finalizeSpy = mockApiSpyResolvedValue(mockExamsFinalize, {} as never)

  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithCompleteMetadata("E"))
  await getLoader()({ deps: { examId: "E" } })

  renderReviewPage()

  const previewButton = screen.getByRole("button", { name: /preview lembar/i })
  await user.click(previewButton)

  await waitFor(() => {
    expect(finalizeSpy).toHaveBeenCalledWith("E")
  })
  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/preview", search: { examId: "E" } })
    )
  })

  finalizeSpy.mockRestore()
})

test("fast mode handlePreviewClick auto-accepts server-pending questions before calling finalize", async () => {
  const user = userEvent.setup()
  const finalizeSpy = mockApiSpyResolvedValue(mockExamsFinalize, {} as never)
  const patchSpy = mockApiSpyResolvedValue(mockQuestionsPatch, {} as never)

  setReviewSearch({ mode: "fast", examId: "exam_fast_auto" })
  const exam: ExamWithQuestions = {
    ...makeExamWithCompleteMetadata("exam_fast_auto"),
    questions: makeExamWithQuestions("exam_fast_auto").questions
  }
  mockApiResolvedValueOnce(mockExamsGet, exam)
  await getLoader()({ deps: { examId: "exam_fast_auto" } })

  renderReviewPage()

  const previewButton = screen.getByRole("button", { name: /preview lembar/i })
  await user.click(previewButton)

  await waitFor(() => {
    expect(patchSpy).toHaveBeenCalledTimes(20)
    expect(
      patchSpy.mock.calls.every((c) => (c[1] as { status: string }).status === "accepted")
    ).toBe(true)
    expect(finalizeSpy).toHaveBeenCalledWith("exam_fast_auto")
  })

  finalizeSpy.mockRestore()
  patchSpy.mockRestore()
})

test("slow mode handlePreviewClick does NOT auto-accept questions before finalize", async () => {
  const user = userEvent.setup()
  const finalizeSpy = mockApiSpyResolvedValue(mockExamsFinalize, {} as never)
  const patchSpy = mockApiSpyResolvedValue(mockQuestionsPatch, {} as never)

  setReviewSearch({ mode: "slow", examId: "exam_slow_no_auto" })
  const exam: ExamWithQuestions = {
    ...makeExamWithCompleteMetadata("exam_slow_no_auto"),
    questions: makeExamWithCompleteMetadata("exam_slow_no_auto").questions
  }
  mockApiResolvedValueOnce(mockExamsGet, exam)
  await getLoader()({ deps: { examId: "exam_slow_no_auto" } })

  renderReviewPage()

  const previewButton = screen.getByRole("button", { name: /preview lembar/i })
  await user.click(previewButton)

  await waitFor(() => {
    expect(finalizeSpy).toHaveBeenCalledWith("exam_slow_no_auto")
  })
  expect(patchSpy.mock.calls.filter((c) => (c[1] as { status?: string }).status === "accepted")).toHaveLength(0)

  finalizeSpy.mockRestore()
  patchSpy.mockRestore()
})

test("Preview Lembar shows specific toast when server returns FINALIZE_NOT_ALLOWED", async () => {
  const user = userEvent.setup()
  mockExamsFinalize.mockRejectedValueOnce(
    Object.assign(new Error("Not allowed"), { code: "FINALIZE_NOT_ALLOWED" })
  )

  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithCompleteMetadata("E"))
  await getLoader()({ deps: { examId: "E" } })

  renderReviewPage()

  const previewButton = screen.getByRole("button", { name: /preview lembar/i })
  await user.click(previewButton)

  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "error",
        description: "Semua soal harus diterima sebelum finalisasi."
      })
    )
  })
})
