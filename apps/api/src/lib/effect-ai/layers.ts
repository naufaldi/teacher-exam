import { LanguageModel } from '@effect/ai'
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic'
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai'
import { HttpClient } from '@effect/platform/HttpClient'
import * as FetchHttpClient from '@effect/platform/FetchHttpClient'
import { Layer, Redacted } from 'effect'
import { createMinimaxFetch, isMinimaxDnsFallbackEnabled } from '../minimax-fetch'
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
  DEFAULT_VALIDATION_MAX_TOKENS,
} from './constants'

export type AiProvider = 'anthropic' | 'minimax' | 'openai'

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
    return new URL(apiUrl).hostname === 'api.minimax.io'
  } catch {
    return false
  }
}

export function buildFetchHttpLayer(apiUrl?: string): Layer.Layer<HttpClient> {
  if (shouldUseMinimaxFetch(apiUrl)) {
    return Layer.provide(
      FetchHttpClient.layer,
      Layer.succeed(FetchHttpClient.Fetch, createMinimaxFetch()),
    )
  }
  return FetchHttpClient.layer
}

function buildAnthropicClientLayer(
  config: Pick<ModelLayerConfig, 'apiKey' | 'apiUrl'>,
  apiUrl?: string,
) {
  const clientOptions: Parameters<typeof AnthropicClient.layer>[0] = {
    apiKey: Redacted.make(config.apiKey),
    ...(config.apiUrl !== undefined ? { apiUrl: config.apiUrl } : {}),
  }
  return Layer.provide(AnthropicClient.layer(clientOptions), buildFetchHttpLayer(apiUrl ?? config.apiUrl))
}

function buildOpenAiClientLayer(config: Pick<ModelLayerConfig, 'apiKey' | 'apiUrl'>) {
  const clientOptions: Parameters<typeof OpenAiClient.layer>[0] = {
    apiKey: Redacted.make(config.apiKey),
    ...(config.apiUrl !== undefined ? { apiUrl: config.apiUrl } : {}),
  }
  return Layer.provide(OpenAiClient.layer(clientOptions), FetchHttpClient.layer)
}

function buildAnthropicModelLayer(
  model: string,
  maxTokens: number,
  clientLayer: ReturnType<typeof buildAnthropicClientLayer>,
) {
  return Layer.provide(
    AnthropicLanguageModel.model(model, { max_tokens: maxTokens }),
    clientLayer,
  )
}

function buildOpenAiModelLayer(
  model: string,
  maxTokens: number,
  clientLayer: ReturnType<typeof buildOpenAiClientLayer>,
) {
  return Layer.provide(
    OpenAiLanguageModel.model(model, { max_output_tokens: maxTokens }),
    clientLayer,
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
      clientLayer,
    ),
    validation: buildAnthropicModelLayer(
      config.discussionModel,
      config.validationMaxTokens,
      clientLayer,
    ),
  }
}

export function buildOpenAiModelLayers(config: ModelLayerConfig): ModelLayers {
  const clientLayer = buildOpenAiClientLayer(config)
  return {
    text: buildOpenAiModelLayer(config.model, config.maxTokens, clientLayer),
    pdf: buildOpenAiModelLayer(config.model, config.maxTokens, clientLayer),
    discussion: buildOpenAiModelLayer(
      config.discussionModel,
      config.discussionMaxTokens,
      clientLayer,
    ),
    validation: buildOpenAiModelLayer(
      config.discussionModel,
      config.validationMaxTokens,
      clientLayer,
    ),
  }
}

export function buildModelLayers(config: ModelLayerConfig): ModelLayers {
  if (config.provider === 'openai') {
    return buildOpenAiModelLayers(config)
  }
  return buildAnthropicModelLayers(config)
}

export function resolveAnthropicLayerConfig(env: NodeJS.ProcessEnv = process.env): ResolvedModelLayerConfig {
  return {
    provider: 'anthropic',
    apiKey: requireEnv(env['ANTHROPIC_API_KEY'], 'ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic'),
    model: env['AI_MODEL']?.trim() || DEFAULT_MODEL,
    pdfModel: env['AI_MODEL']?.trim() || DEFAULT_MODEL,
    discussionModel: env['AI_DISCUSSION_MODEL']?.trim() || DEFAULT_DISCUSSION_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    discussionMaxTokens: DEFAULT_DISCUSSION_MAX_TOKENS,
    validationMaxTokens: DEFAULT_VALIDATION_MAX_TOKENS,
  }
}

export function resolveMinimaxLayerConfig(env: NodeJS.ProcessEnv = process.env): ResolvedModelLayerConfig {
  const model = env['AI_MODEL']?.trim() || DEFAULT_MINIMAX_MODEL
  return {
    provider: 'minimax',
    apiKey: requireEnv(env['MINIMAX_API_KEY'], 'MINIMAX_API_KEY is required when AI_PROVIDER=minimax'),
    apiUrl: env['MINIMAX_ANTHROPIC_BASE_URL']?.trim() || DEFAULT_MINIMAX_ANTHROPIC_BASE_URL,
    model,
    pdfModel: model,
    discussionModel: env['AI_DISCUSSION_MODEL']?.trim() || DEFAULT_MINIMAX_DISCUSSION_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    discussionMaxTokens: DEFAULT_DISCUSSION_MAX_TOKENS,
    validationMaxTokens: DEFAULT_VALIDATION_MAX_TOKENS,
  }
}

export function resolveOpenAiLayerConfig(env: NodeJS.ProcessEnv = process.env): ResolvedModelLayerConfig {
  const model = env['AI_MODEL']?.trim() || DEFAULT_OPENAI_MODEL
  return {
    provider: 'openai',
    apiKey: requireEnv(env['OPENAI_API_KEY'], 'OPENAI_API_KEY is required when AI_PROVIDER=openai'),
    apiUrl: env['OPENAI_BASE_URL']?.trim() || DEFAULT_OPENAI_BASE_URL,
    model,
    pdfModel: model,
    discussionModel: env['AI_DISCUSSION_MODEL']?.trim() || DEFAULT_OPENAI_DISCUSSION_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    discussionMaxTokens: DEFAULT_DISCUSSION_MAX_TOKENS,
    validationMaxTokens: DEFAULT_VALIDATION_MAX_TOKENS,
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
    validationMaxTokens: config.validationMaxTokens,
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
    usesMinimaxFetch: shouldUseMinimaxFetch(config.apiUrl),
  }
}
