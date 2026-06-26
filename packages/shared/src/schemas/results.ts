import { Schema } from "effect"
import { ExamIdSchema } from "./entities.js"
import { QuestionTypeSchema } from "./primitives.js"
import { SessionIdSchema } from "./sessions.js"

// ── Branded IDs ────────────────────────────────────────────
export const ResultIdSchema = Schema.String.pipe(Schema.brand("ResultId"))
export type ResultId = typeof ResultIdSchema.Type

export const SessionStudentIdSchema = Schema.String.pipe(Schema.brand("SessionStudentId"))
export type SessionStudentId = typeof SessionStudentIdSchema.Type

export const GradedStatusSchema = Schema.Literal("auto", "manual", "pending")
export type GradedStatus = typeof GradedStatusSchema.Type

// ── Per-question grading result ────────────────────────────
export const QuestionResultSchema = Schema.Struct({
  questionId: Schema.String,
  number: Schema.Int,
  type: QuestionTypeSchema,
  isCorrect: Schema.Boolean
})
export type QuestionResult = typeof QuestionResultSchema.Type

// ── Session result entity (graded student) ─────────────────
const ScoreSchema = Schema.Int.pipe(Schema.between(0, 100))

export const SessionResultSchema = Schema.Struct({
  id: ResultIdSchema,
  sessionId: SessionIdSchema,
  sessionStudentId: SessionStudentIdSchema,
  studentName: Schema.String,
  examId: ExamIdSchema,
  score: ScoreSchema,
  correctCount: Schema.Int,
  totalCount: Schema.Int,
  gradedStatus: GradedStatusSchema,
  answers: Schema.Array(QuestionResultSchema),
  gradedAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String
})
export type SessionResult = typeof SessionResultSchema.Type

// ── Class results stats ────────────────────────────────────
export const ResultsStatsSchema = Schema.Struct({
  participantCount: Schema.Int,
  averageScore: ScoreSchema,
  highestScore: ScoreSchema,
  lowestScore: ScoreSchema,
  passingCount: Schema.Int,
  passingThreshold: Schema.Int
})
export type ResultsStats = typeof ResultsStatsSchema.Type

// ── Teacher: list results for a session ────────────────────
export const SessionResultsResponseSchema = Schema.Struct({
  sessionId: SessionIdSchema,
  examId: ExamIdSchema,
  examTitle: Schema.String,
  results: Schema.Array(SessionResultSchema),
  stats: ResultsStatsSchema
})
export type SessionResultsResponse = typeof SessionResultsResponseSchema.Type

// ── Auto-grade response ────────────────────────────────────
export const GradeSessionResponseSchema = Schema.Struct({
  gradedCount: Schema.Int
})
export type GradeSessionResponse = typeof GradeSessionResponseSchema.Type

// ── Manual grade override input ────────────────────────────
export const GradeResultInputSchema = Schema.Struct({
  score: ScoreSchema,
  correctCount: Schema.Int,
  answers: Schema.Array(QuestionResultSchema)
})
export type GradeResultInput = typeof GradeResultInputSchema.Type
