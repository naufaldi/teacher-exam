import { Schema } from "effect"
import { FigureSpecSchema } from "./figures.js"
import {
  AnswerLetterSchema,
  CognitiveLevelSchema,
  ExamDifficultySchema,
  ExamStatusSchema,
  ExamSubjectSchema,
  type ExamType,
  GradeSchema,
  MultiAnswerSchema,
  QuestionStatusSchema,
  ReviewModeSchema,
  ValidationStatusSchema
} from "./primitives.js"

// ── Branded IDs ────────────────────────────────────────────
export const UserIdSchema = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserIdSchema.Type

export const ExamIdSchema = Schema.String.pipe(Schema.brand("ExamId"))
export type ExamId = typeof ExamIdSchema.Type

export const QuestionIdSchema = Schema.String.pipe(Schema.brand("QuestionId"))
export type QuestionId = typeof QuestionIdSchema.Type

export const PdfUploadIdSchema = Schema.String.pipe(Schema.brand("PdfUploadId"))
export type PdfUploadId = typeof PdfUploadIdSchema.Type

export const BankQuestionIdSchema = Schema.String.pipe(Schema.brand("BankQuestionId"))
export type BankQuestionId = typeof BankQuestionIdSchema.Type

export const brandUserId = (id: string): UserId => Schema.decodeSync(UserIdSchema)(id)
export const brandExamId = (id: string): ExamId => Schema.decodeSync(ExamIdSchema)(id)
export const brandQuestionId = (id: string): QuestionId => Schema.decodeSync(QuestionIdSchema)(id)
export const brandPdfUploadId = (id: string): PdfUploadId => Schema.decodeSync(PdfUploadIdSchema)(id)
export const brandBankQuestionId = (id: string): BankQuestionId => Schema.decodeSync(BankQuestionIdSchema)(id)

// ── User profile ───────────────────────────────────────────
export const UserProfileSchema = Schema.Struct({
  id: UserIdSchema,
  email: Schema.String,
  name: Schema.String,
  username: Schema.String,
  image: Schema.NullOr(Schema.String),
  school: Schema.NullOr(Schema.String),
  gradesTaught: Schema.NullOr(Schema.Array(GradeSchema)),
  subjectsTaught: Schema.NullOr(Schema.Array(ExamSubjectSchema)),
  profileCompleted: Schema.Boolean,
  locale: Schema.String,
  timezone: Schema.String
})
export type UserProfile = typeof UserProfileSchema.Type

// ── Question ───────────────────────────────────────────────

const Options4Schema = Schema.Struct({
  a: Schema.NonEmptyString,
  b: Schema.NonEmptyString,
  c: Schema.NonEmptyString,
  d: Schema.NonEmptyString
})

const QuestionCommonFields = {
  id: QuestionIdSchema,
  examId: ExamIdSchema,
  number: Schema.Int,
  text: Schema.NonEmptyString,
  topic: Schema.NullOr(Schema.String),
  difficulty: Schema.NullOr(Schema.String),
  status: QuestionStatusSchema,
  validationStatus: Schema.NullOr(ValidationStatusSchema),
  validationReason: Schema.NullOr(Schema.String),
  /** True when bulk generate could not produce this soal; guru should use Regenerate. */
  generationFailed: Schema.optional(Schema.Boolean),
  figure: Schema.optional(Schema.NullOr(FigureSpecSchema)),
  createdAt: Schema.String
} as const

export const McqSingleQuestionSchema = Schema.TaggedStruct("mcq_single", {
  ...QuestionCommonFields,
  options: Options4Schema,
  correct: AnswerLetterSchema
})
export type McqSingleQuestion = typeof McqSingleQuestionSchema.Type

export const McqMultiQuestionSchema = Schema.TaggedStruct("mcq_multi", {
  ...QuestionCommonFields,
  options: Options4Schema,
  correct: MultiAnswerSchema
})
export type McqMultiQuestion = typeof McqMultiQuestionSchema.Type

export const TrueFalseQuestionSchema = Schema.TaggedStruct("true_false", {
  ...QuestionCommonFields,
  statements: Schema.Array(
    Schema.Struct({ text: Schema.NonEmptyString, answer: Schema.Boolean })
  ).pipe(Schema.minItems(3), Schema.maxItems(4))
})
export type TrueFalseQuestion = typeof TrueFalseQuestionSchema.Type

export const QuestionSchema = Schema.Union(
  McqSingleQuestionSchema,
  McqMultiQuestionSchema,
  TrueFalseQuestionSchema
)
export type Question = typeof QuestionSchema.Type

// ── Exam (without questions) ───────────────────────────────
export const ExamSchema = Schema.Struct({
  id: ExamIdSchema,
  userId: UserIdSchema,
  title: Schema.String,
  subject: ExamSubjectSchema,
  grade: Schema.Int,
  difficulty: ExamDifficultySchema,
  topics: Schema.Array(Schema.String),
  reviewMode: ReviewModeSchema,
  status: ExamStatusSchema,
  schoolName: Schema.NullOr(Schema.String),
  academicYear: Schema.NullOr(Schema.String),
  examType: Schema.String,
  examDate: Schema.NullOr(Schema.String),
  durationMinutes: Schema.NullOr(Schema.Int),
  instructions: Schema.NullOr(Schema.String),
  classContext: Schema.NullOr(Schema.String),
  discussionMd: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String
})
export type Exam = typeof ExamSchema.Type

// ── Exam with questions (detail view) ─────────────────────
export const ExamWithQuestionsSchema = Schema.Struct({
  ...ExamSchema.fields,
  questions: Schema.Array(QuestionSchema),
  /** Set when bulk generate salvaged partial output; some numbers need regen. */
  generationIncomplete: Schema.optional(Schema.Boolean),
  failedQuestionNumbers: Schema.optional(Schema.Array(Schema.Int))
})
export type ExamWithQuestions = typeof ExamWithQuestionsSchema.Type

export const PublicExamSchema = Schema.Struct({
  id: ExamIdSchema,
  title: Schema.String,
  subject: ExamSubjectSchema,
  grade: Schema.Int,
  difficulty: ExamDifficultySchema,
  topics: Schema.Array(Schema.String),
  reviewMode: ReviewModeSchema,
  status: ExamStatusSchema,
  schoolName: Schema.NullOr(Schema.String),
  academicYear: Schema.NullOr(Schema.String),
  examType: Schema.String,
  examDate: Schema.NullOr(Schema.String),
  durationMinutes: Schema.NullOr(Schema.Int),
  instructions: Schema.NullOr(Schema.String),
  classContext: Schema.NullOr(Schema.String),
  discussionMd: Schema.NullOr(Schema.String),
  publishedAt: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String
})
export type PublicExam = typeof PublicExamSchema.Type

export const PublicExamWithQuestionsSchema = Schema.Struct({
  ...PublicExamSchema.fields,
  questions: Schema.Array(QuestionSchema)
})
export type PublicExamWithQuestions = typeof PublicExamWithQuestionsSchema.Type

// ── PDF Upload ─────────────────────────────────────────────
export const PdfUploadSchema = Schema.Struct({
  id: PdfUploadIdSchema,
  userId: UserIdSchema,
  examId: Schema.NullOr(ExamIdSchema),
  fileName: Schema.String,
  fileSize: Schema.Int,
  extractedText: Schema.NullOr(Schema.String),
  uploadedAt: Schema.String,
  expiresAt: Schema.String
})
export type PdfUpload = typeof PdfUploadSchema.Type

// ── AI-generated question (from Claude response) ───────────

const GeneratedBaseFields = {
  number: Schema.Int,
  text: Schema.NonEmptyString,
  topic: Schema.String,
  difficulty: Schema.String,
  cognitive_level: Schema.optional(CognitiveLevelSchema),
  figure: Schema.optional(Schema.Unknown)
} as const

const GeneratedMcqCommonFields = {
  ...GeneratedBaseFields,
  option_a: Schema.NonEmptyString,
  option_b: Schema.NonEmptyString,
  option_c: Schema.NonEmptyString,
  option_d: Schema.NonEmptyString
} as const

const GeneratedMcqSingleSchema = Schema.TaggedStruct("mcq_single", {
  ...GeneratedMcqCommonFields,
  correct_answer: AnswerLetterSchema
})

const GeneratedMcqMultiSchema = Schema.TaggedStruct("mcq_multi", {
  ...GeneratedMcqCommonFields,
  correct_answers: MultiAnswerSchema
})

const GeneratedTrueFalseSchema = Schema.TaggedStruct("true_false", {
  ...GeneratedBaseFields,
  statements: Schema.Array(
    Schema.Struct({ text: Schema.NonEmptyString, answer: Schema.Literal("B", "S") })
  ).pipe(Schema.minItems(3), Schema.maxItems(4))
})

export const GeneratedQuestionSchema = Schema.Union(
  GeneratedMcqSingleSchema,
  GeneratedMcqMultiSchema,
  GeneratedTrueFalseSchema
)
export type GeneratedQuestion = typeof GeneratedQuestionSchema.Type

/**
 * Normalize raw `exam_type` text from DB to a strict {@link ExamType}.
 * Handles legacy uppercase 'TKA' (default value before §8.6) and unknown
 * values (defaults to 'formatif' — current canonical default).
 */
export function normalizeExamType(raw: string | null | undefined): ExamType {
  if (!raw) return "formatif"
  const v = raw.trim().toLowerCase()
  switch (v) {
    case "latihan":
    case "formatif":
    case "sts":
    case "sas":
    case "tka":
      return v
    default:
      return "formatif"
  }
}
