import { LanguageModel, Prompt } from '@effect/ai'
import * as Response from '@effect/ai/Response'
import { GenerateTextResponse } from '@effect/ai/LanguageModel'
import { Effect, Layer, Stream } from 'effect'
import type { ModelLayers } from './layers'

export interface RecordedGenerateCall {
  prompt: Prompt.Prompt
}

export interface FakeModelOptions {
  text: string
  finishReason?: Response.FinishReason
  leadingReasoning?: string
}

export function createFakeLanguageModelService(
  handler: (prompt: Prompt.Prompt) => FakeModelOptions,
  calls: Array<RecordedGenerateCall>,
): LanguageModel.Service {
  return {
    generateText: (options) =>
      Effect.gen(function* () {
        const prompt = Prompt.make(options.prompt)
        calls.push({ prompt })
        const resolved = handler(prompt)
        const content: Array<Response.Part<Record<string, never>>> = []
        if (resolved.leadingReasoning !== undefined) {
          content.push(
            Response.makePart('reasoning', { text: resolved.leadingReasoning }),
          )
        }
        content.push(Response.makePart('text', { text: resolved.text }))
        content.push(
          Response.makePart('finish', {
            reason: resolved.finishReason ?? 'stop',
            usage: {
              inputTokens: 1,
              outputTokens: 1,
              totalTokens: 2,
              reasoningTokens: undefined,
              cachedInputTokens: undefined,
            },
          }),
        )
        return new GenerateTextResponse(content)
      }) as ReturnType<LanguageModel.Service['generateText']>,
    generateObject: () => Effect.die('generateObject not implemented in fake LanguageModel'),
    streamText: () => Stream.dieMessage('streamText not implemented in fake LanguageModel'),
  }
}

export function createFakeModelLayers(
  handler: (prompt: Prompt.Prompt) => FakeModelOptions,
): { layers: ModelLayers; calls: Array<RecordedGenerateCall> } {
  const calls: Array<RecordedGenerateCall> = []
  const layer = Layer.succeed(
    LanguageModel.LanguageModel,
    createFakeLanguageModelService(handler, calls),
  )
  return {
    layers: {
      text: layer,
      pdf: layer,
      discussion: layer,
      validation: layer,
    },
    calls,
  }
}

export function createFakeModelLayersFromText(
  text: string,
  options: Omit<FakeModelOptions, 'text'> = {},
): { layers: ModelLayers; calls: Array<RecordedGenerateCall> } {
  return createFakeModelLayers(() => ({
    text,
    ...(options.finishReason !== undefined ? { finishReason: options.finishReason } : {}),
    ...(options.leadingReasoning !== undefined ? { leadingReasoning: options.leadingReasoning } : {}),
  }))
}
