import Anthropic, { APIError } from '@anthropic-ai/sdk'
import { Effect, Schema, Either } from 'effect'
import { CurriculumValidationItemSchema, type GeneratedQuestion, type CurriculumValidationItem } from '@teacher-exam/shared'
import { AiGenerationError } from '../errors'
import { logAiEvent } from '../lib/ai-log'
import { createMinimaxFetch, isMinimaxDnsFallbackEnabled } from '../lib/minimax-fetch'
import {
  callOpenAiLlmText,
  createOpenAiClient,
  type OpenAiCallConfig,
  type OpenAiLike,
} from '../lib/openai-llm'
import { parseGeneratedQuestionsStrict } from '../lib/parse-generated-questions'

export interface GenerateInput {
  /** Sent verbatim as the Anthropic `system` field. Carries curriculum corpus. */
  system: string
  /** Sent as the user message text block. Carries per-request parameters. */
  user: string
  /** Optional PDF bytes — attached as a Claude `document` content block. */
  pdfBytes?: Buffer | undefined
  /** Number of questions the AI is expected to return. */
  expectedCount: number
}

export interface DiscussionInput {
  system: string
  user: string
}

export interface ValidateCurriculumInput {
  system: string
  user: string
  expectedCount: number
}

export interface GenerateRawInput {
  system: string
  user: string
  pdfBytes?: Buffer | undefined
}

export interface AiService {
  generate: (input: GenerateInput) => Effect.Effect<ReadonlyArray<GeneratedQuestion>, AiGenerationError>
  /** Raw assistant text — for bulk salvage parsing in the generate route. */
  generateRaw: (input: GenerateRawInput) => Effect.Effect<string, AiGenerationError>
  validateCurriculum: (input: ValidateCurriculumInput) => Effect.Effect<ReadonlyArray<CurriculumValidationItem>, AiGenerationError>
  generateDiscussion: (input: DiscussionInput) => Effect.Effect<string, AiGenerationError>
  streamDiscussion: (input: DiscussionInput) => AsyncGenerator<string>
}

/**
 * Subset of Anthropic SDK we depend on. Lets tests pass a fake client without
 * pulling in the full SDK surface.
 */
export interface AnthropicLike {
  messages: {
    create: (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>
  }
}

export interface AiServiceConfig {
  client: AnthropicLike
  model?: string
  /** Overrides `model` for `generate()` when `pdfBytes` is provided. */
  pdfModel?: string
  maxTokens?: number
  discussionModel?: string
  discussionMaxTokens?: number
  validationModel?: string
  validationMaxTokens?: number
  provider?: 'anthropic' | 'minimax'
  baseURL?: string
}

const DEFAULT_MODEL = 'claude-opus-4-5'
const DEFAULT_DISCUSSION_MODEL = 'claude-haiku-4-5'
const DEFAULT_MINIMAX_MODEL = 'MiniMax-M2.7'
const DEFAULT_MINIMAX_DISCUSSION_MODEL = 'MiniMax-M2.7-highspeed'
const DEFAULT_MAX_TOKENS = 32000
const DEFAULT_DISCUSSION_MAX_TOKENS = 16000
const DEFAULT_VALIDATION_MAX_TOKENS = 8000
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000
const DEFAULT_MINIMAX_ANTHROPIC_BASE_URL = 'https://api.minimax.io/anthropic'
const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini'
const DEFAULT_OPENAI_DISCUSSION_MODEL = 'gpt-5.4-mini'
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'

export interface OpenAiServiceConfig {
  client: OpenAiLike
  model?: string
  maxTokens?: number
  discussionModel?: string
  discussionMaxTokens?: number
  validationModel?: string
  validationMaxTokens?: number
  provider?: 'openai'
  baseURL?: string
}

function createMinimaxAnthropicClient(apiKey: string, baseURL: string): Anthropic {
  const clientOptions: ConstructorParameters<typeof Anthropic>[0] = {
    apiKey,
    baseURL,
    timeout: DEFAULT_TIMEOUT_MS,
  }

  if (isMinimaxDnsFallbackEnabled()) {
    try {
      const hostname = new URL(baseURL).hostname
      if (hostname === 'api.minimax.io') {
        clientOptions.fetch = createMinimaxFetch()
      }
    } catch {
      // keep default fetch when baseURL is invalid; request will fail with existing errors
    }
  }

  return new Anthropic(clientOptions)
}

/**
 * Create an `AiService` bound to a given Anthropic client.
 *
 * Critical contract — `system` is sent via the SDK's top-level `system` field,
 * NOT merged into the user content. This keeps the curriculum corpus separate
 * from per-request parameters and unlocks Anthropic prompt caching for the
 * (large, stable) system block. See [docs RFC §9].
 */
export function createAiService(config: AiServiceConfig): AiService {
  const model = config.model ?? DEFAULT_MODEL
  const pdfModel = config.pdfModel ?? model
  const discussionModel = config.discussionModel ?? DEFAULT_DISCUSSION_MODEL
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS
  const discussionMaxTokens = config.discussionMaxTokens ?? DEFAULT_DISCUSSION_MAX_TOKENS
  const validationModel = config.validationModel ?? discussionModel
  const validationMaxTokens = config.validationMaxTokens ?? DEFAULT_VALIDATION_MAX_TOKENS

  const getDiscussionText = (input: DiscussionInput): Effect.Effect<string, AiGenerationError> =>
    callAnthropicText({
      config,
      model: discussionModel,
      max_tokens: discussionMaxTokens,
      system: input.system,
      content: [{ type: 'text', text: input.user }],
    }).pipe(Effect.map((text) => stripCodeFence(text)))

  const buildGenerateContent = (
    user: string,
    pdfBytes: Buffer | undefined,
  ): Anthropic.ContentBlockParam[] => {
    const content: Anthropic.ContentBlockParam[] = []
    if (pdfBytes) {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: pdfBytes.toString('base64'),
        },
      })
    }
    content.push({ type: 'text', text: user })
    return content
  }

  return {
    generateRaw({ system, user, pdfBytes }) {
      const generateModel = pdfBytes ? pdfModel : model
      return callAnthropicText({
        config,
        model: generateModel,
        max_tokens: maxTokens,
        system,
        content: buildGenerateContent(user, pdfBytes),
      })
    },

    generate({ system, user, pdfBytes, expectedCount }) {
      const generateModel = pdfBytes ? pdfModel : model

      return Effect.gen(function* () {
        const text = yield* callAnthropicText({
          config,
          model: generateModel,
          max_tokens: maxTokens,
          system,
          content: buildGenerateContent(user, pdfBytes),
        })
        const questions = yield* parseGeneratedQuestionsStrict(text, expectedCount).pipe(
          Effect.tapError((e) =>
            Effect.sync(() =>
              logAiEvent('ai.generate.parse', 'warn', {
                model: generateModel,
                cause: String(e.cause),
              }),
            ),
          ),
        )
        return questions
      })
    },

    validateCurriculum({ system, user, expectedCount }) {
      return Effect.gen(function* () {
        const text = yield* callAnthropicText({
          config,
          model: validationModel,
          max_tokens: validationMaxTokens,
          system,
          content: [{ type: 'text', text: user }],
        })
        const items = yield* parseCurriculumValidation(text)
        if (items.length !== expectedCount) {
          return yield* Effect.fail(
            new AiGenerationError({
              cause: `Expected ${expectedCount} validation items, got ${items.length}`,
            }),
          )
        }
        return items
      })
    },

    generateDiscussion(input) {
      return getDiscussionText(input)
    },

    async *streamDiscussion(input) {
      const result = await Effect.runPromise(Effect.either(getDiscussionText(input)))
      if (Either.isLeft(result)) {
        const err = result.left
        const message = typeof err.cause === 'string' ? err.cause : String(err.cause)
        throw new Error(message, { cause: err })
      }
      yield result.right
    },
  }
}

/**
 * Create an `AiService` bound to a given OpenAI client.
 * Text calls use Chat Completions; PDF materi uses the Responses API.
 */
export function createOpenAiService(config: OpenAiServiceConfig): AiService {
  const model = config.model ?? DEFAULT_OPENAI_MODEL
  const discussionModel = config.discussionModel ?? DEFAULT_OPENAI_DISCUSSION_MODEL
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS
  const discussionMaxTokens = config.discussionMaxTokens ?? DEFAULT_DISCUSSION_MAX_TOKENS
  const validationModel = config.validationModel ?? discussionModel
  const validationMaxTokens = config.validationMaxTokens ?? DEFAULT_VALIDATION_MAX_TOKENS
  const callConfig: OpenAiCallConfig = {
    client: config.client,
    provider: 'openai',
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
  }

  const getDiscussionText = (input: DiscussionInput): Effect.Effect<string, AiGenerationError> =>
    callOpenAiLlmText({
      config: callConfig,
      model: discussionModel,
      maxTokens: discussionMaxTokens,
      system: input.system,
      user: input.user,
    }).pipe(Effect.map((text) => stripCodeFence(text)))

  return {
    generateRaw({ system, user, pdfBytes }) {
      return callOpenAiLlmText({
        config: callConfig,
        model,
        maxTokens,
        system,
        user,
        pdfBytes,
      })
    },

    generate({ system, user, pdfBytes, expectedCount }) {
      return Effect.gen(function* () {
        const text = yield* callOpenAiLlmText({
          config: callConfig,
          model,
          maxTokens,
          system,
          user,
          pdfBytes,
        })
        const questions = yield* parseGeneratedQuestionsStrict(text, expectedCount).pipe(
          Effect.tapError((e) =>
            Effect.sync(() =>
              logAiEvent('ai.generate.parse', 'warn', {
                model,
                cause: String(e.cause),
              }),
            ),
          ),
        )
        return questions
      })
    },

    validateCurriculum({ system, user, expectedCount }) {
      return Effect.gen(function* () {
        const text = yield* callOpenAiLlmText({
          config: callConfig,
          model: validationModel,
          maxTokens: validationMaxTokens,
          system,
          user,
        })
        const items = yield* parseCurriculumValidation(text)
        if (items.length !== expectedCount) {
          return yield* Effect.fail(
            new AiGenerationError({
              cause: `Expected ${expectedCount} validation items, got ${items.length}`,
            }),
          )
        }
        return items
      })
    },

    generateDiscussion(input) {
      return getDiscussionText(input)
    },

    async *streamDiscussion(input) {
      const result = await Effect.runPromise(Effect.either(getDiscussionText(input)))
      if (Either.isLeft(result)) {
        const err = result.left
        const message = typeof err.cause === 'string' ? err.cause : String(err.cause)
        throw new Error(message, { cause: err })
      }
      yield result.right
    },
  }
}

/**
 * Builds the production `AiService` from env.
 * Uses Anthropic Claude when `AI_PROVIDER=anthropic` (default); MiniMax when
 * `AI_PROVIDER=minimax` (`MINIMAX_API_KEY` +
 * {@link DEFAULT_MINIMAX_ANTHROPIC_BASE_URL}); OpenAI when `AI_PROVIDER=openai`.
 */
export function createDefaultAiService(): AiService {
  const provider = (process.env['AI_PROVIDER'] ?? 'anthropic').toLowerCase()

  if (provider === 'openai') {
    const apiKey = process.env['OPENAI_API_KEY']
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai')
    }
    const baseURL = process.env['OPENAI_BASE_URL']?.trim() || DEFAULT_OPENAI_BASE_URL
    const model = process.env['AI_MODEL']?.trim() || DEFAULT_OPENAI_MODEL
    const discussionModel =
      process.env['AI_DISCUSSION_MODEL']?.trim() || DEFAULT_OPENAI_DISCUSSION_MODEL
    return createOpenAiService({
      client: createOpenAiClient(apiKey, baseURL),
      model,
      discussionModel,
      provider: 'openai',
      baseURL,
    })
  }

  if (provider === 'minimax') {
    const apiKey = process.env['MINIMAX_API_KEY']
    if (!apiKey) {
      throw new Error('MINIMAX_API_KEY is required when AI_PROVIDER=minimax')
    }
    const baseURL =
      process.env['MINIMAX_ANTHROPIC_BASE_URL']?.trim() || DEFAULT_MINIMAX_ANTHROPIC_BASE_URL
    const model = process.env['AI_MODEL']?.trim() || DEFAULT_MINIMAX_MODEL
    const discussionModel =
      process.env['AI_DISCUSSION_MODEL']?.trim() || DEFAULT_MINIMAX_DISCUSSION_MODEL

    const minimaxService = createAiService({
      client: createMinimaxAnthropicClient(apiKey, baseURL),
      model,
      discussionModel,
      provider: 'minimax',
      baseURL,
    })
    let anthropicPdfService: AiService | undefined

    const getAnthropicPdfService = (): AiService => {
      if (anthropicPdfService) {
        return anthropicPdfService
      }
      const anthropicApiKey = process.env['ANTHROPIC_API_KEY']
      if (!anthropicApiKey) {
        throw new Error(
          'ANTHROPIC_API_KEY is required when AI_PROVIDER=minimax and a PDF generation request is made',
        )
      }
      anthropicPdfService = createAiService({
        client: new Anthropic({ apiKey: anthropicApiKey, timeout: DEFAULT_TIMEOUT_MS }),
        provider: 'anthropic',
      })
      return anthropicPdfService
    }

    return {
      generate(input) {
        if (input.pdfBytes) {
          return getAnthropicPdfService().generate(input)
        }
        return minimaxService.generate(input)
      },
      generateRaw(input) {
        if (input.pdfBytes) {
          return getAnthropicPdfService().generateRaw(input)
        }
        return minimaxService.generateRaw(input)
      },
      generateDiscussion(input) {
        return minimaxService.generateDiscussion(input)
      },
      validateCurriculum(input) {
        return minimaxService.validateCurriculum(input)
      },
      streamDiscussion(input) {
        return minimaxService.streamDiscussion(input)
      },
    }
  }

  if (provider !== 'anthropic') {
    throw new Error(`AI_PROVIDER must be "anthropic", "minimax", or "openai", got "${provider}"`)
  }

  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic')
  }
  return createAiService({
    client: new Anthropic({ apiKey, timeout: DEFAULT_TIMEOUT_MS }),
    provider: 'anthropic',
  })
}

function appendConnectionContext(message: string, config: AiServiceConfig): string {
  if (!/connection|fetch failed|timed? ?out|enotfound|econn/i.test(message)) {
    return message
  }
  const details: Array<string> = []
  if (config.provider) {
    details.push(`provider=${config.provider}`)
  }
  if (config.baseURL) {
    try {
      const url = new URL(config.baseURL)
      if (url.host) {
        details.push(`host=${url.host}`)
      }
    } catch {
      // ignore invalid URL values; keep original error message
    }
  }
  if (details.length === 0) {
    return message
  }
  return `${message} (${details.join(', ')})`
}

function summarizeAnthropicSdkFailure(cause: unknown, config: AiServiceConfig): string {
  if (cause instanceof APIError) {
    return appendConnectionContext(`[HTTP ${cause.status}] ${cause.message}`, config)
  }
  if (cause instanceof Error) {
    return appendConnectionContext(cause.message, config)
  }
  return String(cause)
}

function extractFirstTextContent(message: Anthropic.Message): string | undefined {
  for (const block of message.content) {
    if (block.type === 'text') {
      return block.text
    }
  }
  return undefined
}

/** Accepts normal completion and some provider variants (MiniMax / extended models). */
function isSuccessfulStopReason(
  stopReason: Anthropic.Message['stop_reason'],
  hasText: boolean,
): boolean {
  if (stopReason === 'end_turn' || stopReason === 'stop_sequence') {
    return true
  }
  if ((stopReason === null || stopReason === undefined) && hasText) {
    return true
  }
  return false
}

function callAnthropicText({
  config,
  model,
  max_tokens,
  system,
  content,
}: {
  config: AiServiceConfig
  model: string
  max_tokens: number
  system: string
  content: Anthropic.ContentBlockParam[]
}): Effect.Effect<string, AiGenerationError> {
  return Effect.gen(function* () {
    const t0 = Date.now()
    const response = yield* Effect.tryPromise({
      try: () =>
        config.client.messages.create({
          model,
          max_tokens,
          system,
          messages: [{ role: 'user', content }],
        }),
      catch: (cause) => {
        const msg = summarizeAnthropicSdkFailure(cause, config)
        logAiEvent('ai.messages.create', 'warn', {
          model,
          durationMs: Date.now() - t0,
          status: cause instanceof APIError ? cause.status : undefined,
          message: msg,
        })
        return new AiGenerationError({ cause: msg })
      },
    })

    const contentTypes = response.content.map((b) => b.type)
    const durationMs = Date.now() - t0
    logAiEvent('ai.messages.create', 'info', {
      model,
      durationMs,
      stopReason: response.stop_reason,
      contentTypes,
      usage: response.usage,
    })

    const assistantText = extractFirstTextContent(response)
    const hasAssistantText =
      assistantText !== undefined && assistantText.length > 0
    if (!isSuccessfulStopReason(response.stop_reason, hasAssistantText)) {
      logAiEvent('ai.messages.create', 'warn', {
        model,
        durationMs,
        stopReason: response.stop_reason,
        contentTypes,
        message: 'stop_reason not accepted',
      })
      return yield* Effect.fail(
        new AiGenerationError({
          cause: `AI returned incomplete output (stop_reason: ${String(response.stop_reason)})`,
        }),
      )
    }
    if (assistantText === undefined) {
      logAiEvent('ai.messages.create', 'warn', {
        model,
        durationMs,
        stopReason: response.stop_reason,
        contentTypes,
        message: 'no assistant text block',
      })
      return yield* Effect.fail(new AiGenerationError({ cause: 'AI returned no text block' }))
    }

    return assistantText
  })
}

function parseCurriculumValidation(
  raw: string,
): Effect.Effect<Array<CurriculumValidationItem>, AiGenerationError> {
  return Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => JSON.parse(stripCodeFence(raw)) as unknown,
      catch: (cause) =>
        new AiGenerationError({
          cause: `AI returned non-JSON output: ${(cause as Error).message}`,
        }),
    })

    if (!Array.isArray(parsed)) {
      return yield* Effect.fail(new AiGenerationError({ cause: 'AI returned non-array JSON' }))
    }

    const decoded = Schema.decodeUnknownEither(Schema.Array(CurriculumValidationItemSchema))(parsed)
    if (Either.isLeft(decoded)) {
      return yield* Effect.fail(
        new AiGenerationError({
          cause: `AI validation output failed schema validation: ${String(decoded.left)}`,
        }),
      )
    }
    return Array.from(decoded.right)
  })
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('```')) {
    const inner = trimmed.replace(/^```(?:json|markdown)?\n?/i, '').replace(/```\s*$/, '')
    return inner.trim()
  }
  return trimmed
}
