import { Schema } from "effect"
import { ExamIdSchema } from "./entities.js"

export const ExamPilotOutcomeIdSchema = Schema.String.pipe(Schema.brand("ExamPilotOutcomeId"))
export type ExamPilotOutcomeId = typeof ExamPilotOutcomeIdSchema.Type

export const ExamPilotTriggerSchema = Schema.Literal(
  "export_pdf",
  "export_docx",
  "print_intent"
)
export type ExamPilotTrigger = typeof ExamPilotTriggerSchema.Type

export const ExamPilotReadinessSchema = Schema.Literal(
  "ready",
  "ready_after_edit",
  "not_ready"
)
export type ExamPilotReadiness = typeof ExamPilotReadinessSchema.Type

export const SetExamPilotOutcomeInputSchema = Schema.Struct({
  trigger: ExamPilotTriggerSchema,
  readiness: Schema.NullOr(ExamPilotReadinessSchema)
})
export type SetExamPilotOutcomeInput = typeof SetExamPilotOutcomeInputSchema.Type

export const ExamPilotOutcomeSchema = Schema.Struct({
  id: ExamPilotOutcomeIdSchema,
  examId: ExamIdSchema,
  trigger: ExamPilotTriggerSchema,
  readiness: Schema.NullOr(ExamPilotReadinessSchema),
  firstExportAt: Schema.String,
  answeredAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String
})
export type ExamPilotOutcome = typeof ExamPilotOutcomeSchema.Type
