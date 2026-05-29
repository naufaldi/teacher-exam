import type { AiError, Prompt } from "@effect/ai"
import { LanguageModel } from "@effect/ai"
import { GenerateObjectResponse, GenerateTextResponse } from "@effect/ai/LanguageModel"
import * as Response from "@effect/ai/Response"
import { Effect, Option, Stream } from "effect"
import type { Layer, Schema } from "effect"
import { withAiSpan } from "../../api/telemetry"
import { AiGenerationError } from "../../errors"
import { mapAiError, type ProviderErrorContext } from "./errors"
import { logGenerateTextFailure, logGenerateTextSuccess } from "./logging"

function isAiGenerationError(error: unknown): error is AiGenerationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    (error as { _tag: string })._tag === "AiGenerationError"
  )
}

export function isSuccessfulFinishReason(
  finishReason: Response.FinishReason,
  hasText: boolean
): boolean {
  if (finishReason === "stop") {
    return true
  }
  if (finishReason === "unknown" && hasText) {
    return true
  }
  return false
}

export interface RunGenerateTextInput {
  modelLayer: Layer.Layer<LanguageModel.LanguageModel>
  prompt: Prompt.Prompt
  model: string
  logEvent: string
  errorContext: ProviderErrorContext
}

export function runGenerateText(
  input: RunGenerateTextInput
): Effect.Effect<string, AiGenerationError> {
  return withAiSpan(
    input.logEvent,
    Effect.gen(function*() {
      const t0 = Date.now()
      const response = yield* LanguageModel.generateText({
        prompt: input.prompt
      }).pipe(
        Effect.mapError((error) => mapAiError(error, input.errorContext)),
        Effect.provide(input.modelLayer)
      )

      const durationMs = Date.now() - t0
      const assistantText = response.text
      const hasAssistantText = assistantText.length > 0
      const finishReason = response.finishReason

      if (!isSuccessfulFinishReason(finishReason, hasAssistantText)) {
        const message = `AI returned incomplete output (finish_reason: ${finishReason})`
        logGenerateTextFailure({
          model: input.model,
          event: input.logEvent,
          durationMs,
          finishReason,
          message
        })
        return yield* Effect.fail(new AiGenerationError({ cause: message }))
      }

      if (!hasAssistantText) {
        logGenerateTextFailure({
          model: input.model,
          event: input.logEvent,
          durationMs,
          finishReason,
          message: "no assistant text block"
        })
        return yield* Effect.fail(new AiGenerationError({ cause: "AI returned no text block" }))
      }

      logGenerateTextSuccess({
        model: input.model,
        event: input.logEvent,
        durationMs,
        finishReason,
        usage: response.usage
      })

      return assistantText
    })
  )
}

export function runStreamText(
  input: RunGenerateTextInput
): Stream.Stream<string, AiGenerationError> {
  return LanguageModel.streamText({
    prompt: input.prompt
  }).pipe(
    Stream.mapError((error) => mapAiError(error, input.errorContext)),
    Stream.filterMap((part) => part.type === "text-delta" ? Option.some(part.delta) : Option.none()),
    Stream.provideLayer(input.modelLayer)
  )
}

export interface RunGenerateObjectInput<A, I extends Record<string, unknown>> {
  modelLayer: Layer.Layer<LanguageModel.LanguageModel>
  prompt: Prompt.Prompt
  model: string
  logEvent: string
  errorContext: ProviderErrorContext
  schema: Schema.Schema<A, I, never>
  objectName: string
}

export function runGenerateObject<A, I extends Record<string, unknown>>(
  input: RunGenerateObjectInput<A, I>
): Effect.Effect<A, AiGenerationError> {
  return withAiSpan(
    "ai.languageModel.generateObject",
    Effect.gen(function*() {
      const t0 = Date.now()
      const response = yield* LanguageModel.generateObject({
        prompt: input.prompt,
        schema: input.schema,
        objectName: input.objectName
      }).pipe(
        Effect.mapError((error) => {
          if (isAiGenerationError(error)) {
            return error
          }
          return mapAiError(error as AiError.AiError, input.errorContext)
        }),
        Effect.provide(input.modelLayer)
      )

      const durationMs = Date.now() - t0
      logGenerateTextSuccess({
        model: input.model,
        event: input.logEvent,
        durationMs,
        finishReason: "stop"
      })

      return response.value
    })
  ).pipe(
    Effect.mapError((error) => {
      if (isAiGenerationError(error)) {
        return error
      }
      return new AiGenerationError({ cause: String(error) })
    })
  )
}

export function buildGenerateObjectResponse<A>(
  value: A
): GenerateObjectResponse<Record<string, never>, A> {
  return new GenerateObjectResponse(value, [
    Response.makePart("text", { text: JSON.stringify(value) }),
    Response.makePart("finish", {
      reason: "stop",
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        reasoningTokens: undefined,
        cachedInputTokens: undefined
      }
    })
  ])
}

export function buildGenerateTextResponse(
  text: string,
  finishReason: Response.FinishReason = "stop"
): GenerateTextResponse<Record<string, never>> {
  return new GenerateTextResponse([
    Response.makePart("text", { text }),
    Response.makePart("finish", {
      reason: finishReason,
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        reasoningTokens: undefined,
        cachedInputTokens: undefined
      }
    })
  ])
}
