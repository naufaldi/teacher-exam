import { AiError, LanguageModel } from "@effect/ai"
import { Effect, Either, Layer, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { AiGenerationError } from "../../errors"
import { getPromptSystemContent, getPromptUserFileParts, getPromptUserText } from "../../lib/effect-ai/prompt"
import {
  createFakeModelLayers,
  createFakeModelLayersFromQuestions,
  createFakeModelLayersFromText
} from "../../lib/effect-ai/test-utils"
import { createAiService } from "../AiService"

const VALID_QUESTIONS = Array.from({ length: 20 }, (_, i) => ({
  _tag: "mcq_single" as const,
  number: i + 1,
  text: `Soal ${i + 1}`,
  option_a: "A",
  option_b: "B",
  option_c: "C",
  option_d: "D",
  correct_answer: "a" as const,
  topic: "Pemahaman Bacaan",
  difficulty: "sedang",
  cognitive_level: "C2" as const
}))

async function expectAiGenerationError(
  effect: Effect.Effect<unknown, AiGenerationError>
): Promise<AiGenerationError> {
  const result = await Effect.runPromise(Effect.either(effect))
  expect(Either.isLeft(result)).toBe(true)
  if (Either.isRight(result)) throw new Error("Expected AiGenerationError")
  expect(result.left).toBeInstanceOf(AiGenerationError)
  return result.left
}

describe("AiService.generate", () => {
  it("sends curriculum via the top-level system field, not in user content", async () => {
    const { calls, layers } = createFakeModelLayersFromQuestions(VALID_QUESTIONS)
    const ai = createAiService({ layers })

    const system = "BASELINE\n## Capaian Pembelajaran\n- foo"
    const user = "task params"
    await Effect.runPromise(ai.generate({ system, user, expectedCount: 20 }))

    expect(calls).toHaveLength(1)
    const prompt = calls[0]!.prompt
    expect(getPromptSystemContent(prompt)).toBe(system)
    expect(getPromptSystemContent(prompt)).toContain("## Capaian Pembelajaran")
    expect(getPromptUserText(prompt)).toBe(user)
    expect(getPromptUserText(prompt)).not.toContain("## Capaian Pembelajaran")
  })

  it("attaches a PDF document block when pdfBytes is provided", async () => {
    const { calls, layers } = createFakeModelLayersFromQuestions(VALID_QUESTIONS)
    const ai = createAiService({ layers })

    const pdfBytes = Buffer.from("%PDF-1.4 fake")
    await Effect.runPromise(ai.generate({ system: "s", user: "u", pdfBytes, expectedCount: 20 }))

    const files = getPromptUserFileParts(calls[0]!.prompt)
    expect(files).toHaveLength(1)
    expect(files[0]?.type).toBe("file")
  })

  it("uses pdfModel layer for generate when pdfBytes is provided", async () => {
    const textCalls: Array<string> = []
    const pdfCalls: Array<string> = []
    const textLayer = createFakeModelLayers((prompt) => {
      textCalls.push(getPromptUserText(prompt))
      return { text: JSON.stringify(VALID_QUESTIONS) }
    })
    const pdfLayer = createFakeModelLayers((prompt) => {
      pdfCalls.push(getPromptUserText(prompt))
      return { text: JSON.stringify(VALID_QUESTIONS) }
    })
    const ai = createAiService({
      layers: {
        text: textLayer.layers.text,
        pdf: pdfLayer.layers.pdf,
        discussion: textLayer.layers.discussion,
        validation: textLayer.layers.validation
      },
      model: "MiniMax-M2.7",
      pdfModel: "claude-opus-4-5"
    })

    await Effect.runPromise(
      ai.generate({ system: "s", user: "u", pdfBytes: Buffer.from("%PDF"), expectedCount: 20 })
    )
    expect(textCalls).toHaveLength(0)
    expect(pdfCalls).toHaveLength(1)
  })

  it("uses main model layer for generate when pdfBytes absent even when pdfModel is configured", async () => {
    const textCalls: Array<string> = []
    const pdfCalls: Array<string> = []
    const textLayer = createFakeModelLayers((prompt) => {
      textCalls.push(getPromptUserText(prompt))
      return { text: JSON.stringify(VALID_QUESTIONS) }
    })
    const pdfLayer = createFakeModelLayers((prompt) => {
      pdfCalls.push(getPromptUserText(prompt))
      return { text: JSON.stringify(VALID_QUESTIONS) }
    })
    const ai = createAiService({
      layers: {
        text: textLayer.layers.text,
        pdf: pdfLayer.layers.pdf,
        discussion: textLayer.layers.discussion,
        validation: textLayer.layers.validation
      },
      model: "MiniMax-M2.7",
      pdfModel: "claude-opus-4-5"
    })

    await Effect.runPromise(ai.generate({ system: "s", user: "u", expectedCount: 20 }))
    expect(textCalls).toHaveLength(1)
    expect(pdfCalls).toHaveLength(0)
  })

  it("strips ```json fenced output before parsing", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_QUESTIONS) + "\n```"
    const { layers } = createFakeModelLayersFromText(fenced)
    const ai = createAiService({ layers })
    const out = await Effect.runPromise(ai.generate({ system: "s", user: "u", expectedCount: 20 }))
    expect(out).toHaveLength(20)
  })

  it("reads the first text block when earlier content blocks are non-text", async () => {
    const { layers } = createFakeModelLayers(() => ({
      text: JSON.stringify(VALID_QUESTIONS),
      leadingReasoning: "reasoning stub"
    }))
    const ai = createAiService({ layers })
    const out = await Effect.runPromise(ai.generate({ system: "s", user: "u", expectedCount: 20 }))
    expect(out).toHaveLength(20)
  })

  it("accepts finish_reason stop as a normal completion", async () => {
    const { layers } = createFakeModelLayersFromText(JSON.stringify(VALID_QUESTIONS), {
      finishReason: "stop"
    })
    const ai = createAiService({ layers })
    const out = await Effect.runPromise(ai.generate({ system: "s", user: "u", expectedCount: 20 }))
    expect(out).toHaveLength(20)
  })

  it("throws AiGenerationError when question count does not match expectedCount", async () => {
    const { layers } = createFakeModelLayersFromText(JSON.stringify(VALID_QUESTIONS.slice(0, 5)))
    const ai = createAiService({ layers })
    await expectAiGenerationError(ai.generate({ system: "s", user: "u", expectedCount: 20 }))
  })

  it("throws a clear AiGenerationError when model stops at length", async () => {
    const { layers } = createFakeModelLayersFromText("[{\"_tag\":\"mcq_single\",\"text\":\"truncated", {
      finishReason: "length"
    })
    const ai = createAiService({ layers })

    const err = await expectAiGenerationError(ai.generate({ system: "s", user: "u", expectedCount: 20 }))

    expect(String(err.cause)).toContain("length")
    expect(String(err.cause)).toContain("incomplete")
  })

  it("includes provider and host diagnostics on connection errors", async () => {
    const failingLayer = Layer.succeed(LanguageModel.LanguageModel, {
      generateText: () =>
        Effect.fail(
          new AiError.UnknownError({
            module: "test",
            method: "generateText",
            description: "Connection error."
          })
        ),
      generateObject: () =>
        Effect.fail(
          new AiError.UnknownError({
            module: "test",
            method: "generateObject",
            description: "Connection error."
          })
        ),
      streamText: () => Effect.die("not implemented")
    })
    const ai = createAiService({
      layers: {
        text: failingLayer,
        pdf: failingLayer,
        discussion: failingLayer,
        validation: failingLayer
      },
      provider: "minimax",
      baseURL: "https://api.minimax.io/anthropic"
    })

    const err = await expectAiGenerationError(ai.generate({ system: "s", user: "u", expectedCount: 20 }))

    expect(String(err.cause)).toContain("Connection error.")
    expect(String(err.cause)).toContain("provider=minimax")
    expect(String(err.cause)).toContain("host=api.minimax.io")
  })

  it("throws AiGenerationError on non-JSON output", async () => {
    const { layers } = createFakeModelLayersFromText("not json")
    const ai = createAiService({ layers })
    await expectAiGenerationError(ai.generate({ system: "s", user: "u", expectedCount: 20 }))
  })

  it("throws AiGenerationError when a question fails schema validation", async () => {
    const bad = [...VALID_QUESTIONS]
    bad[0] = { ...bad[0]!, correct_answer: "z" as "a" }
    const { layers } = createFakeModelLayersFromText(JSON.stringify(bad))
    const ai = createAiService({ layers })
    await expectAiGenerationError(ai.generate({ system: "s", user: "u", expectedCount: 20 }))
  })
})

describe("AiService.generate — expectedCount", () => {
  it("throws AiGenerationError with both numbers when AI returns fewer questions than expectedCount", async () => {
    const fiveQuestions = VALID_QUESTIONS.slice(0, 5)
    const { layers } = createFakeModelLayersFromText(JSON.stringify(fiveQuestions))
    const ai = createAiService({ layers })
    const err = await expectAiGenerationError(
      ai.generate({ system: "s", user: "u", expectedCount: 10 })
    )
    expect(err._tag).toBe("AiGenerationError")
    expect(String(err.cause)).toContain("10")
    expect(String(err.cause)).toContain("5")
  })

  it("resolves successfully when AI returns exactly expectedCount questions", async () => {
    const tenQuestions = VALID_QUESTIONS.slice(0, 10)
    const { layers } = createFakeModelLayersFromText(JSON.stringify(tenQuestions))
    const ai = createAiService({ layers })
    const result = await Effect.runPromise(ai.generate({ system: "s", user: "u", expectedCount: 10 }))
    expect(result).toHaveLength(10)
  })
})

describe("AiService.generate — multi-type schema validation", () => {
  it("resolves with mixed _tag array (1 of each type)", async () => {
    const mixed = [
      {
        _tag: "mcq_single",
        number: 1,
        text: "Soal PG",
        option_a: "A",
        option_b: "B",
        option_c: "C",
        option_d: "D",
        correct_answer: "a",
        topic: "T",
        difficulty: "mudah"
      },
      {
        _tag: "mcq_multi",
        number: 2,
        text: "Soal PGK",
        option_a: "A",
        option_b: "B",
        option_c: "C",
        option_d: "D",
        correct_answers: ["a", "c"],
        topic: "T",
        difficulty: "sedang"
      },
      {
        _tag: "true_false",
        number: 3,
        text: "Soal BS",
        topic: "T",
        difficulty: "sulit",
        statements: [{ text: "p1", answer: "B" }, { text: "p2", answer: "S" }, { text: "p3", answer: "B" }]
      }
    ]
    const { layers } = createFakeModelLayersFromText(JSON.stringify(mixed))
    const ai = createAiService({ layers })
    const result = await Effect.runPromise(ai.generate({ system: "s", user: "u", expectedCount: 3 }))
    expect(result).toHaveLength(3)
    expect(result[0]!._tag).toBe("mcq_single")
    expect(result[1]!._tag).toBe("mcq_multi")
    expect(result[2]!._tag).toBe("true_false")
  })

  it("throws AiGenerationError for mcq_multi with only 1 correct letter", async () => {
    const bad = [
      {
        _tag: "mcq_multi",
        number: 1,
        text: "Bad soal",
        option_a: "A",
        option_b: "B",
        option_c: "C",
        option_d: "D",
        correct_answers: ["a"],
        topic: "T",
        difficulty: "mudah"
      }
    ]
    const { layers } = createFakeModelLayersFromText(JSON.stringify(bad))
    const ai = createAiService({ layers })
    await expectAiGenerationError(ai.generate({ system: "s", user: "u", expectedCount: 1 }))
  })

  it("throws AiGenerationError for unknown _tag", async () => {
    const bad = [{ _tag: "essay", number: 1, text: "Ceritakan!", topic: "T", difficulty: "mudah" }]
    const { layers } = createFakeModelLayersFromText(JSON.stringify(bad))
    const ai = createAiService({ layers })
    await expectAiGenerationError(ai.generate({ system: "s", user: "u", expectedCount: 1 }))
  })

  it("preserves malformed figure JSON for route-level downgrade", async () => {
    const withInvalidFigure = [{
      _tag: "mcq_single",
      number: 1,
      text: "Soal bangun datar",
      option_a: "A",
      option_b: "B",
      option_c: "C",
      option_d: "D",
      correct_answer: "a",
      topic: "Bangun Datar",
      difficulty: "mudah",
      figure: { type: "pentagon", side: 5 }
    }]
    const { layers } = createFakeModelLayersFromText(JSON.stringify(withInvalidFigure))
    const ai = createAiService({ layers })
    const result = await Effect.runPromise(ai.generate({ system: "s", user: "u", expectedCount: 1 }))
    expect(result[0]?.figure).toEqual({ type: "pentagon", side: 5 })
  })
})

describe("AiService.generateDiscussion", () => {
  const FAKE_MARKDOWN = `## 1. Soal tentang ide pokok\n**Jawaban Benar: B**\n\nPenjelasan.\n\n**Tip:** Kunci.\n\n---`

  it("uses discussionModel (claude-haiku-4-5) by default, not the main model", async () => {
    const discussionCalls: Array<string> = []
    const textCalls: Array<string> = []
    const discussionLayer = createFakeModelLayers((prompt) => {
      discussionCalls.push(getPromptUserText(prompt))
      return { text: FAKE_MARKDOWN }
    })
    const textLayer = createFakeModelLayers((prompt) => {
      textCalls.push(getPromptUserText(prompt))
      return { text: JSON.stringify(VALID_QUESTIONS) }
    })
    const ai = createAiService({
      layers: {
        text: textLayer.layers.text,
        pdf: textLayer.layers.pdf,
        discussion: discussionLayer.layers.discussion,
        validation: discussionLayer.layers.validation
      }
    })
    await Effect.runPromise(ai.generateDiscussion({ system: "s", user: "u" }))
    expect(discussionCalls).toHaveLength(1)
    expect(textCalls).toHaveLength(0)
  })

  it("respects custom discussionModel when provided", async () => {
    const { calls, layers } = createFakeModelLayersFromText(FAKE_MARKDOWN)
    const ai = createAiService({ layers, discussionModel: "claude-opus-4-5" })
    await Effect.runPromise(ai.generateDiscussion({ system: "s", user: "u" }))
    expect(calls).toHaveLength(1)
  })

  it("generate() still uses the main model not discussionModel", async () => {
    const discussionCalls: Array<string> = []
    const textCalls: Array<string> = []
    const discussionLayer = createFakeModelLayers((prompt) => {
      discussionCalls.push(getPromptUserText(prompt))
      return { text: FAKE_MARKDOWN }
    })
    const textLayer = createFakeModelLayers((prompt) => {
      textCalls.push(getPromptUserText(prompt))
      return { text: JSON.stringify(VALID_QUESTIONS) }
    })
    const ai = createAiService({
      layers: {
        text: textLayer.layers.text,
        pdf: textLayer.layers.pdf,
        discussion: discussionLayer.layers.discussion,
        validation: discussionLayer.layers.validation
      },
      discussionModel: "claude-haiku-4-5"
    })
    await Effect.runPromise(ai.generate({ system: "s", user: "u", expectedCount: 20 }))
    expect(textCalls).toHaveLength(1)
    expect(discussionCalls).toHaveLength(0)
  })

  it("returns the raw markdown string from Claude", async () => {
    const { layers } = createFakeModelLayersFromText(FAKE_MARKDOWN)
    const ai = createAiService({ layers })
    const result = await Effect.runPromise(ai.generateDiscussion({ system: "s", user: "u" }))
    expect(result).toBe(FAKE_MARKDOWN)
  })

  it("sends system and user to Anthropic in the correct positions", async () => {
    const { calls, layers } = createFakeModelLayersFromText(FAKE_MARKDOWN)
    const ai = createAiService({ layers })
    await Effect.runPromise(ai.generateDiscussion({ system: "SYS", user: "USR" }))
    const prompt = calls[0]!.prompt
    expect(getPromptSystemContent(prompt)).toBe("SYS")
    expect(getPromptUserText(prompt)).toBe("USR")
  })

  it("strips code-fence wrapper if Claude wraps output in ```markdown", async () => {
    const fenced = "```markdown\n" + FAKE_MARKDOWN + "\n```"
    const { layers } = createFakeModelLayersFromText(fenced)
    const ai = createAiService({ layers })
    const result = await Effect.runPromise(ai.generateDiscussion({ system: "s", user: "u" }))
    expect(result).not.toContain("```")
    expect(result).toContain("Jawaban Benar")
  })

  it("returns AiGenerationError when finish_reason is length", async () => {
    const { layers } = createFakeModelLayersFromText(FAKE_MARKDOWN, { finishReason: "length" })
    const ai = createAiService({ layers })
    await expectAiGenerationError(ai.generateDiscussion({ system: "s", user: "u" }))
  })

  it("returns AiGenerationError when Claude returns no text block", async () => {
    const { layers } = createFakeModelLayersFromText("", { finishReason: "stop" })
    const ai = createAiService({ layers })
    await expectAiGenerationError(ai.generateDiscussion({ system: "s", user: "u" }))
  })
})

describe("AiService.streamDiscussion", () => {
  const FAKE_MARKDOWN = `## 1. Soal tentang ide pokok\n**Jawaban Benar: B**\n\nPenjelasan.\n\n**Tip:** Kunci.\n\n---`

  it("yields the full discussion text from Claude", async () => {
    const { layers } = createFakeModelLayersFromText(FAKE_MARKDOWN)
    const ai = createAiService({ layers })
    const text = await Effect.runPromise(
      Stream.runFold(ai.streamDiscussion({ system: "s", user: "u" }), "", (acc, chunk) => acc + chunk)
    )
    expect(text).toBe(FAKE_MARKDOWN)
  })

  it("yields multiple chunks when streamText emits deltas", async () => {
    const { layers } = createFakeModelLayersFromText(FAKE_MARKDOWN, {
      streamChunks: ["## 1.", " Soal", " tentang ide pokok"]
    })
    const ai = createAiService({ layers })
    let chunkCount = 0
    const text = await Effect.runPromise(
      Stream.runFold(ai.streamDiscussion({ system: "s", user: "u" }), "", (acc, chunk) => {
        chunkCount += 1
        return acc + chunk
      })
    )
    expect(chunkCount).toBeGreaterThan(1)
    expect(text).toBe("## 1. Soal tentang ide pokok")
  })

  it("accumulates streamed chunks from the discussion layer", async () => {
    const discussionCalls: Array<string> = []
    const { layers } = createFakeModelLayers((prompt) => {
      discussionCalls.push(getPromptUserText(prompt))
      return { text: FAKE_MARKDOWN, streamChunks: ["chunk-a", "chunk-b"] }
    })
    const ai = createAiService({ layers })
    const text = await Effect.runPromise(
      Stream.runFold(ai.streamDiscussion({ system: "s", user: "u" }), "", (acc, chunk) => acc + chunk)
    )
    expect(text).toBe("chunk-achunk-b")
    expect(discussionCalls).toHaveLength(1)
  })
})
