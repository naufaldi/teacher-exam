import { exams, examSessions, questions, sessionResults, sessionStudents } from "@teacher-exam/db"
import type {
  GradeResultInput,
  GradeSessionResponse,
  QuestionResult,
  ResultsStats,
  SessionResult,
  SessionResultsResponse
} from "@teacher-exam/shared"
import { eq } from "drizzle-orm"
import { Context, Data, Effect, Layer, Match } from "effect"
import { toExam } from "../../lib/exams-query"
import { rowToQuestion } from "../../lib/question-mapper"
import type { ApiDatabaseError } from "../errors/http"
import { runDb } from "../lib/db-effect"
import { DbClient } from "./db"

export class ResultNotFoundError extends Data.TaggedError("ResultNotFoundError")<{
  resultId: string
}> {}

export class SessionNotFoundError extends Data.TaggedError("SessionNotFoundError")<{
  sessionId: string
}> {}

export class ExamNotFoundError extends Data.TaggedError("ExamNotFoundError")<{
  examId: string
}> {}

export class GradingSaveError extends Data.TaggedError("GradingSaveError")<{
  cause: unknown
}> {}

export interface GradingServiceApi {
  readonly gradeSession: (
    userId: string,
    sessionId: string
  ) => Effect.Effect<
    GradeSessionResponse,
    SessionNotFoundError | ExamNotFoundError | GradingSaveError | ApiDatabaseError
  >
  readonly listResults: (
    userId: string,
    sessionId: string
  ) => Effect.Effect<
    SessionResultsResponse,
    SessionNotFoundError | ExamNotFoundError | ApiDatabaseError
  >
  readonly listResultsByExam: (
    userId: string,
    examId: string
  ) => Effect.Effect<SessionResultsResponse, ExamNotFoundError | ApiDatabaseError>
  readonly getResult: (
    userId: string,
    resultId: string
  ) => Effect.Effect<
    SessionResult,
    ResultNotFoundError | ExamNotFoundError | ApiDatabaseError
  >
  readonly gradeResult: (
    userId: string,
    resultId: string,
    input: GradeResultInput
  ) => Effect.Effect<
    SessionResult,
    ResultNotFoundError | ExamNotFoundError | GradingSaveError | ApiDatabaseError
  >
}

export class GradingService extends Context.Tag("GradingService")<
  GradingService,
  GradingServiceApi
>() {}

type SessionRow = typeof examSessions.$inferSelect
type ResultRow = typeof sessionResults.$inferSelect

const PASSING_THRESHOLD = 70

function toIso(value: Date | string | null): string | null {
  if (value === null) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

function toSessionResult(row: ResultRow): SessionResult {
  return {
    id: row.id as SessionResult["id"],
    sessionId: row.sessionId as SessionResult["sessionId"],
    sessionStudentId: row.sessionStudentId as SessionResult["sessionStudentId"],
    studentName: row.studentName,
    examId: row.examId as SessionResult["examId"],
    score: row.score,
    correctCount: row.correctCount,
    totalCount: row.totalCount,
    gradedStatus: row.gradedStatus,
    answers: (row.answers ?? []) as Array<QuestionResult>,
    gradedAt: toIso(row.gradedAt),
    createdAt: toIso(row.createdAt) as string,
    updatedAt: toIso(row.updatedAt) as string
  }
}

type DecodedAnswer =
  | { _tag: "mcq_single"; answer: string }
  | { _tag: "mcq_multi"; answers: Array<string> }
  | { _tag: "true_false"; answers: Array<boolean> }

function readAnswer(raw: unknown): DecodedAnswer | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const tag = obj["_tag"]
  if (tag === "mcq_single" && typeof obj["answer"] === "string") {
    return { _tag: "mcq_single", answer: obj["answer"] }
  }
  if (tag === "mcq_multi" && Array.isArray(obj["answers"])) {
    return { _tag: "mcq_multi", answers: obj["answers"] as Array<string> }
  }
  if (tag === "true_false" && Array.isArray(obj["answers"])) {
    return { _tag: "true_false", answers: obj["answers"] as Array<boolean> }
  }
  return null
}

function isMcqSingleCorrect(student: DecodedAnswer, correct: string): boolean {
  return student._tag === "mcq_single" && student.answer === correct
}

function isMcqMultiCorrect(student: DecodedAnswer, correct: ReadonlyArray<string>): boolean {
  if (student._tag !== "mcq_multi") return false
  const sortedStudent = [...student.answers].sort()
  const sortedCorrect = [...correct].sort()
  return (
    sortedStudent.length === sortedCorrect.length &&
    sortedStudent.every((v, i) => v === sortedCorrect[i])
  )
}

function isTrueFalseCorrect(student: DecodedAnswer, correct: ReadonlyArray<boolean>): boolean {
  if (student._tag !== "true_false") return false
  return (
    student.answers.length === correct.length &&
    student.answers.every((v, i) => v === correct[i])
  )
}

function gradeQuestion(q: ReturnType<typeof rowToQuestion>, answer: DecodedAnswer | null): QuestionResult {
  return Match.value(q).pipe(
    Match.tag("mcq_single", (x) => ({
      questionId: x.id,
      number: x.number,
      type: "mcq_single" as const,
      isCorrect: answer !== null && isMcqSingleCorrect(answer, x.correct)
    })),
    Match.tag("mcq_multi", (x) => ({
      questionId: x.id,
      number: x.number,
      type: "mcq_multi" as const,
      isCorrect: answer !== null && isMcqMultiCorrect(answer, x.correct)
    })),
    Match.tag("true_false", (x) => ({
      questionId: x.id,
      number: x.number,
      type: "true_false" as const,
      isCorrect: answer !== null && isTrueFalseCorrect(answer, x.statements.map((s) => s.answer))
    })),
    Match.exhaustive
  )
}

function computeScore(correctCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0
  return Math.round((correctCount / totalCount) * 100)
}

function computeStats(results: Array<SessionResult>): ResultsStats {
  const participantCount = results.length
  if (participantCount === 0) {
    return {
      participantCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passingCount: 0,
      passingThreshold: PASSING_THRESHOLD
    }
  }
  const scores = results.map((r) => r.score)
  const sum = scores.reduce((a, b) => a + b, 0)
  const averageScore = Math.round(sum / participantCount)
  const highestScore = Math.max(...scores)
  const lowestScore = Math.min(...scores)
  const passingCount = scores.filter((s) => s >= PASSING_THRESHOLD).length
  return {
    participantCount,
    averageScore,
    highestScore,
    lowestScore,
    passingCount,
    passingThreshold: PASSING_THRESHOLD
  }
}

export const GradingServiceLive = Layer.effect(
  GradingService,
  Effect.gen(function*() {
    const db = yield* DbClient

    const fetchSession = (
      sessionId: string
    ): Effect.Effect<SessionRow, SessionNotFoundError | ApiDatabaseError, DbClient> =>
      Effect.gen(function*() {
        const rows = yield* runDb(
          db.select().from(examSessions).where(eq(examSessions.id, sessionId)).limit(1)
        )
        const row = rows[0]
        if (!row) {
          return yield* Effect.fail(new SessionNotFoundError({ sessionId }))
        }
        return row
      })

    const fetchOwnedExam = (
      examId: string,
      userId: string
    ): Effect.Effect<{ id: string; title: string }, ExamNotFoundError | ApiDatabaseError, DbClient> =>
      Effect.gen(function*() {
        const rows = yield* runDb(
          db.select().from(exams).where(eq(exams.id, examId)).limit(1)
        )
        const row = rows[0]
        if (!row || row.userId !== userId) {
          return yield* Effect.fail(new ExamNotFoundError({ examId }))
        }
        const exam = toExam(row)
        return { id: row.id, title: exam.title }
      })

    const gradeSession: GradingServiceApi["gradeSession"] = (userId, sessionId) =>
      Effect.gen(function*() {
        const session = yield* fetchSession(sessionId)
        const exam = yield* fetchOwnedExam(session.examId, userId)
        const questionRows = yield* runDb(
          db.select().from(questions).where(eq(questions.examId, exam.id))
        )
        const questionsSorted = questionRows
          .map((q) => rowToQuestion(q))
          .sort((a, b) => a.number - b.number)
        const totalCount = questionsSorted.length

        const studentRows = yield* runDb(
          db.select().from(sessionStudents).where(eq(sessionStudents.sessionId, session.id))
        )
        const submittedStudents = studentRows.filter((s) => s.submittedAt !== null)

        const now = new Date()
        for (const student of submittedStudents) {
          const answers = (student.answers ?? {}) as Record<string, unknown>
          const perQuestion = questionsSorted.map((q) => {
            const raw = answers[q.id]
            return gradeQuestion(q, readAnswer(raw))
          })
          const correctCount = perQuestion.filter((p) => p.isCorrect).length
          const score = computeScore(correctCount, totalCount)
          yield* runDb(
            db
              .insert(sessionResults)
              .values({
                id: crypto.randomUUID(),
                sessionStudentId: student.id,
                sessionId: session.id,
                examId: exam.id,
                studentName: student.studentName,
                score,
                correctCount,
                totalCount,
                gradedStatus: "auto",
                answers: perQuestion,
                gradedAt: now,
                createdAt: now,
                updatedAt: now
              })
              .onConflictDoNothing()
          )
        }

        return { gradedCount: submittedStudents.length }
      }).pipe(Effect.provideService(DbClient, db))

    const listResults: GradingServiceApi["listResults"] = (userId, sessionId) =>
      Effect.gen(function*() {
        const session = yield* fetchSession(sessionId)
        const exam = yield* fetchOwnedExam(session.examId, userId)
        const rows = yield* runDb(
          db.select().from(sessionResults).where(eq(sessionResults.sessionId, session.id))
        )
        const results = rows.map(toSessionResult)
        return {
          sessionId: session.id as SessionResultsResponse["sessionId"],
          examId: session.examId as SessionResultsResponse["examId"],
          examTitle: exam.title,
          results,
          stats: computeStats(results)
        }
      }).pipe(Effect.provideService(DbClient, db))

    const listResultsByExam: GradingServiceApi["listResultsByExam"] = (userId, examId) =>
      Effect.gen(function*() {
        const exam = yield* fetchOwnedExam(examId, userId)
        const sessionRows = yield* runDb(
          db.select().from(examSessions).where(eq(examSessions.examId, exam.id))
        )
        const latestSession = sessionRows[0]
        if (!latestSession) {
          return {
            sessionId: "" as SessionResultsResponse["sessionId"],
            examId: exam.id as SessionResultsResponse["examId"],
            examTitle: exam.title,
            results: [],
            stats: computeStats([])
          }
        }
        const rows = yield* runDb(
          db.select().from(sessionResults).where(eq(sessionResults.sessionId, latestSession.id))
        )
        const results = rows.map(toSessionResult)
        return {
          sessionId: latestSession.id as SessionResultsResponse["sessionId"],
          examId: exam.id as SessionResultsResponse["examId"],
          examTitle: exam.title,
          results,
          stats: computeStats(results)
        }
      }).pipe(Effect.provideService(DbClient, db))

    const getResult: GradingServiceApi["getResult"] = (userId, resultId) =>
      Effect.gen(function*() {
        const resultRows = yield* runDb(
          db.select().from(sessionResults).where(eq(sessionResults.id, resultId)).limit(1)
        )
        const resultRow = resultRows[0]
        if (!resultRow) {
          return yield* Effect.fail(new ResultNotFoundError({ resultId }))
        }
        const sessionRows = yield* runDb(
          db.select().from(examSessions).where(eq(examSessions.id, resultRow.sessionId)).limit(1)
        )
        const session = sessionRows[0]
        if (!session) {
          return yield* Effect.fail(new ExamNotFoundError({ examId: resultRow.examId }))
        }
        yield* fetchOwnedExam(session.examId, userId)
        return toSessionResult(resultRow)
      }).pipe(Effect.provideService(DbClient, db))

    const gradeResult: GradingServiceApi["gradeResult"] = (userId, resultId, input) =>
      Effect.gen(function*() {
        const resultRows = yield* runDb(
          db.select().from(sessionResults).where(eq(sessionResults.id, resultId)).limit(1)
        )
        const resultRow = resultRows[0]
        if (!resultRow) {
          return yield* Effect.fail(new ResultNotFoundError({ resultId }))
        }
        const sessionRows = yield* runDb(
          db.select().from(examSessions).where(eq(examSessions.id, resultRow.sessionId)).limit(1)
        )
        const session = sessionRows[0]
        if (!session) {
          return yield* Effect.fail(new ExamNotFoundError({ examId: resultRow.examId }))
        }
        yield* fetchOwnedExam(session.examId, userId)
        const now = new Date()
        yield* runDb(
          db
            .update(sessionResults)
            .set({
              score: input.score,
              correctCount: input.correctCount,
              answers: input.answers,
              gradedStatus: "manual",
              gradedAt: now,
              updatedAt: now
            })
            .where(eq(sessionResults.id, resultId))
        )
        const updated = yield* runDb(
          db.select().from(sessionResults).where(eq(sessionResults.id, resultId)).limit(1)
        )
        const updatedRow = updated[0]
        if (!updatedRow) {
          return yield* Effect.fail(new GradingSaveError({ cause: "No row returned" }))
        }
        return toSessionResult(updatedRow)
      }).pipe(Effect.provideService(DbClient, db))

    return { gradeSession, listResults, listResultsByExam, getResult, gradeResult }
  })
)
