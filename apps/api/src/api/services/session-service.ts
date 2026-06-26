import { exams, examSessions, questions, sessionStudents } from "@teacher-exam/db"
import type {
  CreateSessionInput,
  ExamSession,
  SessionDetailResponse,
  SessionQuestion,
  SessionStudent,
  StartSessionInput,
  SubmitSessionInput
} from "@teacher-exam/shared"
import { and, eq } from "drizzle-orm"
import { Context, Data, Effect, Layer, Match } from "effect"
import { toExam } from "../../lib/exams-query"
import { rowToQuestion } from "../../lib/question-mapper"
import type { ApiDatabaseError } from "../errors/http"
import { runDb } from "../lib/db-effect"
import { DbClient } from "./db"

export class SessionNotFoundError extends Data.TaggedError("SessionNotFoundError")<{
  code: string
}> {}

export class SessionStudentNotFoundError extends Data.TaggedError("SessionStudentNotFoundError")<{
  token: string
}> {}

export class ExamNotFinalError extends Data.TaggedError("ExamNotFinalError")<{
  examId: string
}> {}

export class ExamNotFoundError extends Data.TaggedError("ExamNotFoundError")<{
  examId: string
}> {}

export class SessionAlreadySubmittedError extends Data.TaggedError("SessionAlreadySubmittedError")<{
  token: string
}> {}

export class SessionSaveError extends Data.TaggedError("SessionSaveError")<{
  cause: unknown
}> {}

export interface SessionServiceApi {
  readonly createSession: (
    userId: string,
    examId: string,
    input: CreateSessionInput
  ) => Effect.Effect<
    ExamSession,
    ExamNotFoundError | ExamNotFinalError | SessionSaveError | ApiDatabaseError
  >
  readonly getPublicSession: (
    code: string
  ) => Effect.Effect<SessionDetailResponse | null, ApiDatabaseError>
  readonly startSession: (
    code: string,
    input: StartSessionInput
  ) => Effect.Effect<
    SessionStudent,
    SessionNotFoundError | SessionSaveError | ApiDatabaseError
  >
  readonly submitSession: (
    code: string,
    input: SubmitSessionInput
  ) => Effect.Effect<
    void,
    | SessionNotFoundError
    | SessionStudentNotFoundError
    | SessionAlreadySubmittedError
    | ApiDatabaseError
  >
}

export class SessionService extends Context.Tag("SessionService")<
  SessionService,
  SessionServiceApi
>() {}

type SessionRow = typeof examSessions.$inferSelect
type SessionStudentRow = typeof sessionStudents.$inferSelect

function makeSessionCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function makeToken(): string {
  return `tok_${crypto.randomUUID()}`
}

function toExamSession(row: SessionRow): ExamSession {
  return {
    id: row.id as ExamSession["id"],
    examId: row.examId as ExamSession["examId"],
    classId: row.classId as ExamSession["classId"],
    sessionCode: row.sessionCode,
    opensAt: row.opensAt instanceof Date ? row.opensAt.toISOString() : String(row.opensAt),
    closesAt: row.closesAt instanceof Date ? row.closesAt.toISOString() : String(row.closesAt),
    durationMinutes: row.durationMinutes,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)
  }
}

function toSessionStudent(row: SessionStudentRow): SessionStudent {
  return {
    id: row.id as SessionStudent["id"],
    sessionId: row.sessionId as SessionStudent["sessionId"],
    studentId: row.studentId as SessionStudent["studentId"],
    studentName: row.studentName,
    identifier: row.identifier,
    token: row.token,
    joinedAt: row.joinedAt instanceof Date ? row.joinedAt.toISOString() : String(row.joinedAt),
    submittedAt: row.submittedAt === null
      ? null
      : row.submittedAt instanceof Date
      ? row.submittedAt.toISOString()
      : String(row.submittedAt)
  }
}

function questionToSessionQuestion(q: ReturnType<typeof rowToQuestion>): SessionQuestion {
  return Match.value(q).pipe(
    Match.tag("mcq_single", (x) => ({
      id: x.id,
      number: x.number,
      _tag: "mcq_single" as const,
      text: x.text,
      options: x.options
    })),
    Match.tag("mcq_multi", (x) => ({
      id: x.id,
      number: x.number,
      _tag: "mcq_multi" as const,
      text: x.text,
      options: x.options
    })),
    Match.tag("true_false", (x) => ({
      id: x.id,
      number: x.number,
      _tag: "true_false" as const,
      text: x.text,
      statements: x.statements.map((s) => ({ text: s.text }))
    })),
    Match.exhaustive
  )
}

export const SessionServiceLive = Layer.effect(
  SessionService,
  Effect.gen(function*() {
    const db = yield* DbClient

    const fetchSessionByCode = (
      code: string
    ): Effect.Effect<SessionRow, SessionNotFoundError | ApiDatabaseError, DbClient> =>
      Effect.gen(function*() {
        const rows = yield* runDb(
          db.select().from(examSessions).where(eq(examSessions.sessionCode, code)).limit(1)
        )
        const row = rows[0]
        if (!row) {
          return yield* Effect.fail(new SessionNotFoundError({ code }))
        }
        return row
      })

    const createSession = (
      userId: string,
      examId: string,
      input: CreateSessionInput
    ): Effect.Effect<
      ExamSession,
      ExamNotFoundError | ExamNotFinalError | SessionSaveError | ApiDatabaseError
    > =>
      Effect.gen(function*() {
        const examRows = yield* runDb(
          db.select().from(exams).where(eq(exams.id, examId)).limit(1)
        )
        const examRow = examRows[0]
        if (!examRow || examRow.userId !== userId) {
          return yield* Effect.fail(new ExamNotFoundError({ examId }))
        }
        if (examRow.status !== "final") {
          return yield* Effect.fail(new ExamNotFinalError({ examId }))
        }
        const now = new Date()
        const inserted = yield* runDb(
          db
            .insert(examSessions)
            .values({
              id: crypto.randomUUID(),
              examId,
              classId: input.classId as string,
              sessionCode: makeSessionCode(),
              opensAt: new Date(input.opensAt),
              closesAt: new Date(input.closesAt),
              durationMinutes: input.durationMinutes ?? null,
              status: "scheduled",
              createdAt: now,
              updatedAt: now
            })
            .returning()
        )
        const row = inserted[0]
        if (!row) {
          return yield* Effect.fail(new SessionSaveError({ cause: "No row returned" }))
        }
        return toExamSession(row)
      }).pipe(Effect.provideService(DbClient, db))

    const getPublicSession = (
      code: string
    ): Effect.Effect<SessionDetailResponse | null, ApiDatabaseError> =>
      Effect.gen(function*() {
        const sessionRows = yield* runDb(
          db.select().from(examSessions).where(eq(examSessions.sessionCode, code)).limit(1)
        )
        const sessionRow = sessionRows[0]
        if (!sessionRow) return null

        const examRows = yield* runDb(
          db.select().from(exams).where(eq(exams.id, sessionRow.examId)).limit(1)
        )
        const examRow = examRows[0]
        if (!examRow) return null

        const questionRows = yield* runDb(
          db
            .select()
            .from(questions)
            .where(eq(questions.examId, sessionRow.examId))
        )

        const exam = toExam(examRow)
        return {
          sessionCode: sessionRow.sessionCode,
          title: exam.title,
          subject: exam.subject,
          grade: exam.grade,
          durationMinutes: sessionRow.durationMinutes,
          opensAt: sessionRow.opensAt instanceof Date
            ? sessionRow.opensAt.toISOString()
            : String(sessionRow.opensAt),
          closesAt: sessionRow.closesAt instanceof Date
            ? sessionRow.closesAt.toISOString()
            : String(sessionRow.closesAt),
          status: sessionRow.status,
          questions: questionRows.map((q) => questionToSessionQuestion(rowToQuestion(q)))
        }
      }).pipe(Effect.provideService(DbClient, db))

    const startSession = (
      code: string,
      input: StartSessionInput
    ): Effect.Effect<SessionStudent, SessionNotFoundError | SessionSaveError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const sessionRow = yield* fetchSessionByCode(code)
        if (input.token !== undefined) {
          const existing = yield* runDb(
            db
              .select()
              .from(sessionStudents)
              .where(and(eq(sessionStudents.sessionId, sessionRow.id), eq(sessionStudents.token, input.token)))
              .limit(1)
          )
          const existingRow = existing[0]
          if (existingRow) return toSessionStudent(existingRow)
        }
        const inserted = yield* runDb(
          db
            .insert(sessionStudents)
            .values({
              id: crypto.randomUUID(),
              sessionId: sessionRow.id,
              studentId: null,
              studentName: input.studentName ?? "Siswa",
              identifier: input.identifier ?? null,
              token: makeToken(),
              joinedAt: new Date(),
              submittedAt: null,
              answers: null
            })
            .returning()
        )
        const row = inserted[0]
        if (!row) {
          return yield* Effect.fail(new SessionSaveError({ cause: "No row returned" }))
        }
        return toSessionStudent(row)
      }).pipe(Effect.provideService(DbClient, db))

    const submitSession = (
      code: string,
      input: SubmitSessionInput
    ): Effect.Effect<
      void,
      | SessionNotFoundError
      | SessionStudentNotFoundError
      | SessionAlreadySubmittedError
      | ApiDatabaseError
    > =>
      Effect.gen(function*() {
        const sessionRow = yield* fetchSessionByCode(code)
        const studentRows = yield* runDb(
          db
            .select()
            .from(sessionStudents)
            .where(and(eq(sessionStudents.sessionId, sessionRow.id), eq(sessionStudents.token, input.token)))
            .limit(1)
        )
        const studentRow = studentRows[0]
        if (!studentRow) {
          return yield* Effect.fail(new SessionStudentNotFoundError({ token: input.token }))
        }
        if (studentRow.submittedAt !== null) {
          return yield* Effect.fail(new SessionAlreadySubmittedError({ token: input.token }))
        }
        yield* runDb(
          db
            .update(sessionStudents)
            .set({ submittedAt: new Date(), answers: input.answers })
            .where(eq(sessionStudents.id, studentRow.id))
        )
      }).pipe(Effect.provideService(DbClient, db))

    return { createSession, getPublicSession, startSession, submitSession }
  })
)
