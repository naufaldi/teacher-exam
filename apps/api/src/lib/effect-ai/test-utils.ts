import { LanguageModel, Prompt } from "@effect/ai"
import { GenerateTextResponse } from "@effect/ai/LanguageModel"
import * as Response from "@effect/ai/Response"
import { Effect, Layer, Schema, Stream } from "effect"
import { AiGenerationError } from "../../errors"
import type { ModelLayers } from "./layers"
import { buildGenerateObjectResponse } from "./run"

export interface RecordedGenerateCall {
  prompt: Prompt.Prompt
}

export interface FakeModelOptions {
  text: string
  objectValue?: unknown
  finishReason?: Response.FinishReason
  leadingReasoning?: string
  streamChunks?: ReadonlyArray<string>
}

export function createFakeLanguageModelService(
  handler: (prompt: Prompt.Prompt) => FakeModelOptions,
  calls: Array<RecordedGenerateCall>
): LanguageModel.Service {
  return {
    generateText: (options) =>
      Effect.gen(function*() {
        const prompt = Prompt.make(options.prompt)
        calls.push({ prompt })
        const resolved = handler(prompt)
        const content: Array<Response.Part<Record<string, never>>> = []
        if (resolved.leadingReasoning !== undefined) {
          content.push(
            Response.makePart("reasoning", { text: resolved.leadingReasoning })
          )
        }
        content.push(Response.makePart("text", { text: resolved.text }))
        content.push(
          Response.makePart("finish", {
            reason: resolved.finishReason ?? "stop",
            usage: {
              inputTokens: 1,
              outputTokens: 1,
              totalTokens: 2,
              reasoningTokens: undefined,
              cachedInputTokens: undefined
            }
          })
        )
        return new GenerateTextResponse(content)
      }) as ReturnType<LanguageModel.Service["generateText"]>,
    generateObject: (options) =>
      Effect.gen(function*() {
        const prompt = Prompt.make(options.prompt)
        calls.push({ prompt })
        const resolved = handler(prompt)
        if (resolved.objectValue !== undefined) {
          return buildGenerateObjectResponse(resolved.objectValue)
        }
        const parsed = yield* Effect.try({
          try: () => JSON.parse(resolved.text) as unknown,
          catch: (cause) =>
            new AiGenerationError({
              cause: `AI returned non-JSON output: ${(cause as Error).message}`
            })
        })
        const payload = Array.isArray(parsed)
          ? options.objectName === "curriculum_validation"
            ? { items: parsed }
            : { questions: parsed }
          : parsed
        const value = yield* Schema.decodeUnknown(options.schema)(payload).pipe(
          Effect.mapError(
            (error) =>
              new AiGenerationError({
                cause: `Structured output failed schema validation: ${String(error)}`
              })
          )
        )
        return buildGenerateObjectResponse(value)
      }) as ReturnType<LanguageModel.Service["generateObject"]>,
    streamText: (options) => {
      const prompt = Prompt.make(options.prompt)
      calls.push({ prompt })
      const resolved = handler(prompt)
      const chunks = resolved.streamChunks ?? splitStreamChunks(resolved.text)
      return Stream.fromIterable(
        chunks.map((delta, index) => Response.textDeltaPart({ id: `chunk-${index}`, delta }))
      )
    }
  }
}

function splitStreamChunks(text: string, size = 8): ReadonlyArray<string> {
  if (text.length === 0) {
    return [""]
  }
  const chunks: Array<string> = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

export function createFakeModelLayers(
  handler: (prompt: Prompt.Prompt) => FakeModelOptions
): { layers: ModelLayers; calls: Array<RecordedGenerateCall> } {
  const calls: Array<RecordedGenerateCall> = []
  const layer = Layer.succeed(
    LanguageModel.LanguageModel,
    createFakeLanguageModelService(handler, calls)
  )
  return {
    layers: {
      text: layer,
      pdf: layer,
      discussion: layer,
      validation: layer
    },
    calls
  }
}

export function createFakeModelLayersFromText(
  text: string,
  options: Omit<FakeModelOptions, "text"> = {}
): { layers: ModelLayers; calls: Array<RecordedGenerateCall> } {
  return createFakeModelLayers(() => ({
    text,
    ...(options.finishReason !== undefined ? { finishReason: options.finishReason } : {}),
    ...(options.leadingReasoning !== undefined ? { leadingReasoning: options.leadingReasoning } : {}),
    ...(options.objectValue !== undefined ? { objectValue: options.objectValue } : {}),
    ...(options.streamChunks !== undefined ? { streamChunks: options.streamChunks } : {})
  }))
}

export function createFakeModelLayersFromQuestions(
  questions: ReadonlyArray<unknown>
): { layers: ModelLayers; calls: Array<RecordedGenerateCall> } {
  const objectValue = { questions }
  return createFakeModelLayersFromText(JSON.stringify(objectValue), { objectValue })
}
