import { classes, exams, examSessions, questions, sessionResults, sessionStudents } from "@teacher-exam/db"
import type { ClassAnalyticsResponse, ExamAnalyticsResponse, QuestionAnalytics, ScoreBand } from "@teacher-exam/shared"
import { eq, inArray } from "drizzle-orm"
import { Context, Data, Effect, Layer } from "effect"
import { toExam } from "../../lib/exams-query"
import type { ApiDatabaseError } from "../errors/http"
import { runDb } from "../lib/db-effect"
import { DbClient } from "./db"

export class ExamNotFoundError extends Data.TaggedError("ExamNotFoundError")<{
  examId: string
}> {}

export class ExamForbiddenError extends Data.TaggedError("ExamForbiddenError")<{
  examId: string
}> {}

export class ClassNotFoundError extends Data.TaggedError("ClassNotFoundError")<{
  classId: string
}> {}

export class ClassForbiddenError extends Data.TaggedError("ClassForbiddenError")<{
  classId: string
}> {}

export interface AnalyticsServiceApi {
  readonly getExamAnalytics: (
    userId: string,
    examId: string
  ) => Effect.Effect<
    ExamAnalyticsResponse,
    ExamNotFoundError | ExamForbiddenError | ApiDatabaseError
  >
  readonly getClassAnalytics: (
    userId: string,
    classId: string
  ) => Effect.Effect<
    ClassAnalyticsResponse,
    ClassNotFoundError | ClassForbiddenError | ApiDatabaseError
  >
}

export class AnalyticsService extends Context.Tag("AnalyticsService")<
  AnalyticsService,
  AnalyticsServiceApi
>() {}

type ResultRow = typeof sessionResults.$inferSelect

const BANDS: Array<{ range: string; min: number; max: number }> = [
  { range: "0-59", min: 0, max: 59 },
  { range: "60-69", min: 60, max: 69 },
  { range: "70-79", min: 70, max: 79 },
  { range: "80-100", min: 80, max: 100 }
]

function computeDistribution(scores: Array<number>): Array<ScoreBand> {
  return BANDS.map((band) => ({
    range: band.range,
    count: scores.filter((s) => s >= band.min && s <= band.max).length
  }))
}

type PerQuestionAcc = {
  questionId: string
  number: number
  type: string
  correctCount: number
  answeredCount: number
}

function aggregatePerQuestion(
  results: Array<ResultRow>,
  totalCount: number
): Array<QuestionAnalytics> {
  if (results.length === 0) return []
  const acc = new Map<string, PerQuestionAcc>()
  for (const result of results) {
    const answers = (result.answers ?? []) as Array<{
      questionId: string
      number: number
      type: string
      isCorrect: boolean
    }>
    for (const a of answers) {
      const existing = acc.get(a.questionId)
      if (existing) {
        existing.correctCount += a.isCorrect ? 1 : 0
        existing.answeredCount += 1
      } else {
        acc.set(a.questionId, {
          questionId: a.questionId,
          number: a.number,
          type: a.type,
          correctCount: a.isCorrect ? 1 : 0,
          answeredCount: 1
        })
      }
    }
  }
  return Array.from(acc.values())
    .sort((a, b) => a.number - b.number)
    .map((q) => ({
      questionId: q.questionId,
      number: q.number,
      type: q.type as QuestionAnalytics["type"],
      correctRate: q.answeredCount > 0 ? Math.round((q.correctCount / q.answeredCount) * 100) : 0,
      answeredCount: q.answeredCount
    }))
    .slice(0, totalCount > 0 ? totalCount : undefined)
}

function averageScore(scores: Array<number>): number {
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

function clampRate(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export const AnalyticsServiceLive = Layer.effect(
  AnalyticsService,
  Effect.gen(function*() {
    const db = yield* DbClient

    const getExamAnalytics: AnalyticsServiceApi["getExamAnalytics"] = (userId, examId) =>
      Effect.gen(function*() {
        const examRows = yield* runDb(
          db.select().from(exams).where(eq(exams.id, examId)).limit(1)
        )
        const examRow = examRows[0]
        if (!examRow) {
          return yield* Effect.fail(new ExamNotFoundError({ examId }))
        }
        if (examRow.userId !== userId) {
          return yield* Effect.fail(new ExamForbiddenError({ examId }))
        }
        const exam = toExam(examRow)

        const sessionRows = yield* runDb(
          db.select().from(examSessions).where(eq(examSessions.examId, examId))
        )
        const sessionIds = sessionRows.map((s) => s.id)
        const sessionCount = sessionRows.length

        const resultRows = sessionIds.length > 0
          ? yield* runDb(
            db.select().from(sessionResults).where(inArray(sessionResults.sessionId, sessionIds))
          )
          : []

        const scores = resultRows.map((r) => r.score)
        const participantCount = resultRows.length

        let joinedCount = 0
        if (sessionIds.length > 0) {
          const studentRows = yield* runDb(
            db.select().from(sessionStudents).where(inArray(sessionStudents.sessionId, sessionIds))
          )
          joinedCount = studentRows.length
        }
        const completionRate = joinedCount > 0 ? clampRate(Math.round((participantCount / joinedCount) * 100)) : 0

        const questionRows = yield* runDb(
          db.select().from(questions).where(eq(questions.examId, examId))
        )
        const perQuestion = aggregatePerQuestion(resultRows, questionRows.length)

        return {
          examId: examRow.id as ExamAnalyticsResponse["examId"],
          examTitle: exam.title,
          sessionCount,
          participantCount,
          averageScore: averageScore(scores),
          completionRate,
          scoreDistribution: computeDistribution(scores),
          perQuestion
        }
      }).pipe(Effect.provideService(DbClient, db))

    const getClassAnalytics: AnalyticsServiceApi["getClassAnalytics"] = (userId, classId) =>
      Effect.gen(function*() {
        const classRows = yield* runDb(
          db.select().from(classes).where(eq(classes.id, classId)).limit(1)
        )
        const classRow = classRows[0]
        if (!classRow) {
          return yield* Effect.fail(new ClassNotFoundError({ classId }))
        }
        if (classRow.userId !== userId) {
          return yield* Effect.fail(new ClassForbiddenError({ classId }))
        }

        const sessionRows = yield* runDb(
          db.select().from(examSessions).where(eq(examSessions.classId, classId))
        )
        const sessionIds = sessionRows.map((s) => s.id)
        const examCount = new Set(sessionRows.map((s) => s.examId)).size

        const resultRows = sessionIds.length > 0
          ? yield* runDb(
            db.select().from(sessionResults).where(inArray(sessionResults.sessionId, sessionIds))
          )
          : []
        const scores = resultRows.map((r) => r.score)

        return {
          classId: classRow.id as ClassAnalyticsResponse["classId"],
          className: classRow.name,
          examCount,
          participantCount: resultRows.length,
          averageScore: averageScore(scores)
        }
      }).pipe(Effect.provideService(DbClient, db))

    return { getExamAnalytics, getClassAnalytics }
  })
)
