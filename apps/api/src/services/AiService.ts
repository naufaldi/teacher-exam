import { Effect, Schema, Either, Stream } from 'effect'
import { CurriculumValidationItemSchema, type GeneratedQuestion, type CurriculumValidationItem } from '@teacher-exam/shared'
import { AiGenerationError } from '../errors'
import { logAiEvent } from '../lib/ai-log'
import {
  DEFAULT_DISCUSSION_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MINIMAX_ANTHROPIC_BASE_URL,
  DEFAULT_MINIMAX_DISCUSSION_MODEL,
  DEFAULT_MINIMAX_MODEL,
  DEFAULT_MODEL,
  DEFAULT_OPENAI_DISCUSSION_MODEL,
  DEFAULT_OPENAI_MODEL,
} from '../lib/effect-ai/constants'
import {
  createModelLayersFromResolved,
  resolveAnthropicLayerConfig,
  resolveMinimaxLayerConfig,
  resolveOpenAiLayerConfig,
  type ModelLayers,
  type ResolvedModelLayerConfig,
} from '../lib/effect-ai/layers'
import { buildPrompt } from '../lib/effect-ai/prompt'
import { runGenerateText, runGenerateObject } from '../lib/effect-ai/run'
import {
  CURRICULUM_VALIDATION_OBJECT_NAME,
  GENERATED_QUESTIONS_OBJECT_NAME,
} from '../lib/effect-ai/schema-bridge'
import { CurriculumValidationBatchSchema } from '../lib/effect-ai/schemas/curriculum-validation'
import { GeneratedQuestionsBatchSchema } from '../lib/effect-ai/schemas/generated-questions'
import { parseGeneratedQuestionsStrict } from '../lib/parse-generated-questions'

export interface GenerateInput {
  system: string
  user: string
  pdfBytes?: Buffer
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
  pdfBytes?: Buffer
}

export interface AiService {
  generate: (input: GenerateInput) => Effect.Effect<ReadonlyArray<GeneratedQuestion>, AiGenerationError>
  generateRaw: (input: GenerateRawInput) => Effect.Effect<string, AiGenerationError>
  validateCurriculum: (input: ValidateCurriculumInput) => Effect.Effect<ReadonlyArray<CurriculumValidationItem>, AiGenerationError>
  generateDiscussion: (input: DiscussionInput) => Effect.Effect<string, AiGenerationError>
  streamDiscussion: (input: DiscussionInput) => Stream.Stream<string, AiGenerationError>
}

export interface AiServiceConfig {
  layers: ModelLayers
  provider?: 'anthropic' | 'minimax' | 'openai'
  baseURL?: string
  model?: string
  pdfModel?: string
  discussionModel?: string
}

interface ResolvedAiModels {
  generateModel: string
  pdfModel: string
  discussionModel: string
  validationModel: string
}

function resolveModels(config: AiServiceConfig): ResolvedAiModels {
  const generateModel = config.model ?? DEFAULT_MODEL
  return {
    generateModel,
    pdfModel: config.pdfModel ?? generateModel,
    discussionModel: config.discussionModel ?? DEFAULT_DISCUSSION_MODEL,
    validationModel: config.discussionModel ?? DEFAULT_DISCUSSION_MODEL,
  }
}

function errorContext(config: AiServiceConfig): {
  provider?: 'anthropic' | 'minimax' | 'openai'
  baseURL?: string
} {
  return {
    ...(config.provider !== undefined ? { provider: config.provider } : {}),
    ...(config.baseURL !== undefined ? { baseURL: config.baseURL } : {}),
  }
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('```')) {
    const inner = trimmed.replace(/^```(?:json|markdown)?\n?/i, '').replace(/```\s*$/, '')
    return inner.trim()
  }
  return trimmed
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

function callGenerateText(
  config: AiServiceConfig,
  models: ResolvedAiModels,
  input: { system: string; user: string; pdfBytes?: Buffer },
  slot: 'text' | 'pdf' | 'discussion' | 'validation',
): Effect.Effect<string, AiGenerationError> {
  const modelLayer = config.layers[slot]
  const model =
    slot === 'discussion' || slot === 'validation'
      ? models.discussionModel
      : input.pdfBytes !== undefined
        ? models.pdfModel
        : models.generateModel

  return runGenerateText({
    modelLayer,
    prompt: buildPrompt(input),
    model,
    logEvent: 'ai.languageModel.generateText',
    errorContext: errorContext(config),
  })
}

function callGenerateObject<A, I extends Record<string, unknown>>(
  config: AiServiceConfig,
  models: ResolvedAiModels,
  input: { system: string; user: string; pdfBytes?: Buffer },
  slot: 'text' | 'pdf' | 'discussion' | 'validation',
  schema: Schema.Schema<A, I, never>,
  objectName: string,
): Effect.Effect<A, AiGenerationError> {
  const modelLayer = config.layers[slot]
  const model =
    slot === 'discussion' || slot === 'validation'
      ? models.discussionModel
      : input.pdfBytes !== undefined
        ? models.pdfModel
        : models.generateModel

  return runGenerateObject({
    modelLayer,
    prompt: buildPrompt(input),
    model,
    logEvent: 'ai.languageModel.generateObject',
    errorContext: errorContext(config),
    schema,
    objectName,
  })
}

export function createAiService(config: AiServiceConfig): AiService {
  const models = resolveModels(config)

  const getDiscussionText = (input: DiscussionInput): Effect.Effect<string, AiGenerationError> =>
    callGenerateText(config, models, input, 'discussion').pipe(
      Effect.map((text) => stripCodeFence(text)),
    )

  return {
    generateRaw(input) {
      const slot = input.pdfBytes !== undefined ? 'pdf' : 'text'
      const promptInput =
        input.pdfBytes !== undefined
          ? { system: input.system, user: input.user, pdfBytes: input.pdfBytes }
          : { system: input.system, user: input.user }

      return callGenerateObject(
        config,
        models,
        promptInput,
        slot,
        GeneratedQuestionsBatchSchema,
        GENERATED_QUESTIONS_OBJECT_NAME,
      ).pipe(
        Effect.map((batch) => JSON.stringify(batch.questions)),
        Effect.catchAll(() =>
          callGenerateText(config, models, promptInput, slot),
        ),
      )
    },

    generate({ system, user, pdfBytes, expectedCount }) {
      const slot = pdfBytes !== undefined ? 'pdf' : 'text'
      const generateModel = slot === 'pdf' ? models.pdfModel : models.generateModel
      const promptInput =
        pdfBytes !== undefined ? { system, user, pdfBytes } : { system, user }

      return Effect.gen(function* () {
        const batch = yield* callGenerateObject(
          config,
          models,
          promptInput,
          slot,
          GeneratedQuestionsBatchSchema,
          GENERATED_QUESTIONS_OBJECT_NAME,
        ).pipe(
          Effect.catchAll(() =>
            Effect.gen(function* () {
              const text = yield* callGenerateText(config, models, promptInput, slot)
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
              return { questions: Array.from(questions) }
            }),
          ),
        )

        if (batch.questions.length !== expectedCount) {
          return yield* Effect.fail(
            new AiGenerationError({
              cause: `Expected ${expectedCount} questions, got ${batch.questions.length}`,
            }),
          )
        }
        return batch.questions
      })
    },

    validateCurriculum({ system, user, expectedCount }) {
      return Effect.gen(function* () {
        const batch = yield* callGenerateObject(
          config,
          models,
          { system, user },
          'validation',
          CurriculumValidationBatchSchema,
          CURRICULUM_VALIDATION_OBJECT_NAME,
        ).pipe(
          Effect.catchAll(() =>
            Effect.gen(function* () {
              const text = yield* callGenerateText(
                config,
                models,
                { system, user },
                'validation',
              )
              const items = yield* parseCurriculumValidation(text)
              return { items: Array.from(items) }
            }),
          ),
        )

        if (batch.items.length !== expectedCount) {
          return yield* Effect.fail(
            new AiGenerationError({
              cause: `Expected ${expectedCount} validation items, got ${batch.items.length}`,
            }),
          )
        }
        return batch.items
      })
    },

    generateDiscussion(input) {
      return getDiscussionText(input)
    },

    streamDiscussion(input) {
      return Stream.fromEffect(getDiscussionText(input))
    },
  }
}

function wrapPdfAnthropicProxy(primary: AiService, getAnthropicService: () => AiService): AiService {
  return {
    generate(input) {
      if (input.pdfBytes !== undefined) {
        return getAnthropicService().generate(input)
      }
      return primary.generate(input)
    },
    generateRaw(input) {
      if (input.pdfBytes !== undefined) {
        return getAnthropicService().generateRaw(input)
      }
      return primary.generateRaw(input)
    },
    generateDiscussion(input) {
      return primary.generateDiscussion(input)
    },
    validateCurriculum(input) {
      return primary.validateCurriculum(input)
    },
    streamDiscussion(input) {
      return primary.streamDiscussion(input)
    },
  }
}

function createAiServiceFromResolved(config: ResolvedModelLayerConfig): AiService {
  const layers = createModelLayersFromResolved(config)
  return createAiService({
    layers,
    provider: config.provider,
    ...(config.apiUrl !== undefined ? { baseURL: config.apiUrl } : {}),
    model: config.model,
    pdfModel: config.pdfModel,
    discussionModel: config.discussionModel,
  })
}

export function createDefaultAiService(): AiService {
  const provider = (process.env['AI_PROVIDER'] ?? 'anthropic').toLowerCase()

  if (provider === 'openai') {
    return createAiServiceFromResolved(resolveOpenAiLayerConfig())
  }

  if (provider === 'minimax') {
    const minimaxConfig = resolveMinimaxLayerConfig()
    const minimaxService = createAiServiceFromResolved(minimaxConfig)
    let anthropicPdfService: AiService | undefined

    const getAnthropicPdfService = (): AiService => {
      if (anthropicPdfService !== undefined) {
        return anthropicPdfService
      }
      anthropicPdfService = createAiServiceFromResolved(resolveAnthropicLayerConfig())
      return anthropicPdfService
    }

    return wrapPdfAnthropicProxy(minimaxService, getAnthropicPdfService)
  }

  if (provider !== 'anthropic') {
    throw new Error(`AI_PROVIDER must be "anthropic", "minimax", or "openai", got "${provider}"`)
  }

  return createAiServiceFromResolved(resolveAnthropicLayerConfig())
}

export {
  DEFAULT_MODEL,
  DEFAULT_DISCUSSION_MODEL,
  DEFAULT_MINIMAX_MODEL,
  DEFAULT_MINIMAX_DISCUSSION_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_DISCUSSION_MODEL,
  DEFAULT_MINIMAX_ANTHROPIC_BASE_URL,
  DEFAULT_MAX_TOKENS,
}
