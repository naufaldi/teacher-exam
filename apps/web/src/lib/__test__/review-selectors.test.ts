import type { Question } from "@teacher-exam/shared"
import { describe, expect, it } from "vitest"
import { makeMcqSingle } from "../../test/fixtures/exam.js"
import {
  countAccepted,
  countGenerationFailed,
  countReviewFlagged,
  hasCurriculumValidation,
  selectVisibleQuestions
} from "../review-selectors.js"

function withValidation(number: number, status: Question["validationStatus"]): Question {
  return { ...makeMcqSingle(number), validationStatus: status }
}

describe("review-selectors", () => {
  it("hasCurriculumValidation is false when every verdict is null", () => {
    expect(hasCurriculumValidation([makeMcqSingle(1), makeMcqSingle(2)])).toBe(false)
  })

  it("hasCurriculumValidation is true once any question has a verdict", () => {
    expect(hasCurriculumValidation([makeMcqSingle(1), withValidation(2, "valid")])).toBe(true)
  })

  it("countReviewFlagged counts needs_review and invalid only", () => {
    const questions = [
      withValidation(1, "invalid"),
      withValidation(2, "valid"),
      withValidation(3, "needs_review")
    ]
    expect(countReviewFlagged(questions)).toBe(2)
  })

  it("selectVisibleQuestions returns all when filter is off", () => {
    const questions = [makeMcqSingle(1), withValidation(2, "invalid")]
    expect(selectVisibleQuestions(questions, false)).toHaveLength(2)
  })

  it("selectVisibleQuestions narrows to flagged when filter is on", () => {
    const questions = [makeMcqSingle(1), withValidation(2, "invalid"), withValidation(3, "valid")]
    expect(selectVisibleQuestions(questions, true)).toHaveLength(1)
  })

  it("countGenerationFailed counts placeholder questions", () => {
    const failed = { ...makeMcqSingle(1), generationFailed: true } as Question
    expect(countGenerationFailed([failed, makeMcqSingle(2)])).toBe(1)
  })

  it("countAccepted counts accepted statuses only", () => {
    expect(countAccepted({ a: "accepted", b: "pending", c: "accepted", d: "rejected" })).toBe(2)
  })
})
