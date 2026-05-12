import { eq } from 'drizzle-orm'
import { db, exams, questions } from '@teacher-exam/db'
import { normalizeExamType } from '@teacher-exam/shared'
import type { Exam, ExamWithQuestions, PublicExam, PublicExamWithQuestions } from '@teacher-exam/shared'
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
    topics:          row.topics as string[],
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

export function toPublicExam(row: ExamRow): PublicExam {
  return {
    id:              row.id,
    title:           row.title,
    subject:         row.subject,
    grade:           row.grade,
    difficulty:      row.difficulty,
    topics:          row.topics as string[],
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
    publishedAt:
      row.publishedAt instanceof Date ? row.publishedAt.toISOString() : String(row.publishedAt),
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

export async function fetchPublicExamWithQuestions(slug: string): Promise<PublicExamWithQuestions | null> {
  const examRows = await db
    .select()
    .from(exams)
    .where(eq(exams.publicShareSlug, slug))
    .limit(1)
  const examRow = examRows[0]
  if (!examRow || !examRow.isPublic || examRow.publishedAt === null) return null

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examRow.id))
    .orderBy(questions.number)

  return { ...toPublicExam(examRow), questions: questionRows.map((q) => rowToQuestion(q)) }
}
