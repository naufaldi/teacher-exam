import type { questions } from "@teacher-exam/db"
import type { UpdateExamInput } from "@teacher-exam/shared"

type QuestionRow = typeof questions.$inferSelect

/**
 * Builds the partial column map for a PATCH /exams update from validated input,
 * including only the fields the caller actually provided. Callers add `updatedAt`.
 */
export function buildExamUpdateData(input: UpdateExamInput): Record<string, unknown> {
  const updateData: Record<string, unknown> = {}
  if (input.title !== undefined) updateData["title"] = input.title
  if (input.schoolName !== undefined) updateData["schoolName"] = input.schoolName
  if (input.academicYear !== undefined) updateData["academicYear"] = input.academicYear
  if (input.semester !== undefined) updateData["semester"] = input.semester
  if (input.examType !== undefined) updateData["examType"] = input.examType
  if (input.examDate !== undefined) updateData["examDate"] = input.examDate
  if (input.durationMinutes !== undefined) updateData["durationMinutes"] = input.durationMinutes
  if (input.instructions !== undefined) updateData["instructions"] = input.instructions
  if (input.classContext !== undefined) updateData["classContext"] = input.classContext
  if (input.status !== undefined) updateData["status"] = input.status
  if (input.reviewMode !== undefined) updateData["reviewMode"] = input.reviewMode
  return updateData
}

/** Maps source question rows onto insert rows for a duplicated exam. */
export function mapDuplicatedQuestionRows(
  sourceQuestions: ReadonlyArray<QuestionRow>,
  newExamId: string,
  now: Date
): Array<typeof questions.$inferInsert> {
  return sourceQuestions.map((q) => ({
    id: crypto.randomUUID(),
    examId: newExamId,
    number: q.number,
    text: q.text,
    type: q.type,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctAnswer: q.correctAnswer,
    payload: q.payload,
    topic: q.topic,
    difficulty: q.difficulty,
    status: q.status,
    validationStatus: q.validationStatus,
    validationReason: q.validationReason,
    createdAt: now
  }))
}
