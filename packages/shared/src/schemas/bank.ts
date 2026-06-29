import { Schema } from "effect"
import { ExamIdSchema, UserIdSchema } from "./entities.js"
import { ExamDifficultySchema, ExamSubjectSchema } from "./primitives.js"

export const BankSortSchema = Schema.Literal("terbaru", "terpopuler", "kesulitan")
export type BankSort = typeof BankSortSchema.Type

export const BrowseBankSheetsQuerySchema = Schema.Struct({
  subject: Schema.optional(ExamSubjectSchema),
  grade: Schema.optional(Schema.Number),
  difficulty: Schema.optional(ExamDifficultySchema),
  topic: Schema.optional(Schema.String),
  author: Schema.optional(Schema.String),
  search: Schema.optional(Schema.String),
  sort: Schema.optional(BankSortSchema),
  page: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThan(0))),
  limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.between(1, 100)))
})
export type BrowseBankSheetsQuery = typeof BrowseBankSheetsQuerySchema.Type

export const BrowseBankSheetsUrlParamsSchema = Schema.Struct({
  subject: BrowseBankSheetsQuerySchema.fields.subject,
  grade: Schema.optional(Schema.NumberFromString),
  difficulty: BrowseBankSheetsQuerySchema.fields.difficulty,
  topic: BrowseBankSheetsQuerySchema.fields.topic,
  author: BrowseBankSheetsQuerySchema.fields.author,
  search: BrowseBankSheetsQuerySchema.fields.search,
  sort: BrowseBankSheetsQuerySchema.fields.sort,
  page: Schema.optional(Schema.NumberFromString.pipe(Schema.int(), Schema.greaterThan(0))),
  limit: Schema.optional(Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 100)))
})
export type BrowseBankSheetsUrlParams = typeof BrowseBankSheetsUrlParamsSchema.Type

export const BankSheetSchema = Schema.Struct({
  id: ExamIdSchema,
  userId: UserIdSchema,
  title: Schema.String,
  subject: ExamSubjectSchema,
  grade: Schema.Int,
  difficulty: ExamDifficultySchema,
  topics: Schema.Array(Schema.String),
  examType: Schema.String,
  status: Schema.Literal("final"),
  isPublic: Schema.Boolean,
  questionCount: Schema.Number,
  bankedAt: Schema.String,
  createdAt: Schema.String
})
export type BankSheet = typeof BankSheetSchema.Type

export const PublicBankSheetSchema = Schema.Struct({
  id: ExamIdSchema,
  title: Schema.String,
  subject: ExamSubjectSchema,
  grade: Schema.Int,
  difficulty: ExamDifficultySchema,
  topics: Schema.Array(Schema.String),
  examType: Schema.String,
  status: Schema.Literal("final"),
  isPublic: Schema.Boolean,
  questionCount: Schema.Number,
  authorName: Schema.String,
  bankedAt: Schema.String,
  createdAt: Schema.String
})
export type PublicBankSheet = typeof PublicBankSheetSchema.Type

export const PaginatedBankSheetsResponseSchema = Schema.Struct({
  data: Schema.Array(BankSheetSchema),
  total: Schema.Number,
  page: Schema.Number,
  limit: Schema.Number
})
export type PaginatedBankSheetsResponse = typeof PaginatedBankSheetsResponseSchema.Type

export const PaginatedPublicBankSheetsResponseSchema = Schema.Struct({
  data: Schema.Array(PublicBankSheetSchema),
  total: Schema.Number,
  page: Schema.Number,
  limit: Schema.Number
})
export type PaginatedPublicBankSheetsResponse = typeof PaginatedPublicBankSheetsResponseSchema.Type

export const UpdateBankSheetInputSchema = Schema.Struct({
  isPublic: Schema.optional(Schema.Boolean)
})
export type UpdateBankSheetInput = typeof UpdateBankSheetInputSchema.Type

export const UseBankSheetInputSchema = Schema.Struct({
  sourceExamId: ExamIdSchema
})
export type UseBankSheetInput = typeof UseBankSheetInputSchema.Type

export const UseBankSheetResponseSchema = Schema.Struct({
  examId: ExamIdSchema
})
export type UseBankSheetResponse = typeof UseBankSheetResponseSchema.Type
