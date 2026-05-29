import { Effect, Either } from "effect"
import { describe, expect, it } from "vitest"
import { AiGenerationError } from "../../errors"
import { createFakeModelLayersFromText } from "../../lib/effect-ai/test-utils"
import { createAiService } from "../AiService"

const VALID_ITEMS = [
  { number: 1, status: "valid" as const, reason: "Sesuai CP." },
  { number: 2, status: "needs_review" as const, reason: "Level kognitif tinggi." }
]

describe("AiService.validateCurriculum", () => {
  it("parses JSON validation array and uses validation layer", async () => {
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

    const result = await Effect.runPromise(
      ai.validateCurriculum({ system: "validator system", user: "[]", expectedCount: 2 })
    )

    expect(result).toEqual(VALID_ITEMS)
    expect(validationLayer.calls).toHaveLength(1)
  })

  it("accepts finish_reason unknown when text is present", async () => {
    const { layers } = createFakeModelLayersFromText(JSON.stringify(VALID_ITEMS), {
      finishReason: "unknown"
    })
    const ai = createAiService({ layers })

    const result = await Effect.runPromise(
      ai.validateCurriculum({ system: "s", user: "u", expectedCount: 2 })
    )
    expect(result).toHaveLength(2)
  })

  it("fails when item count mismatches expectedCount", async () => {
    const { layers } = createFakeModelLayersFromText(JSON.stringify([VALID_ITEMS[0]]))
    const ai = createAiService({ layers })

    const result = await Effect.runPromise(
      Effect.either(ai.validateCurriculum({ system: "s", user: "u", expectedCount: 2 }))
    )
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AiGenerationError)
    }
  })
})
