import { Schema } from 'effect'
import {
  ExamSubjectSchema,
  ExamDifficultySchema,
  ReviewModeSchema,
  ExamStatusSchema,
  AnswerSchema,
  QuestionStatusSchema,
  ValidationStatusSchema,
} from './primitives.js'

// ── User ───────────────────────────────────────────────────
export const UserSchema = Schema.Struct({
  id:        Schema.String,
  googleId:  Schema.String,
  name:      Schema.String,
  email:     Schema.String,
  avatarUrl: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
})
export type User = typeof UserSchema.Type

// ── Question ───────────────────────────────────────────────
export const QuestionSchema = Schema.Struct({
  id:               Schema.String,
  examId:           Schema.String,
  number:           Schema.Int,
  text:             Schema.String,
  optionA:          Schema.String,
  optionB:          Schema.String,
  optionC:          Schema.String,
  optionD:          Schema.String,
  correctAnswer:    AnswerSchema,
  topic:            Schema.NullOr(Schema.String),
  difficulty:       Schema.NullOr(Schema.String),
  status:           QuestionStatusSchema,
  validationStatus: Schema.NullOr(ValidationStatusSchema),
  validationReason: Schema.NullOr(Schema.String),
  createdAt:        Schema.String,
})
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
export const GeneratedQuestionSchema = Schema.Struct({
  number:         Schema.Int,
  text:           Schema.NonEmptyString,
  option_a:       Schema.NonEmptyString,
  option_b:       Schema.NonEmptyString,
  option_c:       Schema.NonEmptyString,
  option_d:       Schema.NonEmptyString,
  correct_answer: AnswerSchema,
  topic:          Schema.String,
  difficulty:     Schema.String,
})
export type GeneratedQuestion = typeof GeneratedQuestionSchema.Type
