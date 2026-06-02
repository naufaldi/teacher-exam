import { assert, describe, it } from "@effect/vitest"
import { Effect, Either } from "effect"
import { AiGenerationError } from "../../errors"
import { createFakeModelLayersFromText } from "../../lib/effect-ai/test-utils"
import { createAiService } from "../AiService"

const VALID_ITEMS = [
  { number: 1, status: "valid" as const, reason: "Sesuai CP." },
  { number: 2, status: "needs_review" as const, reason: "Level kognitif tinggi." }
]

describe("AiService.validateCurriculum", () => {
  it.effect("parses JSON validation array and uses validation layer", () =>
    Effect.gen(function*() {
      const textLayer = createFakeModelLayersFromText("unused")
      const validationLayer = createFakeModelLayersFromText(JSON.stringify(VALID_ITEMS))
      validationLayer.calls.length = 0
      const ai = createAiService({
        layers: {
          text: textLayer.layers.text,
          pdf: textLayer.layers.pdf,
          discussion: textLayer.layers.discussion,
          validation: validationLayer.layers.validation
        },
        discussionModel: "MiniMax-M2.7-highspeed"
      })

      const result = yield* ai.validateCurriculum({ system: "validator system", user: "[]", expectedCount: 2 })

      assert.deepStrictEqual(result, VALID_ITEMS)
      assert.strictEqual(validationLayer.calls.length, 1)
    }))

  it.effect("accepts finish_reason unknown when text is present", () =>
    Effect.gen(function*() {
      const { layers } = createFakeModelLayersFromText(JSON.stringify(VALID_ITEMS), {
        finishReason: "unknown"
      })
      const ai = createAiService({ layers })
      const result = yield* ai.validateCurriculum({ system: "s", user: "u", expectedCount: 2 })
      assert.strictEqual(result.length, 2)
    }))

  it.effect("fails when item count mismatches expectedCount", () =>
    Effect.gen(function*() {
      const { layers } = createFakeModelLayersFromText(JSON.stringify([VALID_ITEMS[0]]))
      const ai = createAiService({ layers })
      const result = yield* Effect.either(ai.validateCurriculum({ system: "s", user: "u", expectedCount: 2 }))
      assert.strictEqual(Either.isLeft(result), true)
      if (Either.isLeft(result)) {
        assert.strictEqual(result.left instanceof AiGenerationError, true)
      }
    }))
})
