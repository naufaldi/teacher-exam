import { Effect } from "effect"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  describeResolvedConfig,
  resolveAnthropicLayerConfig,
  resolveMinimaxLayerConfig,
  resolveOpenAiLayerConfig
} from "../../lib/effect-ai/layers"
import { createFakeModelLayersFromText } from "../../lib/effect-ai/test-utils"
import { createAiService, createDefaultAiService } from "../AiService"

describe("createDefaultAiService", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("requires ANTHROPIC_API_KEY when AI_PROVIDER=anthropic", () => {
    vi.stubEnv("AI_PROVIDER", "anthropic")
    vi.stubEnv("ANTHROPIC_API_KEY", "")

    expect(() => createDefaultAiService()).toThrow(/ANTHROPIC_API_KEY is required/)
  })

  it("builds anthropic service when AI_PROVIDER=anthropic (default)", () => {
    vi.stubEnv("AI_PROVIDER", "anthropic")
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test")

    const ai = createDefaultAiService()
    expect(typeof ai.generate).toBe("function")
  })

  it("requires MINIMAX_API_KEY when AI_PROVIDER=minimax", () => {
    vi.stubEnv("AI_PROVIDER", "minimax")
    vi.stubEnv("MINIMAX_API_KEY", "")

    expect(() => createDefaultAiService()).toThrow(/MINIMAX_API_KEY is required/)
  })

  it("builds minimax service with DNS fallback config when AI_PROVIDER=minimax", () => {
    vi.stubEnv("AI_PROVIDER", "minimax")
    vi.stubEnv("MINIMAX_API_KEY", "minimax-test")
    vi.stubEnv("MINIMAX_ANTHROPIC_BASE_URL", "https://api.minimax.io/anthropic")

    const config = resolveMinimaxLayerConfig()
    const info = describeResolvedConfig(config)
    expect(info.provider).toBe("minimax")
    expect(info.apiUrl).toBe("https://api.minimax.io/anthropic")
    expect(info.usesMinimaxFetch).toBe(true)
  })

  it("requires OPENAI_API_KEY when AI_PROVIDER=openai", () => {
    vi.stubEnv("AI_PROVIDER", "openai")
    vi.stubEnv("OPENAI_API_KEY", "")

    expect(() => createDefaultAiService()).toThrow(/OPENAI_API_KEY is required/)
  })

  it("uses OPENAI_BASE_URL and model env overrides when AI_PROVIDER=openai", () => {
    vi.stubEnv("AI_PROVIDER", "openai")
    vi.stubEnv("OPENAI_API_KEY", "sk-openai-test")
    vi.stubEnv("OPENAI_BASE_URL", "https://proxy.example/v1")
    vi.stubEnv("AI_MODEL", "gpt-5.4-mini-custom")
    vi.stubEnv("AI_DISCUSSION_MODEL", "gpt-5.4-mini-fast")

    const config = resolveOpenAiLayerConfig()
    expect(config.apiUrl).toBe("https://proxy.example/v1")
    expect(config.model).toBe("gpt-5.4-mini-custom")
    expect(config.discussionModel).toBe("gpt-5.4-mini-fast")
  })

  it("routes PDF generation to anthropic service when minimax proxy receives pdfBytes", async () => {
    const pdfQuestion = {
      _tag: "mcq_single" as const,
      number: 1,
      text: "Question 1",
      option_a: "A",
      option_b: "B",
      option_c: "C",
      option_d: "D",
      correct_answer: "a" as const,
      topic: "Teks",
      difficulty: "sedang"
    }

    const minimaxFake = createFakeModelLayersFromText("should-not-be-used")
    const anthropicFake = createFakeModelLayersFromText(JSON.stringify([pdfQuestion]))

    const minimaxService = createAiService({
      layers: minimaxFake.layers,
      provider: "minimax",
      baseURL: "https://api.minimax.io/anthropic"
    })
    const anthropicService = createAiService({
      layers: anthropicFake.layers,
      provider: "anthropic"
    })

    const proxy = {
      generate(input: Parameters<typeof minimaxService.generate>[0]) {
        if (input.pdfBytes !== undefined) {
          return anthropicService.generate(input)
        }
        return minimaxService.generate(input)
      },
      generateRaw(input: Parameters<typeof minimaxService.generateRaw>[0]) {
        if (input.pdfBytes !== undefined) {
          return anthropicService.generateRaw(input)
        }
        return minimaxService.generateRaw(input)
      },
      generateDiscussion: (input: Parameters<typeof minimaxService.generateDiscussion>[0]) =>
        minimaxService.generateDiscussion(input),
      validateCurriculum: (input: Parameters<typeof minimaxService.validateCurriculum>[0]) =>
        minimaxService.validateCurriculum(input),
      streamDiscussion: (input: Parameters<typeof minimaxService.streamDiscussion>[0]) =>
        minimaxService.streamDiscussion(input)
    }

    await Effect.runPromise(
      proxy.generate({
        system: "system",
        user: "user",
        pdfBytes: Buffer.from("%PDF-1.4"),
        expectedCount: 1
      })
    )

    expect(minimaxFake.calls).toHaveLength(0)
    expect(anthropicFake.calls).toHaveLength(1)
  })

  it("rejects unknown AI_PROVIDER", () => {
    vi.stubEnv("AI_PROVIDER", "bogus")

    expect(() => createDefaultAiService()).toThrow(/must be "anthropic", "minimax", or "openai"/)
  })

  it("resolveAnthropicLayerConfig uses default models", () => {
    const config = resolveAnthropicLayerConfig({
      ANTHROPIC_API_KEY: "sk-ant-test"
    })
    expect(config.provider).toBe("anthropic")
    expect(config.model).toBe("claude-opus-4-5")
    expect(config.discussionModel).toBe("claude-haiku-4-5")
  })
})
