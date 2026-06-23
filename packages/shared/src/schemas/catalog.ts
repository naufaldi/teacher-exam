import { Schema } from "effect"
import { CurriculumAvailabilitySchema, GradeSchema, PhaseSchema } from "./primitives.js"

export const SubjectGradeAvailabilitySchema = Schema.Struct({
  grade: GradeSchema,
  phase: PhaseSchema,
  availability: CurriculumAvailabilitySchema
})
export type SubjectGradeAvailability = typeof SubjectGradeAvailabilitySchema.Type

export const SubjectCatalogItemSchema = Schema.Struct({
  key: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  family: Schema.NonEmptyString,
  optional: Schema.Boolean,
  grades: Schema.Array(SubjectGradeAvailabilitySchema).pipe(Schema.minItems(1))
})
export type SubjectCatalogItem = typeof SubjectCatalogItemSchema.Type
