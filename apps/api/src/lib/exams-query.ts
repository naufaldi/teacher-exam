import { eq } from 'drizzle-orm'
import { db, exams, questions } from '@teacher-exam/db'
import { normalizeExamType } from '@teacher-exam/shared'
import type { Exam, ExamWithQuestions, Question } from '@teacher-exam/shared'
import type { InferSelectModel } from 'drizzle-orm'

type ExamRow = InferSelectModel<typeof exams>
type QuestionRow = InferSelectModel<typeof questions>

export function toExam(row: ExamRow): Exam {
  return {
    id:              row.id,
    userId:          row.userId,
    title:           row.title,
    subject:         row.subject,
    grade:           row.grade,
    difficulty:      row.difficulty,
    topic:           row.topic,
    reviewMode:      row.reviewMode,
    status:          row.status,
    schoolName:      row.schoolName ?? null,
    academicYear:    row.academicYear ?? null,
    examType:        normalizeExamType(row.examType),
    examDate:        row.examDate ?? null,
    durationMinutes: row.durationMinutes ?? null,
    instructions:    row.instructions ?? null,
    classContext:    row.classContext ?? null,
    discussionMd:    row.discussionMd ?? null,
    createdAt:       row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:       row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}

export function toQuestion(row: QuestionRow): Question {
  return {
    id:               row.id,
    examId:           row.examId,
    number:           row.number,
    text:             row.text,
    optionA:          row.optionA,
    optionB:          row.optionB,
    optionC:          row.optionC,
    optionD:          row.optionD,
    correctAnswer:    row.correctAnswer,
    topic:            row.topic ?? null,
    difficulty:       row.difficulty ?? null,
    status:           row.status,
    validationStatus: row.validationStatus as Question['validationStatus'] ?? null,
    validationReason: row.validationReason ?? null,
    createdAt:        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }
}

export async function fetchExamWithQuestions(examId: string): Promise<ExamWithQuestions | null> {
  const examRows = await db.select().from(exams).where(eq(exams.id, examId)).limit(1)
  const examRow = examRows[0]
  if (!examRow) return null

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(questions.number)

  return { ...toExam(examRow), questions: questionRows.map((q) => toQuestion(q)) }
}
