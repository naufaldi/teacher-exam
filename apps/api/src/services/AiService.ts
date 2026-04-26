import Anthropic from '@anthropic-ai/sdk'
import { Effect, Schema, Either } from 'effect'
import { GeneratedQuestionSchema, type GeneratedQuestion } from '@teacher-exam/shared'
import { AiGenerationError } from '../errors'

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

export interface AiService {
  generate: (input: GenerateInput) => Effect.Effect<ReadonlyArray<GeneratedQuestion>, AiGenerationError>
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
  maxTokens?: number
  discussionModel?: string
  discussionMaxTokens?: number
}

const DEFAULT_MODEL = 'claude-opus-4-5'
const DEFAULT_DISCUSSION_MODEL = 'claude-haiku-4-5'
const DEFAULT_MAX_TOKENS = 32000
const DEFAULT_DISCUSSION_MAX_TOKENS = 16000
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000

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
  const discussionModel = config.discussionModel ?? DEFAULT_DISCUSSION_MODEL
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS
  const discussionMaxTokens = config.discussionMaxTokens ?? DEFAULT_DISCUSSION_MAX_TOKENS

  const getDiscussionText = (input: DiscussionInput): Effect.Effect<string, AiGenerationError> =>
    callAnthropicText({
      config,
      model: discussionModel,
      max_tokens: discussionMaxTokens,
      system: input.system,
      content: [{ type: 'text', text: input.user }],
    }).pipe(Effect.map((text) => stripCodeFence(text)))

  return {
    generate({ system, user, pdfBytes, expectedCount }) {
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

      return Effect.gen(function* () {
        const text = yield* callAnthropicText({ config, model, max_tokens: maxTokens, system, content })
        const questions = yield* parseAndValidate(text)
        if (questions.length !== expectedCount) {
          return yield* Effect.fail(
            new AiGenerationError({
              cause: `Expected ${expectedCount} questions, got ${questions.length}`,
            }),
          )
        }
        return questions
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
 * Build the production `AiService` using `ANTHROPIC_API_KEY` from env.
 * Throws fast at startup if the key is missing.
 */
export function createDefaultAiService(): AiService {
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required to use AiService')
  }
  return createAiService({ client: new Anthropic({ apiKey, timeout: DEFAULT_TIMEOUT_MS }) })
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
    const response = yield* Effect.tryPromise({
      try: () =>
        config.client.messages.create({
          model,
          max_tokens,
          system,
          messages: [{ role: 'user', content }],
        }),
      catch: (cause) => new AiGenerationError({ cause }),
    })

    if (response.stop_reason !== 'end_turn') {
      return yield* Effect.fail(
        new AiGenerationError({
          cause: `Claude returned incomplete output (stop_reason: ${response.stop_reason})`,
        }),
      )
    }

    const firstBlock = response.content[0]
    if (!firstBlock || firstBlock.type !== 'text') {
      return yield* Effect.fail(
        new AiGenerationError({ cause: 'Anthropic returned no text block' }),
      )
    }

    return firstBlock.text
  })
}

function parseAndValidate(raw: string): Effect.Effect<Array<GeneratedQuestion>, AiGenerationError> {
  return Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => JSON.parse(stripCodeFence(raw)) as unknown,
      catch: (cause) =>
        new AiGenerationError({
          cause: `Claude returned non-JSON output: ${(cause as Error).message}`,
        }),
    })

    if (!Array.isArray(parsed)) {
      return yield* Effect.fail(new AiGenerationError({ cause: 'Claude returned non-array JSON' }))
    }

    const decoded = Schema.decodeUnknownEither(Schema.Array(GeneratedQuestionSchema))(parsed)
    if (Either.isLeft(decoded)) {
      return yield* Effect.fail(
        new AiGenerationError({
          cause: `AI output failed schema validation: ${String(decoded.left)}`,
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
