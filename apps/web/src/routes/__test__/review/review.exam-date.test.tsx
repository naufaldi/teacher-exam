import { fireEvent, screen, waitFor } from "@testing-library/react"
import { expect, test } from "vitest"
import { mockApiSpyResolvedValue } from "../../../lib/api-test-utils.js"
import { examDraftStore } from "../../../lib/exam-draft-store.js"
import { makeExamWithQuestions } from "./fixtures.js"
import {
  getLoader,
  mockApiResolvedValueOnce,
  mockExamsGet,
  mockExamsPatch,
  renderReviewPage,
  setReviewSearch
} from "./setup.js"

test("Tanggal Ujian 12 Oktober 2026 is still shown after a reload", async () => {
  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, {
    ...makeExamWithQuestions("E"),
    examDate: "2026-10-12"
  })
  await getLoader()({ deps: { examId: "E" } })

  expect(examDraftStore.getSnapshot().metadata.examDate).toBe("2026-10-12")
  renderReviewPage()

  expect(await screen.findByText("12 Oktober 2026")).toBeInTheDocument()
})

test("Tanggal Ujian still shows 12 Oktober 2026 when the saved value is that label", async () => {
  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, {
    ...makeExamWithQuestions("E"),
    examDate: "12 Oktober 2026"
  })
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  expect(await screen.findByText("12 Oktober 2026")).toBeInTheDocument()
})

test("choosing 12 Oktober 2026 PATCHes examDate so a reload can restore it", async () => {
  const patchSpy = mockApiSpyResolvedValue(mockExamsPatch, {} as never)
  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions("E"))
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  const trigger = screen.getByRole("button", { name: "Tanggal Ujian" })
  fireEvent.click(trigger)
  expect(await screen.findByRole("grid")).toBeInTheDocument()
  const day = document.querySelector("[data-day=\"2026-10-12\"] button")
  if (!(day instanceof HTMLButtonElement)) throw new Error("day 12 not found")
  fireEvent.click(day)

  await waitFor(() => {
    expect(patchSpy).toHaveBeenCalledWith("E", { examDate: "2026-10-12" })
  })
  expect(screen.getByText("12 Oktober 2026")).toBeInTheDocument()
})

test("disabled Preview Lembar explains the missing school name and exam date", async () => {
  setReviewSearch({ mode: "fast", examId: "E" })
  mockApiResolvedValueOnce(mockExamsGet, {
    ...makeExamWithQuestions("E"),
    schoolName: null,
    academicYear: "2025/2026",
    examType: "formatif",
    examDate: null,
    durationMinutes: 60,
    questions: makeExamWithQuestions("E").questions.map((q) => ({ ...q, status: "accepted" as const }))
  })
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  const preview = screen.getByRole("button", { name: /preview lembar/i })
  expect(preview).toBeDisabled()
  expect(screen.getByText("Lengkapi nama sekolah dan tanggal ujian.")).toBeInTheDocument()
})

test("Preview Lembar stays disabled with only the exam date missing", async () => {
  setReviewSearch({ mode: "fast", examId: "E" })
  const base = makeExamWithQuestions("E")
  mockApiResolvedValueOnce(mockExamsGet, {
    ...base,
    schoolName: "SD Negeri 1",
    academicYear: "2025/2026",
    examType: "formatif",
    examDate: null,
    durationMinutes: 60,
    questions: base.questions.map((q) => ({ ...q, status: "accepted" as const }))
  })
  await getLoader()({ deps: { examId: "E" } })
  renderReviewPage()

  expect(screen.getByRole("button", { name: /preview lembar/i })).toBeDisabled()
  expect(screen.getByText("Lengkapi tanggal ujian.")).toBeInTheDocument()
})
