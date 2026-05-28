import { Schema } from 'effect'
import {
  ExamSubjectSchema,
  ExamDifficultySchema,
  AnswerSchema,
} from './primitives.js'

// ── Bank Question Input Schemas ────────────────────────────

export const SaveToBankInputSchema = Schema.Struct({
  questionId: Schema.String.pipe(Schema.brand('QuestionId')),
})
export type SaveToBankInput = typeof SaveToBankInputSchema.Type

export const BrowseBankQuerySchema = Schema.Struct({
  subject: Schema.optional(ExamSubjectSchema),
  grade: Schema.optional(Schema.Number),
  difficulty: Schema.optional(ExamDifficultySchema),
  topic: Schema.optional(Schema.String),
  search: Schema.optional(Schema.String),
  page: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThan(0))),
  limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.between(1, 100))),
})
export type BrowseBankQuery = typeof BrowseBankQuerySchema.Type

export const BrowseBankUrlParamsSchema = Schema.Struct({
  subject: Schema.optional(ExamSubjectSchema),
  grade: Schema.optional(Schema.NumberFromString),
  difficulty: Schema.optional(ExamDifficultySchema),
  topic: Schema.optional(Schema.String),
  search: Schema.optional(Schema.String),
  page: Schema.optional(Schema.NumberFromString.pipe(Schema.int(), Schema.greaterThan(0))),
  limit: Schema.optional(Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 100))),
})
export type BrowseBankUrlParams = typeof BrowseBankUrlParamsSchema.Type

export const UpdateBankQuestionInputSchema = Schema.Struct({
  isPublic: Schema.optional(Schema.Boolean),
})
export type UpdateBankQuestionInput = typeof UpdateBankQuestionInputSchema.Type

// ── Bank Question Response Schemas ─────────────────────────

export const BankQuestionSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand('BankQuestionId')),
  questionId: Schema.String.pipe(Schema.brand('QuestionId')),
  userId: Schema.String,
  subject: ExamSubjectSchema,
  grade: Schema.Number,
  topics: Schema.Array(Schema.String),
  difficulty: ExamDifficultySchema,
  type: Schema.String,
  payload: Schema.Unknown,
  isPublic: Schema.Boolean,
  usageCount: Schema.Number,
  createdAt: Schema.String,
  text: Schema.String,
  optionA: Schema.optional(Schema.NullOr(Schema.String)),
  optionB: Schema.optional(Schema.NullOr(Schema.String)),
  optionC: Schema.optional(Schema.NullOr(Schema.String)),
  optionD: Schema.optional(Schema.NullOr(Schema.String)),
  correctAnswer: Schema.optional(Schema.NullOr(AnswerSchema)),
})
export type BankQuestion = typeof BankQuestionSchema.Type

export const PaginatedBankResponseSchema = Schema.Struct({
  data: Schema.Array(BankQuestionSchema),
  total: Schema.Number,
  page: Schema.Number,
  limit: Schema.Number,
})
export type PaginatedBankResponse = typeof PaginatedBankResponseSchema.Type
