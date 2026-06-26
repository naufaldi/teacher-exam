import { Schema } from "effect"
import { TemplateIdSchema, UserIdSchema } from "./entities.js"
import { ExamDifficultySchema, ExamSubjectSchema, ExamTypeSchema, GradeSchema, ReviewModeSchema } from "./primitives.js"

export const TemplateConfigSchema = Schema.Struct({
  subject: ExamSubjectSchema,
  grade: GradeSchema,
  difficulty: ExamDifficultySchema,
  topics: Schema.Array(Schema.NonEmptyString).pipe(Schema.minItems(1), Schema.maxItems(8)),
  reviewMode: ReviewModeSchema,
  examType: Schema.optional(ExamTypeSchema),
  classContext: Schema.optional(Schema.String),
  exampleQuestions: Schema.optional(Schema.String),
  totalSoal: Schema.optional(Schema.Int.pipe(Schema.between(5, 50))),
  composition: Schema.optional(
    Schema.Struct({
      mcqSingle: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
      mcqMulti: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
      trueFalse: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
    })
  )
})
export type TemplateConfig = typeof TemplateConfigSchema.Type

export const ExamTemplateSchema = Schema.Struct({
  id: TemplateIdSchema,
  userId: UserIdSchema,
  name: Schema.NonEmptyString,
  description: Schema.NullOr(Schema.String),
  config: TemplateConfigSchema,
  usageCount: Schema.Int,
  createdAt: Schema.String,
  updatedAt: Schema.String
})
export type ExamTemplate = typeof ExamTemplateSchema.Type

export const CreateTemplateInputSchema = Schema.Struct({
  name: Schema.NonEmptyString,
  description: Schema.optional(Schema.String),
  config: TemplateConfigSchema
})
export type CreateTemplateInput = typeof CreateTemplateInputSchema.Type

export const UpdateTemplateInputSchema = Schema.Struct({
  name: Schema.optional(Schema.NonEmptyString),
  description: Schema.optional(Schema.NullOr(Schema.String)),
  config: Schema.optional(TemplateConfigSchema)
})
export type UpdateTemplateInput = typeof UpdateTemplateInputSchema.Type

export const TemplateApplyResponseSchema = Schema.Struct({
  subject: ExamSubjectSchema,
  grade: GradeSchema,
  difficulty: ExamDifficultySchema,
  topics: Schema.Array(Schema.NonEmptyString).pipe(Schema.minItems(1), Schema.maxItems(8)),
  reviewMode: ReviewModeSchema,
  examType: Schema.optional(ExamTypeSchema),
  classContext: Schema.optional(Schema.String),
  exampleQuestions: Schema.optional(Schema.String),
  totalSoal: Schema.optional(Schema.Int.pipe(Schema.between(5, 50))),
  composition: Schema.optional(
    Schema.Struct({
      mcqSingle: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
      mcqMulti: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
      trueFalse: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
    })
  ),
  templateId: TemplateIdSchema
})
export type TemplateApplyResponse = typeof TemplateApplyResponseSchema.Type

export type TemplateListResponse = ReadonlyArray<ExamTemplate>
