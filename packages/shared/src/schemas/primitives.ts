import { Schema } from 'effect'

// ── Enums ──────────────────────────────────────────────────
export const ExamSubjectSchema = Schema.Literal(
  'bahasa_indonesia',
  'pendidikan_pancasila',
)
export type ExamSubject = typeof ExamSubjectSchema.Type

export const SUBJECT_LABEL: Record<ExamSubject, string> = {
  bahasa_indonesia: 'Bahasa Indonesia',
  pendidikan_pancasila: 'Pendidikan Pancasila',
}

export const ExamDifficultySchema = Schema.Literal(
  'mudah', 'sedang', 'sulit', 'campuran',
)
export type ExamDifficulty = typeof ExamDifficultySchema.Type

/**
 * Jenis lembar / asesmen. See PRD §8.6 and RFC §9 for steering profile.
 * Stored as text in `exams.exam_type`; legacy 'TKA' (uppercase) is normalized
 * to 'tka' at read-time.
 */
export const ExamTypeSchema = Schema.Literal(
  'latihan',
  'formatif',
  'sts',
  'sas',
  'tka',
)
export type ExamType = typeof ExamTypeSchema.Type

/**
 * Cognitive level (Bloom). Optional on AI response in MVP — fully validated
 * post-generation in polish phase.
 */
export const CognitiveLevelSchema = Schema.Literal('C1', 'C2', 'C3', 'C4')
export type CognitiveLevel = typeof CognitiveLevelSchema.Type

export const ReviewModeSchema = Schema.Literal('fast', 'slow')
export type ReviewMode = typeof ReviewModeSchema.Type

export const ExamStatusSchema = Schema.Literal('draft', 'final')
export type ExamStatus = typeof ExamStatusSchema.Type

export const AnswerSchema = Schema.Literal('a', 'b', 'c', 'd')
export type Answer = typeof AnswerSchema.Type

// Single answer letter (lowercase a-d)
export const AnswerLetterSchema = Schema.Literal('a', 'b', 'c', 'd')
export type AnswerLetter = typeof AnswerLetterSchema.Type

// Multiple answer letters, 2–3 unique entries
export const MultiAnswerSchema = Schema.Array(AnswerLetterSchema).pipe(
  Schema.minItems(2),
  Schema.maxItems(3),
  Schema.filter((xs) => new Set(xs).size === xs.length, { message: () => 'duplicate letters' }),
)
export type MultiAnswer = typeof MultiAnswerSchema.Type

// Question type discriminant
export const QuestionTypeSchema = Schema.Literal('mcq_single', 'mcq_multi', 'true_false')
export type QuestionType = typeof QuestionTypeSchema.Type

export const QuestionStatusSchema = Schema.Literal('pending', 'accepted', 'rejected')
export type QuestionStatus = typeof QuestionStatusSchema.Type

export const ValidationStatusSchema = Schema.Literal('valid', 'needs_review', 'invalid')
export type ValidationStatus = typeof ValidationStatusSchema.Type
