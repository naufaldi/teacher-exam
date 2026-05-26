import { Schema } from 'effect'
import { ValidationStatusSchema } from '@teacher-exam/shared'

export const CurriculumValidationItemAiSchema = Schema.Struct({
  number: Schema.Int,
  status: ValidationStatusSchema,
  reason: Schema.String,
})

export const CurriculumValidationBatchSchema = Schema.Struct({
  items: Schema.Array(CurriculumValidationItemAiSchema),
})

export type CurriculumValidationItemAi = typeof CurriculumValidationItemAiSchema.Type
