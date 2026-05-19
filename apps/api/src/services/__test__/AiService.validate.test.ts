import { describe, expect, it, vi } from 'vitest'
import { Effect, Either } from 'effect'
import { createAiService, type AnthropicLike } from '../AiService'
import { AiGenerationError } from '../../errors'

const VALID_ITEMS = [
  { number: 1, status: 'valid' as const, reason: 'Sesuai CP.' },
  { number: 2, status: 'needs_review' as const, reason: 'Level kognitif tinggi.' },
]

function fakeClient(
  text: string,
  opts: { stopReason?: string | null } = {},
): { client: AnthropicLike; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text }],
    stop_reason: opts.stopReason ?? 'end_turn',
    stop_sequence: null,
  })
  return {
    client: { messages: { create } } as unknown as AnthropicLike,
    create,
  }
}

describe('AiService.validateCurriculum', () => {
  it('parses JSON validation array and uses validation model defaulting to discussion model', async () => {
    const { client, create } = fakeClient(JSON.stringify(VALID_ITEMS))
    const ai = createAiService({
      client,
      discussionModel: 'MiniMax-M2.7-highspeed',
    })

    const result = await Effect.runPromise(
      ai.validateCurriculum({ system: 'validator system', user: '[]', expectedCount: 2 }),
    )

    expect(result).toEqual(VALID_ITEMS)
    const params = create.mock.calls[0]![0] as { model: string; system: string; max_tokens: number }
    expect(params.model).toBe('MiniMax-M2.7-highspeed')
    expect(params.system).toBe('validator system')
    expect(params.max_tokens).toBe(8000)
  })

  it('accepts MiniMax stop_reason null when text is present', async () => {
    const { client } = fakeClient(JSON.stringify(VALID_ITEMS), { stopReason: null })
    const ai = createAiService({ client })

    const result = await Effect.runPromise(
      ai.validateCurriculum({ system: 's', user: 'u', expectedCount: 2 }),
    )
    expect(result).toHaveLength(2)
  })

  it('fails when item count mismatches expectedCount', async () => {
    const { client } = fakeClient(JSON.stringify([VALID_ITEMS[0]]))
    const ai = createAiService({ client })

    const result = await Effect.runPromise(
      Effect.either(ai.validateCurriculum({ system: 's', user: 'u', expectedCount: 2 })),
    )
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AiGenerationError)
    }
  })
})
