import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { makeExamWithQuestions } from "../../../test/fixtures/exam.js"
import { makeExamWithValidation } from "./fixtures.js"
import {
  getLoader,
  mockApiResolvedValueOnce,
  mockExamsGet,
  mockExamsValidateCurriculum,
  mockToast,
  renderReviewPage,
  setReviewSearch
} from "./setup.js"

describe("ReviewPage — optional Periksa kurikulum", () => {
  it("shows Periksa kurikulum when no validationStatus yet", async () => {
    setReviewSearch({ mode: "fast", examId: "exam_v" })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions("exam_v"))
    await getLoader()({ deps: { examId: "exam_v" } })

    renderReviewPage()

    expect(screen.getByTestId("validate-curriculum-btn")).toHaveTextContent("Periksa kurikulum")
    expect(screen.queryByTestId("curriculum-badge-valid")).not.toBeInTheDocument()
  })

  it("calls validateCurriculum and updates badges on success", async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: "fast", examId: "exam_v2" })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions("exam_v2"))
    await getLoader()({ deps: { examId: "exam_v2" } })

    const validated = makeExamWithValidation("exam_v2")
    mockApiResolvedValueOnce(mockExamsValidateCurriculum, validated)

    renderReviewPage()

    await user.click(screen.getByTestId("validate-curriculum-btn"))

    await waitFor(() => {
      expect(mockExamsValidateCurriculum).toHaveBeenCalledWith("exam_v2")
    })
    await waitFor(() => {
      expect(screen.getByTestId("curriculum-badge-needs_review")).toBeInTheDocument()
    })
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Pemeriksaan selesai" })
    )
  })
})
