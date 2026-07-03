import type { Question } from "@teacher-exam/shared"
import { needsCurriculumReview } from "../components/review/curriculum-validation-badge.js"
import type { QuestionStatus } from "./review-config.js"

/** True when at least one question carries a curriculum validation verdict. */
export function hasCurriculumValidation(questions: ReadonlyArray<Question>): boolean {
  return questions.some((q) => q.validationStatus !== null && q.validationStatus !== undefined)
}

/** Number of questions flagged as needing curriculum review. */
export function countReviewFlagged(questions: ReadonlyArray<Question>): number {
  return questions.filter((q) => needsCurriculumReview(q.validationStatus)).length
}

/** Questions to render, optionally narrowed to curriculum-flagged ones. */
export function selectVisibleQuestions(
  questions: ReadonlyArray<Question>,
  reviewOnlyFilter: boolean
): ReadonlyArray<Question> {
  return reviewOnlyFilter
    ? questions.filter((q) => needsCurriculumReview(q.validationStatus))
    : questions
}

/** Number of questions the AI failed to generate (placeholders). */
export function countGenerationFailed(questions: ReadonlyArray<Question>): number {
  return questions.filter((q) => q.generationFailed === true).length
}

/** Number of questions the teacher has accepted. */
export function countAccepted(questionStatuses: Record<string, QuestionStatus>): number {
  return Object.values(questionStatuses).filter((s) => s === "accepted").length
}
