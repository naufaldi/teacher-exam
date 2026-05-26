import { LanguageModel, Prompt } from '@effect/ai'
import * as Response from '@effect/ai/Response'
import { GenerateTextResponse } from '@effect/ai/LanguageModel'
import { Effect, Layer } from 'effect'
import { AiGenerationError } from '../../errors'
import { mapAiError, type ProviderErrorContext } from './errors'
import { logGenerateTextFailure, logGenerateTextSuccess } from './logging'

export function isSuccessfulFinishReason(
  finishReason: Response.FinishReason,
  hasText: boolean,
): boolean {
  if (finishReason === 'stop') {
    return true
  }
  if (finishReason === 'unknown' && hasText) {
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
  input: RunGenerateTextInput,
): Effect.Effect<string, AiGenerationError> {
  return Effect.gen(function* () {
    const t0 = Date.now()
    const response = yield* LanguageModel.generateText({
      prompt: input.prompt,
    }).pipe(
      Effect.mapError((error) => mapAiError(error, input.errorContext)),
      Effect.provide(input.modelLayer),
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
        message,
      })
      return yield* Effect.fail(new AiGenerationError({ cause: message }))
    }

    if (!hasAssistantText) {
      logGenerateTextFailure({
        model: input.model,
        event: input.logEvent,
        durationMs,
        finishReason,
        message: 'no assistant text block',
      })
      return yield* Effect.fail(new AiGenerationError({ cause: 'AI returned no text block' }))
    }

    logGenerateTextSuccess({
      model: input.model,
      event: input.logEvent,
      durationMs,
      finishReason,
      usage: response.usage,
    })

    return assistantText
  })
}

export function buildGenerateTextResponse(
  text: string,
  finishReason: Response.FinishReason = 'stop',
): GenerateTextResponse<Record<string, never>> {
  return new GenerateTextResponse([
    Response.makePart('text', { text }),
    Response.makePart('finish', {
      reason: finishReason,
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        reasoningTokens: undefined,
        cachedInputTokens: undefined,
      },
    }),
  ])
}
