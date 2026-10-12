import { describe, expect, it } from "vitest"
import { assertAiProviderReady, readAiProvider } from "../production-ai-config"

describe("production AI config", () => {
  it("picks openai and gpt-6-luna when the provider env is unset", () => {
    const selection = assertAiProviderReady({
      OPENAI_API_KEY: "test-key"
    })
    expect(selection).toEqual({
      provider: "openai",
      model: "gpt-6-luna",
      discussionModel: "gpt-6-luna",
      baseUrl: "https://api.openai.com/v1"
    })
  })

  it("uses OPENAI_BASE_URL when Astra Flow is configured", () => {
    const selection = assertAiProviderReady({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api-us-ca.umodelverse.ai/v1"
    })
    expect(selection.provider).toBe("openai")
    expect(selection.model).toBe("gpt-6-luna")
    expect(selection.baseUrl).toBe("https://api-us-ca.umodelverse.ai/v1")
  })

  it("fails loudly when the OpenAI key is missing and does not fall back to Anthropic", () => {
    expect(() =>
      assertAiProviderReady({
        ANTHROPIC_API_KEY: "sk-ant-present"
      })
    ).toThrow(
      "OPENAI_API_KEY is required when AI_PROVIDER=openai. Refusing to fall back to Anthropic."
    )
    expect(readAiProvider({})).toBe("openai")
  })
})
