import { Schema } from "effect"
import { ExamIdSchema, QuestionSchema } from "./entities.js"

export const JobStatusSchema = Schema.Literal("queued", "running", "completed", "failed")
export type JobStatus = typeof JobStatusSchema.Type

export const GenerateJobStartedSchema = Schema.Struct({
  examId: ExamIdSchema,
  jobId: Schema.String
})
export type GenerateJobStarted = typeof GenerateJobStartedSchema.Type

export const GenerateStreamResponseSchema = Schema.Struct({
  status: JobStatusSchema,
  questionsCount: Schema.Int,
  targetCount: Schema.Int,
  questions: Schema.Array(QuestionSchema),
  done: Schema.Boolean,
  error: Schema.optional(Schema.String)
})
export type GenerateStreamResponse = typeof GenerateStreamResponseSchema.Type
