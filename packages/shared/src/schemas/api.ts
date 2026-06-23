import { Schema } from "effect"
import { SubjectCatalogItemSchema } from "./catalog.js"
import { PdfUploadIdSchema } from "./entities.js"
import type { Exam, ExamWithQuestions, PublicExamWithQuestions, Question, UserProfile } from "./entities.js"
import {
  AnswerSchema,
  ExamDifficultySchema,
  ExamSubjectSchema,
  ExamTypeSchema,
  GradeSchema,
  ReviewModeSchema,
  ValidationStatusSchema
} from "./primitives.js"

// ── Exam API ───────────────────────────────────────────────

export const GenerateExamInputSchema = Schema.Struct({
  subject: ExamSubjectSchema,
  grade: Schema.Int.pipe(Schema.between(5, 6)),
  difficulty: ExamDifficultySchema,
  topics: Schema.Array(Schema.NonEmptyString).pipe(
    Schema.minItems(1),
    Schema.maxItems(5)
  ),
  reviewMode: ReviewModeSchema,
  examType: Schema.optional(ExamTypeSchema),
  classContext: Schema.optional(Schema.String),
  pdfUploadId: Schema.optional(PdfUploadIdSchema),
  exampleQuestions: Schema.optional(Schema.String),
  totalSoal: Schema.optional(Schema.Int.pipe(Schema.between(5, 50))),
  composition: Schema.optional(Schema.Struct({
    mcqSingle: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    mcqMulti: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    trueFalse: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }))
})
export type GenerateExamInput = typeof GenerateExamInputSchema.Type

export const CurriculumCatalogResponseSchema = Schema.Array(SubjectCatalogItemSchema)
export type CurriculumCatalogResponse = typeof CurriculumCatalogResponseSchema.Type

export const UpdateExamInputSchema = Schema.Struct({
  title: Schema.optional(Schema.String),
  schoolName: Schema.optional(Schema.String),
  academicYear: Schema.optional(Schema.String),
  examType: Schema.optional(ExamTypeSchema),
  examDate: Schema.optional(Schema.String),
  durationMinutes: Schema.optional(Schema.Int),
  instructions: Schema.optional(Schema.String),
  classContext: Schema.optional(Schema.String),
  status: Schema.optional(Schema.Literal("draft", "final")),
  reviewMode: Schema.optional(ReviewModeSchema)
})
export type UpdateExamInput = typeof UpdateExamInputSchema.Type

const UpdateQuestionInputBase = {
  text: Schema.optional(Schema.String),
  status: Schema.optional(Schema.Literal("pending", "accepted", "rejected"))
} as const

const UpdateMcqSingleInputSchema = Schema.Struct({
  _tag: Schema.optional(Schema.Literal("mcq_single")),
  ...UpdateQuestionInputBase,
  options: Schema.optional(Schema.Struct({
    a: Schema.String,
    b: Schema.String,
    c: Schema.String,
    d: Schema.String
  })),
  correct: Schema.optional(AnswerSchema)
})

const UpdateMcqMultiInputSchema = Schema.Struct({
  _tag: Schema.optional(Schema.Literal("mcq_multi")),
  ...UpdateQuestionInputBase,
  options: Schema.optional(Schema.Struct({
    a: Schema.String,
    b: Schema.String,
    c: Schema.String,
    d: Schema.String
  })),
  correct: Schema.optional(Schema.Array(AnswerSchema))
})

const UpdateTrueFalseInputSchema = Schema.Struct({
  _tag: Schema.optional(Schema.Literal("true_false")),
  ...UpdateQuestionInputBase,
  statements: Schema.optional(Schema.Array(
    Schema.Struct({ text: Schema.String, answer: Schema.Boolean })
  ))
})

export const UpdateQuestionInputSchema = Schema.Union(
  UpdateMcqSingleInputSchema,
  UpdateMcqMultiInputSchema,
  UpdateTrueFalseInputSchema
)
export type UpdateQuestionInput = typeof UpdateQuestionInputSchema.Type

export const RegenerateQuestionInputSchema = Schema.Struct({
  hint: Schema.optional(Schema.String)
})
export type RegenerateQuestionInput = typeof RegenerateQuestionInputSchema.Type

export const CurriculumValidationItemSchema = Schema.Struct({
  number: Schema.Int.pipe(Schema.positive()),
  status: ValidationStatusSchema,
  reason: Schema.String
})
export type CurriculumValidationItem = typeof CurriculumValidationItemSchema.Type

export const ExamShareResponseSchema = Schema.Struct({
  slug: Schema.String,
  publicUrlPath: Schema.String,
  publishedAt: Schema.String
})
export type ExamShareResponse = typeof ExamShareResponseSchema.Type

// ── User profile API ───────────────────────────────────────

export const UpdateProfileInputSchema = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  username: Schema.optional(Schema.String.pipe(Schema.pattern(/^[a-z0-9._-]{3,32}$/))),
  school: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  gradesTaught: Schema.optional(Schema.Array(GradeSchema).pipe(Schema.minItems(1))),
  subjectsTaught: Schema.optional(Schema.Array(ExamSubjectSchema).pipe(Schema.minItems(1))),
  locale: Schema.optional(Schema.String),
  timezone: Schema.optional(Schema.String)
})
export type UpdateProfileInput = typeof UpdateProfileInputSchema.Type

export const HealthResponseSchema = Schema.Struct({
  status: Schema.String,
  service: Schema.String,
  timestamp: Schema.String
})
export type HealthResponse = typeof HealthResponseSchema.Type

// ── API Response type aliases ──────────────────────────────
export type ExamListResponse = ReadonlyArray<Exam>
export type ExamDetailResponse = ExamWithQuestions
export type PublicExamDetailResponse = PublicExamWithQuestions
export type QuestionResponse = Question
export type UserProfileResponse = UserProfile

// Re-export entity types for convenient single-import in apps/web
export type { Exam, ExamWithQuestions, PdfUpload, Question, UserProfile } from "./entities.js"
