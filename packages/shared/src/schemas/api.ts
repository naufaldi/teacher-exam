import { Schema } from 'effect'
import {
  ExamSubjectSchema,
  ExamDifficultySchema,
  ReviewModeSchema,
  AnswerSchema,
} from './primitives.js'
import { ExamSchema, ExamWithQuestionsSchema, QuestionSchema } from './entities.js'
import type { Exam, ExamWithQuestions, Question, PdfUpload, User } from './entities.js'

// ── Exam API ───────────────────────────────────────────────

export const GenerateExamInputSchema = Schema.Struct({
  examId:           Schema.String,
  subject:          ExamSubjectSchema,
  grade:            Schema.Int.pipe(Schema.between(5, 6)),
  difficulty:       ExamDifficultySchema,
  topic:            Schema.NonEmptyString,
  reviewMode:       ReviewModeSchema,
  classContext:     Schema.optional(Schema.String),
  pdfUploadId:      Schema.optional(Schema.String),
  exampleQuestions: Schema.optional(Schema.String),
})
export type GenerateExamInput = typeof GenerateExamInputSchema.Type

export const UpdateExamInputSchema = Schema.Struct({
  title:           Schema.optional(Schema.String),
  schoolName:      Schema.optional(Schema.String),
  academicYear:    Schema.optional(Schema.String),
  examType:        Schema.optional(Schema.String),
  examDate:        Schema.optional(Schema.String),
  durationMinutes: Schema.optional(Schema.Int),
  instructions:    Schema.optional(Schema.String),
  status:          Schema.optional(Schema.Literal('draft', 'final')),
  reviewMode:      Schema.optional(ReviewModeSchema),
})
export type UpdateExamInput = typeof UpdateExamInputSchema.Type

export const UpdateQuestionInputSchema = Schema.Struct({
  text:          Schema.optional(Schema.String),
  optionA:       Schema.optional(Schema.String),
  optionB:       Schema.optional(Schema.String),
  optionC:       Schema.optional(Schema.String),
  optionD:       Schema.optional(Schema.String),
  correctAnswer: Schema.optional(AnswerSchema),
  status:        Schema.optional(Schema.Literal('accepted', 'rejected')),
})
export type UpdateQuestionInput = typeof UpdateQuestionInputSchema.Type

// ── API Response type aliases ──────────────────────────────
export type ExamListResponse = Exam[]
export type ExamDetailResponse = ExamWithQuestions
export type QuestionResponse = Question
export type HealthResponse = { status: string; service: string; timestamp: string }

// Re-export entity types for convenient single-import in apps/web
export type { Exam, ExamWithQuestions, Question, PdfUpload, User } from './entities.js'
