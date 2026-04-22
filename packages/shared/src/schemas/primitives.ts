import { Schema } from 'effect'

// ── Enums ──────────────────────────────────────────────────
export const ExamSubjectSchema = Schema.Literal(
  'bahasa_indonesia',
  'pendidikan_pancasila',
)
export type ExamSubject = typeof ExamSubjectSchema.Type

export const ExamDifficultySchema = Schema.Literal(
  'mudah', 'sedang', 'sulit', 'campuran',
)
export type ExamDifficulty = typeof ExamDifficultySchema.Type

export const ReviewModeSchema = Schema.Literal('fast', 'slow')
export type ReviewMode = typeof ReviewModeSchema.Type

export const ExamStatusSchema = Schema.Literal('draft', 'final')
export type ExamStatus = typeof ExamStatusSchema.Type

export const AnswerSchema = Schema.Literal('a', 'b', 'c', 'd')
export type Answer = typeof AnswerSchema.Type

export const QuestionStatusSchema = Schema.Literal('pending', 'accepted', 'rejected')
export type QuestionStatus = typeof QuestionStatusSchema.Type

export const ValidationStatusSchema = Schema.Literal('valid', 'needs_review', 'invalid')
export type ValidationStatus = typeof ValidationStatusSchema.Type
