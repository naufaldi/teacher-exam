import { LanguageModel } from "@effect/ai"
import { Effect, Layer, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { runGenerateObject } from "../run"
import { GENERATED_QUESTIONS_OBJECT_NAME } from "../schema-bridge"
import { GeneratedQuestionsBatchSchema } from "../schemas/generated-questions"
import { createFakeLanguageModelService } from "../test-utils"

describe("runGenerateObject", () => {
  it("returns decoded structured value from LanguageModel.generateObject", async () => {
    const objectValue = {
      questions: [
        {
          _tag: "mcq_single" as const,
          number: 1,
          text: "Q1",
          option_a: "A",
          option_b: "B",
          option_c: "C",
          option_d: "D",
          correct_answer: "a" as const,
          topic: "T",
          difficulty: "mudah"
        }
      ]
    }
    const calls: Array<{ prompt: unknown }> = []
    const modelLayer = Layer.succeed(
      LanguageModel.LanguageModel,
      createFakeLanguageModelService(
        () => ({ text: JSON.stringify(objectValue), objectValue }),
        calls
      )
    )

    const result = await Effect.runPromise(
      runGenerateObject({
        modelLayer,
        prompt: [{ role: "user", content: [{ type: "text", text: "generate" }] }],
        model: "test-model",
        logEvent: "test.generateObject",
        errorContext: {},
        schema: GeneratedQuestionsBatchSchema,
        objectName: GENERATED_QUESTIONS_OBJECT_NAME
      })
    )

    expect(result.questions).toHaveLength(1)
    expect(calls).toHaveLength(1)
  })
})

describe("GeneratedQuestionsBatchSchema", () => {
  it("accepts optional props omitted per exactOptionalPropertyTypes", () => {
    const batch = Schema.decodeUnknownSync(GeneratedQuestionsBatchSchema)({
      questions: [
        {
          _tag: "mcq_single",
          number: 1,
          text: "Soal",
          option_a: "A",
          option_b: "B",
          option_c: "C",
          option_d: "D",
          correct_answer: "a",
          topic: "T",
          difficulty: "mudah"
        }
      ]
    })
    expect(batch.questions[0]?.cognitive_level).toBeUndefined()
  })
})
