import { Schema } from 'effect'
import {
  ExamSubjectSchema,
  ExamDifficultySchema,
  ReviewModeSchema,
  ExamStatusSchema,
  AnswerLetterSchema,
  MultiAnswerSchema,
  CognitiveLevelSchema,
  QuestionStatusSchema,
  ValidationStatusSchema,
  type ExamType,
} from './primitives.js'

// ── User profile ───────────────────────────────────────────
export const GradeSchema = Schema.Literal(1, 2, 3, 4, 5, 6)
export type Grade = typeof GradeSchema.Type

export const UserProfileSchema = Schema.Struct({
  id:               Schema.String,
  email:            Schema.String,
  name:             Schema.String,
  username:         Schema.String,
  image:            Schema.NullOr(Schema.String),
  school:           Schema.NullOr(Schema.String),
  gradesTaught:     Schema.NullOr(Schema.Array(GradeSchema)),
  subjectsTaught:   Schema.NullOr(Schema.Array(ExamSubjectSchema)),
  profileCompleted: Schema.Boolean,
  locale:           Schema.String,
  timezone:         Schema.String,
})
export type UserProfile = typeof UserProfileSchema.Type

// ── Question ───────────────────────────────────────────────

const Options4Schema = Schema.Struct({
  a: Schema.NonEmptyString,
  b: Schema.NonEmptyString,
  c: Schema.NonEmptyString,
  d: Schema.NonEmptyString,
})

const QuestionCommonFields = {
  id:               Schema.String,
  examId:           Schema.String,
  number:           Schema.Int,
  text:             Schema.NonEmptyString,
  topic:            Schema.NullOr(Schema.String),
  difficulty:       Schema.NullOr(Schema.String),
  status:           QuestionStatusSchema,
  validationStatus: Schema.NullOr(ValidationStatusSchema),
  validationReason: Schema.NullOr(Schema.String),
  createdAt:        Schema.String,
} as const

export const McqSingleQuestionSchema = Schema.Struct({
  _tag:    Schema.Literal('mcq_single'),
  ...QuestionCommonFields,
  options: Options4Schema,
  correct: AnswerLetterSchema,
})
export type McqSingleQuestion = typeof McqSingleQuestionSchema.Type

export const McqMultiQuestionSchema = Schema.Struct({
  _tag:    Schema.Literal('mcq_multi'),
  ...QuestionCommonFields,
  options: Options4Schema,
  correct: MultiAnswerSchema,
})
export type McqMultiQuestion = typeof McqMultiQuestionSchema.Type

export const TrueFalseQuestionSchema = Schema.Struct({
  _tag:       Schema.Literal('true_false'),
  ...QuestionCommonFields,
  statements: Schema.Array(
    Schema.Struct({ text: Schema.NonEmptyString, answer: Schema.Boolean })
  ).pipe(Schema.minItems(3), Schema.maxItems(4)),
})
export type TrueFalseQuestion = typeof TrueFalseQuestionSchema.Type

export const QuestionSchema = Schema.Union(
  McqSingleQuestionSchema,
  McqMultiQuestionSchema,
  TrueFalseQuestionSchema,
)
export type Question = typeof QuestionSchema.Type

// ── Exam (without questions) ───────────────────────────────
export const ExamSchema = Schema.Struct({
  id:              Schema.String,
  userId:          Schema.String,
  title:           Schema.String,
  subject:         ExamSubjectSchema,
  grade:           Schema.Int,
  difficulty:      ExamDifficultySchema,
  topic:           Schema.String,
  reviewMode:      ReviewModeSchema,
  status:          ExamStatusSchema,
  schoolName:      Schema.NullOr(Schema.String),
  academicYear:    Schema.NullOr(Schema.String),
  examType:        Schema.String,
  examDate:        Schema.NullOr(Schema.String),
  durationMinutes: Schema.NullOr(Schema.Int),
  instructions:    Schema.NullOr(Schema.String),
  classContext:    Schema.NullOr(Schema.String),
  discussionMd:    Schema.NullOr(Schema.String),
  createdAt:       Schema.String,
  updatedAt:       Schema.String,
})
export type Exam = typeof ExamSchema.Type

// ── Exam with questions (detail view) ─────────────────────
export const ExamWithQuestionsSchema = Schema.Struct({
  ...ExamSchema.fields,
  questions: Schema.Array(QuestionSchema),
})
export type ExamWithQuestions = typeof ExamWithQuestionsSchema.Type

// ── PDF Upload ─────────────────────────────────────────────
export const PdfUploadSchema = Schema.Struct({
  id:            Schema.String,
  userId:        Schema.String,
  examId:        Schema.NullOr(Schema.String),
  fileName:      Schema.String,
  fileSize:      Schema.Int,
  extractedText: Schema.NullOr(Schema.String),
  uploadedAt:    Schema.String,
  expiresAt:     Schema.String,
})
export type PdfUpload = typeof PdfUploadSchema.Type

// ── AI-generated question (from Claude response) ───────────

const GeneratedBaseFields = {
  number:          Schema.Int,
  text:            Schema.NonEmptyString,
  topic:           Schema.String,
  difficulty:      Schema.String,
  cognitive_level: Schema.optional(CognitiveLevelSchema),
} as const

const GeneratedMcqCommonFields = {
  ...GeneratedBaseFields,
  option_a: Schema.NonEmptyString,
  option_b: Schema.NonEmptyString,
  option_c: Schema.NonEmptyString,
  option_d: Schema.NonEmptyString,
} as const

const GeneratedMcqSingleSchema = Schema.Struct({
  _tag:           Schema.Literal('mcq_single'),
  ...GeneratedMcqCommonFields,
  correct_answer: AnswerLetterSchema,
})

const GeneratedMcqMultiSchema = Schema.Struct({
  _tag:            Schema.Literal('mcq_multi'),
  ...GeneratedMcqCommonFields,
  correct_answers: MultiAnswerSchema,
})

const GeneratedTrueFalseSchema = Schema.Struct({
  _tag:       Schema.Literal('true_false'),
  ...GeneratedBaseFields,
  statements: Schema.Array(
    Schema.Struct({ text: Schema.NonEmptyString, answer: Schema.Literal('B', 'S') })
  ).pipe(Schema.minItems(3), Schema.maxItems(4)),
})

export const GeneratedQuestionSchema = Schema.Union(
  GeneratedMcqSingleSchema,
  GeneratedMcqMultiSchema,
  GeneratedTrueFalseSchema,
)
export type GeneratedQuestion = typeof GeneratedQuestionSchema.Type

/**
 * Normalize raw `exam_type` text from DB to a strict {@link ExamType}.
 * Handles legacy uppercase 'TKA' (default value before §8.6) and unknown
 * values (defaults to 'formatif' — current canonical default).
 */
export function normalizeExamType(raw: string | null | undefined): ExamType {
  if (!raw) return 'formatif'
  const v = raw.trim().toLowerCase()
  switch (v) {
    case 'latihan':
    case 'formatif':
    case 'sts':
    case 'sas':
    case 'tka':
      return v
    default:
      return 'formatif'
  }
}
