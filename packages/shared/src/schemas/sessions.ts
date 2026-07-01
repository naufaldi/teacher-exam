import { Schema } from "effect"
import { ClassIdSchema } from "./classes.js"
import { ExamIdSchema } from "./entities.js"
import { ExamSubjectSchema } from "./primitives.js"

// ── Branded IDs ────────────────────────────────────────────
export const SessionIdSchema = Schema.String.pipe(Schema.brand("SessionId"))
export type SessionId = typeof SessionIdSchema.Type

export const SessionCodeSchema = Schema.String.pipe(Schema.brand("SessionCode"))
export type SessionCode = typeof SessionCodeSchema.Type

export const SessionStatusSchema = Schema.Literal("scheduled", "open", "closed")
export type SessionStatus = typeof SessionStatusSchema.Type

// ── Exam session entity (teacher view) ─────────────────────
export const ExamSessionSchema = Schema.Struct({
  id: SessionIdSchema,
  examId: ExamIdSchema,
  classId: ClassIdSchema,
  sessionCode: Schema.NonEmptyString,
  opensAt: Schema.String,
  closesAt: Schema.String,
  durationMinutes: Schema.NullOr(Schema.Int),
  status: SessionStatusSchema,
  createdAt: Schema.String,
  updatedAt: Schema.String
})
export type ExamSession = typeof ExamSessionSchema.Type

export const SessionSchema = ExamSessionSchema
export type Session = ExamSession

// ── Session student enrollment ─────────────────────────────
export const SessionStudentSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand("SessionStudentId")),
  sessionId: SessionIdSchema,
  studentId: Schema.NullOr(Schema.String.pipe(Schema.brand("StudentId"))),
  studentName: Schema.NonEmptyString,
  identifier: Schema.NullOr(Schema.String),
  token: Schema.NonEmptyString,
  joinedAt: Schema.String,
  submittedAt: Schema.NullOr(Schema.String)
})
export type SessionStudent = typeof SessionStudentSchema.Type

// ── API inputs ─────────────────────────────────────────────
export const CreateSessionInputSchema = Schema.Struct({
  classId: ClassIdSchema,
  opensAt: Schema.String,
  closesAt: Schema.String,
  durationMinutes: Schema.optional(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)))
})
export type CreateSessionInput = typeof CreateSessionInputSchema.Type

export const StartSessionInputSchema = Schema.Struct({
  token: Schema.optional(Schema.NonEmptyString),
  studentName: Schema.optional(Schema.NonEmptyString),
  identifier: Schema.optional(Schema.String)
}).pipe(
  Schema.filter(
    (input) => input.token !== undefined || (input.studentName !== undefined && input.studentName.length > 0),
    { message: () => "Either token or studentName is required" }
  )
)
export type StartSessionInput = typeof StartSessionInputSchema.Type

// ── Student answers (submit) ───────────────────────────────
const AnswerLetterSchema = Schema.Literal("a", "b", "c", "d")

export const McqSingleAnswerSchema = Schema.Struct({
  _tag: Schema.Literal("mcq_single"),
  answer: AnswerLetterSchema
})
export type McqSingleAnswer = typeof McqSingleAnswerSchema.Type

export const McqMultiAnswerSchema = Schema.Struct({
  _tag: Schema.Literal("mcq_multi"),
  answers: Schema.Array(AnswerLetterSchema).pipe(Schema.minItems(1))
})
export type McqMultiAnswer = typeof McqMultiAnswerSchema.Type

export const TrueFalseAnswerSchema = Schema.Struct({
  _tag: Schema.Literal("true_false"),
  answers: Schema.Array(Schema.Boolean).pipe(Schema.minItems(1))
})
export type TrueFalseAnswer = typeof TrueFalseAnswerSchema.Type

export const StudentAnswerSchema = Schema.Union(
  McqSingleAnswerSchema,
  McqMultiAnswerSchema,
  TrueFalseAnswerSchema
)
export type StudentAnswer = typeof StudentAnswerSchema.Type

export const SubmitSessionInputSchema = Schema.Struct({
  token: Schema.NonEmptyString,
  answers: Schema.Record({ key: Schema.String, value: StudentAnswerSchema })
})
export type SubmitSessionInput = typeof SubmitSessionInputSchema.Type

// ── Public session detail (NO correct answers) ─────────────
const SessionMcqSingleQuestionSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand("QuestionId")),
  number: Schema.Int,
  _tag: Schema.Literal("mcq_single"),
  text: Schema.String,
  options: Schema.Struct({
    a: Schema.String,
    b: Schema.String,
    c: Schema.String,
    d: Schema.String
  })
})

const SessionMcqMultiQuestionSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand("QuestionId")),
  number: Schema.Int,
  _tag: Schema.Literal("mcq_multi"),
  text: Schema.String,
  options: Schema.Struct({
    a: Schema.String,
    b: Schema.String,
    c: Schema.String,
    d: Schema.String
  })
})

const SessionTrueFalseQuestionSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand("QuestionId")),
  number: Schema.Int,
  _tag: Schema.Literal("true_false"),
  text: Schema.String,
  statements: Schema.Array(Schema.Struct({ text: Schema.String }))
})

export const SessionQuestionSchema = Schema.Union(
  SessionMcqSingleQuestionSchema,
  SessionMcqMultiQuestionSchema,
  SessionTrueFalseQuestionSchema
)
export type SessionQuestion = typeof SessionQuestionSchema.Type

export const SessionDetailResponseSchema = Schema.Struct({
  sessionCode: Schema.NonEmptyString,
  title: Schema.String,
  subject: Schema.String,
  grade: Schema.Int,
  durationMinutes: Schema.NullOr(Schema.Int),
  opensAt: Schema.String,
  closesAt: Schema.String,
  status: SessionStatusSchema,
  questions: Schema.Array(SessionQuestionSchema)
})
export type SessionDetailResponse = typeof SessionDetailResponseSchema.Type

export const SubmitSessionResponseSchema = Schema.Struct({
  ok: Schema.Boolean
})
export type SubmitSessionResponse = typeof SubmitSessionResponseSchema.Type

export type SessionListResponse = ReadonlyArray<ExamSession>
