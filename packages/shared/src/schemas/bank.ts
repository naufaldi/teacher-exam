import { Schema } from 'effect'
import {
  ExamSubjectSchema,
  ExamDifficultySchema,
  ExamTypeSchema,
  AnswerSchema,
  QuestionTypeSchema,
} from './primitives.js'

export const BankSortSchema = Schema.Literal('terbaru', 'terpopuler', 'kesulitan')
export type BankSort = typeof BankSortSchema.Type

// ── Bank Question Input Schemas ────────────────────────────

export const SaveToBankInputSchema = Schema.Struct({
  questionId: Schema.String.pipe(Schema.brand('QuestionId')),
})
export type SaveToBankInput = typeof SaveToBankInputSchema.Type

const browseBankQueryFields = {
  subject: Schema.optional(ExamSubjectSchema),
  grade: Schema.optional(Schema.Number),
  difficulty: Schema.optional(ExamDifficultySchema),
  topic: Schema.optional(Schema.String),
  type: Schema.optional(QuestionTypeSchema),
  author: Schema.optional(Schema.String),
  search: Schema.optional(Schema.String),
  sort: Schema.optional(BankSortSchema),
  page: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThan(0))),
  limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.between(1, 100))),
} as const

export const BrowseBankQuerySchema = Schema.Struct(browseBankQueryFields)
export type BrowseBankQuery = typeof BrowseBankQuerySchema.Type

export const BrowseBankUrlParamsSchema = Schema.Struct({
  subject: browseBankQueryFields.subject,
  grade: Schema.optional(Schema.NumberFromString),
  difficulty: browseBankQueryFields.difficulty,
  topic: browseBankQueryFields.topic,
  type: browseBankQueryFields.type,
  author: browseBankQueryFields.author,
  search: browseBankQueryFields.search,
  sort: browseBankQueryFields.sort,
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

export const PublicBankQuestionSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand('BankQuestionId')),
  questionId: Schema.String.pipe(Schema.brand('QuestionId')),
  authorName: Schema.String,
  subject: ExamSubjectSchema,
  grade: Schema.Number,
  topics: Schema.Array(Schema.String),
  difficulty: ExamDifficultySchema,
  type: Schema.String,
  payload: Schema.Unknown,
  usageCount: Schema.Number,
  createdAt: Schema.String,
  text: Schema.String,
  optionA: Schema.optional(Schema.NullOr(Schema.String)),
  optionB: Schema.optional(Schema.NullOr(Schema.String)),
  optionC: Schema.optional(Schema.NullOr(Schema.String)),
  optionD: Schema.optional(Schema.NullOr(Schema.String)),
  correctAnswer: Schema.optional(Schema.NullOr(AnswerSchema)),
})
export type PublicBankQuestion = typeof PublicBankQuestionSchema.Type

export const PaginatedPublicBankResponseSchema = Schema.Struct({
  data: Schema.Array(PublicBankQuestionSchema),
  total: Schema.Number,
  page: Schema.Number,
  limit: Schema.Number,
})
export type PaginatedPublicBankResponse = typeof PaginatedPublicBankResponseSchema.Type

export const BuildExamFromBankMetadataSchema = Schema.Struct({
  subject: ExamSubjectSchema,
  grade: Schema.Int.pipe(Schema.between(5, 6)),
  difficulty: Schema.optional(ExamDifficultySchema),
  topics: Schema.optional(Schema.Array(Schema.String)),
  schoolName: Schema.optional(Schema.String),
  academicYear: Schema.optional(Schema.String),
  examType: Schema.optional(ExamTypeSchema),
  examDate: Schema.optional(Schema.String),
  durationMinutes: Schema.optional(Schema.Int),
  instructions: Schema.optional(Schema.String),
  classContext: Schema.optional(Schema.String),
})
export type BuildExamFromBankMetadata = typeof BuildExamFromBankMetadataSchema.Type

export const BuildExamFromBankInputSchema = Schema.Struct({
  bankQuestionIds: Schema.Array(Schema.String).pipe(Schema.minItems(5), Schema.maxItems(50)),
  metadata: BuildExamFromBankMetadataSchema,
})
export type BuildExamFromBankInput = typeof BuildExamFromBankInputSchema.Type

export const BuildExamFromBankResponseSchema = Schema.Struct({
  examId: Schema.String.pipe(Schema.brand('ExamId')),
})
export type BuildExamFromBankResponse = typeof BuildExamFromBankResponseSchema.Type
