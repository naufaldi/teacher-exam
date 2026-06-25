import { Schema } from "effect"
import { CurriculumAvailabilitySchema, ExamSubjectSchema, type Grade, GradeSchema, type Phase, PhaseSchema } from "./primitives.js"

export { CurriculumAvailabilitySchema, PhaseSchema } from "./primitives.js"
export type { CurriculumAvailability, Phase } from "./primitives.js"

export const CURRICULUM_VERSION = "merdeka-2025" as const

export const CurriculumSourceTypeSchema = Schema.Literal(
  "sibi_pdf",
  "cp_only",
  "school_local"
)
export type CurriculumSourceType = typeof CurriculumSourceTypeSchema.Type

export const CurriculumSourceManifestItemSchema = Schema.Struct({
  subjectKey: Schema.String,
  label: Schema.String,
  grade: GradeSchema,
  phase: PhaseSchema,
  curriculumVersion: Schema.Literal(CURRICULUM_VERSION),
  sourceType: CurriculumSourceTypeSchema,
  sourceUrl: Schema.optional(Schema.String),
  sourceFilename: Schema.optional(Schema.String),
  status: CurriculumAvailabilitySchema
})
export type CurriculumSourceManifestItem = typeof CurriculumSourceManifestItemSchema.Type

export function phaseForGrade(grade: Grade): Phase {
  if (grade === 1 || grade === 2) return "A"
  if (grade === 3 || grade === 4) return "B"
  return "C"
}

export const CurriculumBabTopicSchema = Schema.Struct({
  bab: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1)),
  title: Schema.NonEmptyString,
  label: Schema.NonEmptyString
})
export type CurriculumBabTopic = typeof CurriculumBabTopicSchema.Type

export const CurriculumBabTopicsResponseSchema = Schema.Array(CurriculumBabTopicSchema)
export type CurriculumBabTopicsResponse = typeof CurriculumBabTopicsResponseSchema.Type

export const CurriculumBabTopicsUrlParamsSchema = Schema.Struct({
  subject: ExamSubjectSchema,
  grade: Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 6))
})
export type CurriculumBabTopicsUrlParams = typeof CurriculumBabTopicsUrlParamsSchema.Type
