import { Schema } from "effect"
import { ClassIdSchema } from "./classes.js"
import { ExamIdSchema } from "./entities.js"
import { QuestionTypeSchema } from "./primitives.js"

// ── Score distribution ─────────────────────────────────────
export const ScoreBandSchema = Schema.Struct({
  range: Schema.String,
  count: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
})
export type ScoreBand = typeof ScoreBandSchema.Type

// ── Per-question analytics ─────────────────────────────────
const RateSchema = Schema.Int.pipe(Schema.between(0, 100))

export const QuestionAnalyticsSchema = Schema.Struct({
  questionId: Schema.String,
  number: Schema.Int,
  type: QuestionTypeSchema,
  correctRate: RateSchema,
  answeredCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
})
export type QuestionAnalytics = typeof QuestionAnalyticsSchema.Type

// ── Exam analytics ─────────────────────────────────────────
export const ExamAnalyticsResponseSchema = Schema.Struct({
  examId: ExamIdSchema,
  examTitle: Schema.String,
  sessionCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  participantCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  averageScore: RateSchema,
  completionRate: Schema.Int.pipe(Schema.between(0, 100)),
  scoreDistribution: Schema.Array(ScoreBandSchema),
  perQuestion: Schema.Array(QuestionAnalyticsSchema)
})
export type ExamAnalyticsResponse = typeof ExamAnalyticsResponseSchema.Type

// ── Class analytics ────────────────────────────────────────
export const ClassAnalyticsResponseSchema = Schema.Struct({
  classId: ClassIdSchema,
  className: Schema.String,
  examCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  participantCount: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  averageScore: RateSchema
})
export type ClassAnalyticsResponse = typeof ClassAnalyticsResponseSchema.Type
