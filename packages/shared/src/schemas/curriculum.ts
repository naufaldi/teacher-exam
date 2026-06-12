import { Schema } from "effect"
import { GradeSchema, type Grade } from "./entities.js"

export const CURRICULUM_VERSION = "merdeka-2025" as const

export const PhaseSchema = Schema.Literal("A", "B", "C")
export type Phase = typeof PhaseSchema.Type

export const CurriculumAvailabilitySchema = Schema.Literal(
  "ready",
  "stubbed",
  "missing",
  "disabled"
)
export type CurriculumAvailability = typeof CurriculumAvailabilitySchema.Type

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
