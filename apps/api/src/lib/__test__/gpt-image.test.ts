import { GPT_IMAGE_MODEL_ID } from "@teacher-exam/shared"
import { describe, expect, test } from "vitest"
import { decodeGptImagePayload, gptImageGenerationBody, resolveGptImageModelId } from "../gpt-image.js"

describe("gpt image request", () => {
  test("names gpt-image-2.5-sunburst unless OPENAI_IMAGE_MODEL is set", () => {
    expect(resolveGptImageModelId({})).toBe(GPT_IMAGE_MODEL_ID)
    expect(GPT_IMAGE_MODEL_ID).toBe("gpt-image-2.5-sunburst")
    expect(resolveGptImageModelId({ OPENAI_IMAGE_MODEL: "gpt-image-2.5-flare" })).toBe("gpt-image-2.5-flare")
  })

  test("asks the images API for one low-quality png", () => {
    expect(gptImageGenerationBody("sebuah pohon", "gpt-image-2.5-sunburst")).toEqual({
      model: "gpt-image-2.5-sunburst",
      prompt: "sebuah pohon",
      n: 1,
      size: "1024x1024",
      quality: "low",
      output_format: "png"
    })
  })

  test("reads b64_json and ignores an empty payload", () => {
    expect(decodeGptImagePayload({ data: [{ b64_json: "iVBORw0KGgo=" }] })).toEqual({
      dataBase64: "iVBORw0KGgo="
    })
    expect(decodeGptImagePayload({ data: [] })).toBeNull()
    expect(decodeGptImagePayload({ data: [{ url: "https://example.test/x.png" }] })).toBeNull()
  })
})
