import { AnswerLetterSchema, CognitiveLevelSchema, MultiAnswerSchema } from "@teacher-exam/shared"
import { Schema } from "effect"

const GeneratedBaseFields = {
  number: Schema.Int,
  text: Schema.NonEmptyString,
  topic: Schema.String,
  difficulty: Schema.String,
  cognitive_level: Schema.optional(CognitiveLevelSchema),
  figure: Schema.optional(Schema.Unknown)
} as const

const GeneratedMcqCommonFields = {
  ...GeneratedBaseFields,
  option_a: Schema.NonEmptyString,
  option_b: Schema.NonEmptyString,
  option_c: Schema.NonEmptyString,
  option_d: Schema.NonEmptyString
} as const

export const GeneratedMcqSingleAiSchema = Schema.TaggedStruct("mcq_single", {
  ...GeneratedMcqCommonFields,
  correct_answer: AnswerLetterSchema
})

export const GeneratedMcqMultiAiSchema = Schema.TaggedStruct("mcq_multi", {
  ...GeneratedMcqCommonFields,
  correct_answers: MultiAnswerSchema
})

export const GeneratedTrueFalseAiSchema = Schema.TaggedStruct("true_false", {
  ...GeneratedBaseFields,
  statements: Schema.Array(
    Schema.Struct({ text: Schema.NonEmptyString, answer: Schema.Literal("B", "S") })
  ).pipe(Schema.minItems(3), Schema.maxItems(4))
})

export const GeneratedQuestionAiSchema = Schema.Union(
  GeneratedMcqSingleAiSchema,
  GeneratedMcqMultiAiSchema,
  GeneratedTrueFalseAiSchema
)

export const GeneratedQuestionsBatchSchema = Schema.Struct({
  questions: Schema.Array(GeneratedQuestionAiSchema)
})

export type GeneratedQuestionAi = typeof GeneratedQuestionAiSchema.Type
