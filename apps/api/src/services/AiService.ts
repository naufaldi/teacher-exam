import Anthropic from '@anthropic-ai/sdk'

/**
 * Minimal generated-question shape returned by Claude. The full shared schema
 * lives in `@teacher-exam/shared`; this is the lightweight on-the-wire shape
 * the AiService validates before persisting.
 */
export interface GeneratedQuestion {
  text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'a' | 'b' | 'c' | 'd'
  topic: string
  difficulty: 'mudah' | 'sedang' | 'sulit'
  cognitive_level?: 'C1' | 'C2' | 'C3' | 'C4'
}

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

export interface AiService {
  generate: (input: GenerateInput) => Promise<ReadonlyArray<GeneratedQuestion>>
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
}

const DEFAULT_MODEL = 'claude-opus-4-5'
const DEFAULT_MAX_TOKENS = 8192

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
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS

  return {
    async generate({ system, user, pdfBytes, expectedCount }) {
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

      const response = await config.client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content }],
      })

      const firstBlock = response.content[0]
      if (!firstBlock || firstBlock.type !== 'text') {
        throw new AiGenerationError('Anthropic returned no text block')
      }

      const questions = parseAndValidate(firstBlock.text)
      if (questions.length !== expectedCount) {
        throw new AiGenerationError(
          `Expected ${expectedCount} questions, got ${questions.length}`,
        )
      }
      return questions
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
  return createAiService({ client: new Anthropic({ apiKey }) })
}

export class AiGenerationError extends Error {
  override readonly name = 'AiGenerationError'
}

function parseAndValidate(raw: string): GeneratedQuestion[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripCodeFence(raw))
  } catch (err) {
    throw new AiGenerationError(`Claude returned non-JSON output: ${(err as Error).message}`)
  }
  if (!Array.isArray(parsed)) {
    throw new AiGenerationError('Claude returned non-array JSON')
  }
  return parsed.map((item, idx) => {
    if (!isGeneratedQuestion(item)) {
      throw new AiGenerationError(`Question ${idx + 1} failed schema validation`)
    }
    return item
  })
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('```')) {
    const inner = trimmed.replace(/^```(?:json)?\n?/i, '').replace(/```\s*$/, '')
    return inner.trim()
  }
  return trimmed
}

function isGeneratedQuestion(value: unknown): value is GeneratedQuestion {
  if (value === null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v['text'] === 'string' &&
    typeof v['option_a'] === 'string' &&
    typeof v['option_b'] === 'string' &&
    typeof v['option_c'] === 'string' &&
    typeof v['option_d'] === 'string' &&
    typeof v['topic'] === 'string' &&
    (v['correct_answer'] === 'a' ||
      v['correct_answer'] === 'b' ||
      v['correct_answer'] === 'c' ||
      v['correct_answer'] === 'd') &&
    (v['difficulty'] === 'mudah' ||
      v['difficulty'] === 'sedang' ||
      v['difficulty'] === 'sulit')
  )
}
