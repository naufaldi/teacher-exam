import { AiError, LanguageModel } from "@effect/ai"
import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import type { HttpClient } from "@effect/platform/HttpClient"
import { Effect, JSONSchema, Layer, Redacted, type Schema, Stream } from "effect"
import { createMinimaxFetch, isMinimaxDnsFallbackEnabled } from "../minimax-fetch"
import {
  DEFAULT_DISCUSSION_MAX_TOKENS,
  DEFAULT_DISCUSSION_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MINIMAX_ANTHROPIC_BASE_URL,
  DEFAULT_MINIMAX_DISCUSSION_MODEL,
  DEFAULT_MINIMAX_MODEL,
  DEFAULT_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_DISCUSSION_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_VALIDATION_MAX_TOKENS
} from "./constants"
import { completeOpenAiParts, streamOpenAiParts } from "./openai-effect4"
import type { OpenAiCompletionRequest, OpenAiFilePart } from "./openai-effect4"
import { getPromptSystemContent, getPromptUserFileParts, getPromptUserText } from "./prompt"

export type AiProvider = "anthropic" | "minimax" | "openai"

export interface ModelLayerConfig {
  provider: AiProvider
  apiKey: string
  apiUrl?: string
  model: string
  pdfModel: string
  discussionModel: string
  maxTokens: number
  discussionMaxTokens: number
  validationMaxTokens: number
}

export interface ModelLayers {
  text: Layer.Layer<LanguageModel.LanguageModel>
  pdf: Layer.Layer<LanguageModel.LanguageModel>
  discussion: Layer.Layer<LanguageModel.LanguageModel>
  validation: Layer.Layer<LanguageModel.LanguageModel>
}

export interface ResolvedModelLayerConfig {
  provider: AiProvider
  apiKey: string
  apiUrl?: string
  model: string
  pdfModel: string
  discussionModel: string
  maxTokens: number
  discussionMaxTokens: number
  validationMaxTokens: number
}

function shouldUseMinimaxFetch(apiUrl: string | undefined): boolean {
  if (!isMinimaxDnsFallbackEnabled() || apiUrl === undefined) {
    return false
  }
  try {
    return new URL(apiUrl).hostname === "api.minimax.io"
  } catch {
    return false
  }
}

export function buildFetchHttpLayer(apiUrl?: string): Layer.Layer<HttpClient> {
  if (shouldUseMinimaxFetch(apiUrl)) {
    return Layer.provide(
      FetchHttpClient.layer,
      Layer.succeed(FetchHttpClient.Fetch, createMinimaxFetch())
    )
  }
  return FetchHttpClient.layer
}

function buildAnthropicClientLayer(
  config: Pick<ModelLayerConfig, "apiKey" | "apiUrl">,
  apiUrl?: string
) {
  const clientOptions: Parameters<typeof AnthropicClient.layer>[0] = {
    apiKey: Redacted.make(config.apiKey),
    ...(config.apiUrl !== undefined ? { apiUrl: config.apiUrl } : {})
  }
  return Layer.provide(AnthropicClient.layer(clientOptions), buildFetchHttpLayer(apiUrl ?? config.apiUrl))
}

function unknownOpenAiError(method: string, cause: unknown): AiError.AiError {
  const description = cause instanceof Error ? cause.message : String(cause)
  return new AiError.UnknownError({
    module: "OpenAiLanguageModel",
    method,
    description,
    cause
  })
}

function openAiJsonSchema(
  schema: Schema.Schema.Any,
  objectName: string
): NonNullable<OpenAiCompletionRequest["jsonSchema"]> {
  const document = JSONSchema.make(schema) as unknown as Record<string, unknown>
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(document)) {
    if (key !== "$schema") {
      rest[key] = value
    }
  }
  return { name: objectName, schema: rest }
}

function toOpenAiRequest(
  config: Pick<ModelLayerConfig, "apiKey" | "apiUrl">,
  model: string,
  maxTokens: number,
  options: LanguageModel.ProviderOptions
): OpenAiCompletionRequest {
  const files: Array<OpenAiFilePart> = getPromptUserFileParts(options.prompt).map((part) => ({
    mediaType: part.mediaType,
    ...(part.fileName !== undefined ? { fileName: part.fileName } : {}),
    data: part.data
  }))
  const request: OpenAiCompletionRequest = {
    apiKey: config.apiKey,
    ...(config.apiUrl !== undefined ? { apiUrl: config.apiUrl } : {}),
    model,
    maxOutputTokens: maxTokens,
    system: getPromptSystemContent(options.prompt) ?? "",
    userText: getPromptUserText(options.prompt),
    files
  }
  if (options.responseFormat.type === "json") {
    return {
      ...request,
      jsonSchema: openAiJsonSchema(options.responseFormat.schema, options.responseFormat.objectName)
    }
  }
  return request
}

function buildAnthropicModelLayer(
  model: string,
  maxTokens: number,
  clientLayer: ReturnType<typeof buildAnthropicClientLayer>
) {
  return Layer.provide(
    AnthropicLanguageModel.model(model, { max_tokens: maxTokens }),
    clientLayer
  )
}

function buildOpenAiModelLayer(
  config: Pick<ModelLayerConfig, "apiKey" | "apiUrl">,
  model: string,
  maxTokens: number
): Layer.Layer<LanguageModel.LanguageModel> {
  return Layer.effect(
    LanguageModel.LanguageModel,
    LanguageModel.make({
      generateText: (options) =>
        Effect.tryPromise({
          try: async () => {
            const parts = await completeOpenAiParts(toOpenAiRequest(config, model, maxTokens, options))
            return parts.map((part) => {
              if (part.type === "text") {
                return { type: "text" as const, text: part.text }
              }
              return {
                type: "finish" as const,
                reason: part.reason,
                usage: {
                  inputTokens: part.usage.inputTokens,
                  outputTokens: part.usage.outputTokens,
                  totalTokens: part.usage.totalTokens
                }
              }
            })
          },
          catch: (cause) => unknownOpenAiError("generateText", cause)
        }),
      streamText: (options) =>
        Stream.map(
          Stream.fromAsyncIterable(
            streamOpenAiParts(toOpenAiRequest(config, model, maxTokens, options)),
            (cause) => unknownOpenAiError("streamText", cause)
          ),
          (part) => {
            if (part.type === "finish") {
              return {
                type: "finish" as const,
                reason: part.reason,
                usage: {
                  inputTokens: part.usage.inputTokens,
                  outputTokens: part.usage.outputTokens,
                  totalTokens: part.usage.totalTokens
                }
              }
            }
            if (part.type === "text-delta") {
              return {
                type: "text-delta" as const,
                id: part.id,
                delta: part.delta ?? ""
              }
            }
            return { type: part.type, id: part.id }
          }
        )
    })
  )
}

export function buildAnthropicModelLayers(config: ModelLayerConfig): ModelLayers {
  const clientLayer = buildAnthropicClientLayer(config, config.apiUrl)
  return {
    text: buildAnthropicModelLayer(config.model, config.maxTokens, clientLayer),
    pdf: buildAnthropicModelLayer(config.pdfModel, config.maxTokens, clientLayer),
    discussion: buildAnthropicModelLayer(
      config.discussionModel,
      config.discussionMaxTokens,
      clientLayer
    ),
    validation: buildAnthropicModelLayer(
      config.discussionModel,
      config.validationMaxTokens,
      clientLayer
    )
  }
}

export function buildOpenAiModelLayers(config: ModelLayerConfig): ModelLayers {
  return {
    text: buildOpenAiModelLayer(config, config.model, config.maxTokens),
    pdf: buildOpenAiModelLayer(config, config.model, config.maxTokens),
    discussion: buildOpenAiModelLayer(config, config.discussionModel, config.discussionMaxTokens),
    validation: buildOpenAiModelLayer(config, config.discussionModel, config.validationMaxTokens)
  }
}

export function buildModelLayers(config: ModelLayerConfig): ModelLayers {
  if (config.provider === "openai") {
    return buildOpenAiModelLayers(config)
  }
  return buildAnthropicModelLayers(config)
}

export function resolveAnthropicLayerConfig(env: NodeJS.ProcessEnv = process.env): ResolvedModelLayerConfig {
  return {
    provider: "anthropic",
    apiKey: requireEnv(env["ANTHROPIC_API_KEY"], "ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic"),
    model: env["AI_MODEL"]?.trim() || DEFAULT_MODEL,
    pdfModel: env["AI_MODEL"]?.trim() || DEFAULT_MODEL,
    discussionModel: env["AI_DISCUSSION_MODEL"]?.trim() || DEFAULT_DISCUSSION_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    discussionMaxTokens: DEFAULT_DISCUSSION_MAX_TOKENS,
    validationMaxTokens: DEFAULT_VALIDATION_MAX_TOKENS
  }
}

export function resolveMinimaxLayerConfig(env: NodeJS.ProcessEnv = process.env): ResolvedModelLayerConfig {
  const model = env["AI_MODEL"]?.trim() || DEFAULT_MINIMAX_MODEL
  return {
    provider: "minimax",
    apiKey: requireEnv(env["MINIMAX_API_KEY"], "MINIMAX_API_KEY is required when AI_PROVIDER=minimax"),
    apiUrl: env["MINIMAX_ANTHROPIC_BASE_URL"]?.trim() || DEFAULT_MINIMAX_ANTHROPIC_BASE_URL,
    model,
    pdfModel: model,
    discussionModel: env["AI_DISCUSSION_MODEL"]?.trim() || DEFAULT_MINIMAX_DISCUSSION_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    discussionMaxTokens: DEFAULT_DISCUSSION_MAX_TOKENS,
    validationMaxTokens: DEFAULT_VALIDATION_MAX_TOKENS
  }
}

export function resolveOpenAiLayerConfig(env: NodeJS.ProcessEnv = process.env): ResolvedModelLayerConfig {
  const model = env["AI_MODEL"]?.trim() || DEFAULT_OPENAI_MODEL
  return {
    provider: "openai",
    apiKey: requireEnv(env["OPENAI_API_KEY"], "OPENAI_API_KEY is required when AI_PROVIDER=openai"),
    apiUrl: env["OPENAI_BASE_URL"]?.trim() || DEFAULT_OPENAI_BASE_URL,
    model,
    pdfModel: model,
    discussionModel: env["AI_DISCUSSION_MODEL"]?.trim() || DEFAULT_OPENAI_DISCUSSION_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    discussionMaxTokens: DEFAULT_DISCUSSION_MAX_TOKENS,
    validationMaxTokens: DEFAULT_VALIDATION_MAX_TOKENS
  }
}

export function createModelLayersFromResolved(config: ResolvedModelLayerConfig): ModelLayers {
  return buildModelLayers({
    provider: config.provider,
    apiKey: config.apiKey,
    ...(config.apiUrl !== undefined ? { apiUrl: config.apiUrl } : {}),
    model: config.model,
    pdfModel: config.pdfModel,
    discussionModel: config.discussionModel,
    maxTokens: config.maxTokens,
    discussionMaxTokens: config.discussionMaxTokens,
    validationMaxTokens: config.validationMaxTokens
  })
}

function requireEnv(value: string | undefined, message: string): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(message)
  }
  return trimmed
}

export function describeResolvedConfig(config: ResolvedModelLayerConfig): {
  provider: AiProvider
  apiUrl?: string
  usesMinimaxFetch: boolean
} {
  return {
    provider: config.provider,
    ...(config.apiUrl !== undefined ? { apiUrl: config.apiUrl } : {}),
    usesMinimaxFetch: shouldUseMinimaxFetch(config.apiUrl)
  }
}
