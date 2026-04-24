import { eq } from 'drizzle-orm'
import { db, exams, questions } from '@teacher-exam/db'
import { normalizeExamType } from '@teacher-exam/shared'
import type { Exam, ExamWithQuestions } from '@teacher-exam/shared'
import type { InferSelectModel } from 'drizzle-orm'
import { rowToQuestion } from './question-mapper'

type ExamRow = InferSelectModel<typeof exams>

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

export async function fetchExamWithQuestions(examId: string): Promise<ExamWithQuestions | null> {
  const examRows = await db.select().from(exams).where(eq(exams.id, examId)).limit(1)
  const examRow = examRows[0]
  if (!examRow) return null

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(questions.number)

  return { ...toExam(examRow), questions: questionRows.map((q) => rowToQuestion(q)) }
}
