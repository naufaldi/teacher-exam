import { exams, questions } from "@teacher-exam/db"
import {
  ExamIdSchema,
  normalizeExamType,
  UserIdSchema
} from "@teacher-exam/shared"
import type { Exam, ExamWithQuestions, PublicExam, PublicExamWithQuestions } from "@teacher-exam/shared"
import { eq } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"
import { Effect, Schema } from "effect"
import type { ApiDatabaseError } from "../api/errors/http"
import { runDb } from "../api/lib/db-effect"
import { DbClient } from "../api/services/db"
import { rowToQuestion } from "./question-mapper"

type ExamRow = InferSelectModel<typeof exams>

export function toExam(row: ExamRow): Exam {
  return {
    id: Schema.decodeSync(ExamIdSchema)(row.id),
    userId: Schema.decodeSync(UserIdSchema)(row.userId),
    title: row.title,
    subject: row.subject ?? null,
    subjectLabel: row.subjectLabel ?? null,
    grade: row.grade,
    difficulty: row.difficulty,
    topics: row.topics as Array<string>,
    reviewMode: row.reviewMode,
    status: row.status,
    schoolName: row.schoolName ?? null,
    academicYear: row.academicYear ?? null,
    examType: normalizeExamType(row.examType),
    examDate: row.examDate ?? null,
    durationMinutes: row.durationMinutes ?? null,
    instructions: row.instructions ?? null,
    classContext: row.classContext ?? null,
    discussionMd: row.discussionMd ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    bankedAt: row.bankedAt instanceof Date ? row.bankedAt.toISOString() : row.bankedAt ?? null,
    publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : row.publishedAt ?? null
  }
}

export function toPublicExam(row: ExamRow): PublicExam {
  return {
    id: Schema.decodeSync(ExamIdSchema)(row.id),
    title: row.title,
    subject: row.subject ?? null,
    subjectLabel: row.subjectLabel ?? null,
    grade: row.grade,
    difficulty: row.difficulty,
    topics: row.topics as Array<string>,
    reviewMode: row.reviewMode,
    status: row.status,
    schoolName: row.schoolName ?? null,
    academicYear: row.academicYear ?? null,
    examType: normalizeExamType(row.examType),
    examDate: row.examDate ?? null,
    durationMinutes: row.durationMinutes ?? null,
    instructions: row.instructions ?? null,
    classContext: row.classContext ?? null,
    discussionMd: row.discussionMd ?? null,
    publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : String(row.publishedAt),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)
  }
}

export function fetchExamWithQuestions(
  examId: string
): Effect.Effect<ExamWithQuestions | null, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const examRows = yield* runDb(db.select().from(exams).where(eq(exams.id, examId)).limit(1))
    const examRow = examRows[0]
    if (!examRow) return null

    const questionRows = yield* runDb(
      db.select().from(questions).where(eq(questions.examId, examId)).orderBy(questions.number)
    )

    const mappedQuestions = questionRows.map((q) => rowToQuestion(q))
    const failedQuestionNumbers = mappedQuestions
      .filter((q) => q.generationFailed === true)
      .map((q) => q.number)
    return {
      ...toExam(examRow),
      questions: mappedQuestions,
      ...(failedQuestionNumbers.length > 0
        ? {
          generationIncomplete: true,
          failedQuestionNumbers
        }
        : {})
    }
  })
}

export function fetchPublicExamWithQuestions(
  slug: string
): Effect.Effect<PublicExamWithQuestions | null, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const examRows = yield* runDb(
      db.select().from(exams).where(eq(exams.publicShareSlug, slug)).limit(1)
    )
    const examRow = examRows[0]
    if (!examRow || !examRow.isPublic || examRow.publishedAt === null) return null

    const questionRows = yield* runDb(
      db.select().from(questions).where(eq(questions.examId, examRow.id)).orderBy(questions.number)
    )

    const acceptedOnly = questionRows
      .map((q) => rowToQuestion(q))
      .filter((q) => q.status === "accepted")

    return { ...toPublicExam(examRow), questions: acceptedOnly }
  })
}
