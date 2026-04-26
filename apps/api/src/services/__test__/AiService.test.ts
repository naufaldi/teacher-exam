import { describe, expect, it, vi } from 'vitest'
import { Effect, Either } from 'effect'
import {
  createAiService,
  type AnthropicLike,
} from '../AiService'
import { AiGenerationError } from '../../errors'

const VALID_QUESTIONS = Array.from({ length: 20 }, (_, i) => ({
  _tag: 'mcq_single' as const,
  number: i + 1,
  text: `Soal ${i + 1}`,
  option_a: 'A',
  option_b: 'B',
  option_c: 'C',
  option_d: 'D',
  correct_answer: 'a' as const,
  topic: 'Pemahaman Bacaan',
  difficulty: 'sedang',
  cognitive_level: 'C2' as const,
}))

function fakeClient(
  text: string,
  opts: { stopReason?: string } = {},
): {
  client: AnthropicLike
  create: ReturnType<typeof vi.fn>
} {
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

async function expectAiGenerationError(
  effect: Effect.Effect<unknown, AiGenerationError>,
): Promise<AiGenerationError> {
  const result = await Effect.runPromise(Effect.either(effect))
  expect(Either.isLeft(result)).toBe(true)
  if (Either.isRight(result)) throw new Error('Expected AiGenerationError')
  expect(result.left).toBeInstanceOf(AiGenerationError)
  return result.left
}

describe('AiService.generate', () => {
  it('sends curriculum via the top-level system field, not in user content', async () => {
    const { client, create } = fakeClient(JSON.stringify(VALID_QUESTIONS))
    const ai = createAiService({ client })

    const system = 'BASELINE\n## Capaian Pembelajaran\n- foo'
    const user = 'task params'
    await Effect.runPromise(ai.generate({ system, user, expectedCount: 20 }))

    expect(create).toHaveBeenCalledOnce()
    const params = create.mock.calls[0]![0] as {
      system: string
      messages: Array<{ role: string; content: Array<{ type: string; text?: string }> }>
    }
    expect(params.system).toBe(system)
    expect(params.system).toContain('## Capaian Pembelajaran')
    expect(params['max_tokens']).toBe(32000)

    const userBlocks = params.messages[0]!.content
    const joined = userBlocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
    expect(joined).toBe(user)
    expect(joined).not.toContain('## Capaian Pembelajaran')
  })

  it('attaches a PDF document block when pdfBytes is provided', async () => {
    const { client, create } = fakeClient(JSON.stringify(VALID_QUESTIONS))
    const ai = createAiService({ client })

    const pdfBytes = Buffer.from('%PDF-1.4 fake')
    await Effect.runPromise(ai.generate({ system: 's', user: 'u', pdfBytes, expectedCount: 20 }))

    const params = create.mock.calls[0]![0] as {
      messages: Array<{ content: Array<{ type: string }> }>
    }
    const blocks = params.messages[0]!.content
    expect(blocks[0]!.type).toBe('document')
  })

  it('strips ```json fenced output before parsing', async () => {
    const fenced = '```json\n' + JSON.stringify(VALID_QUESTIONS) + '\n```'
    const { client } = fakeClient(fenced)
    const ai = createAiService({ client })
    const out = await Effect.runPromise(ai.generate({ system: 's', user: 'u', expectedCount: 20 }))
    expect(out).toHaveLength(20)
  })

  it('throws AiGenerationError when question count does not match expectedCount', async () => {
    const { client } = fakeClient(JSON.stringify(VALID_QUESTIONS.slice(0, 5)))
    const ai = createAiService({ client })
    await expectAiGenerationError(ai.generate({ system: 's', user: 'u', expectedCount: 20 }))
  })

  it('throws a clear AiGenerationError when Claude stops at max_tokens', async () => {
    const { client } = fakeClient('[{"_tag":"mcq_single","text":"truncated', {
      stopReason: 'max_tokens',
    })
    const ai = createAiService({ client })

    const err = await expectAiGenerationError(ai.generate({ system: 's', user: 'u', expectedCount: 20 }))

    expect(String(err.cause)).toContain('max_tokens')
    expect(String(err.cause)).toContain('incomplete')
  })


  it('throws AiGenerationError on non-JSON output', async () => {
    const { client } = fakeClient('not json')
    const ai = createAiService({ client })
    await expectAiGenerationError(ai.generate({ system: 's', user: 'u', expectedCount: 20 }))
  })

  it('throws AiGenerationError when a question fails schema validation', async () => {
    const bad = [...VALID_QUESTIONS]
    bad[0] = { ...bad[0]!, correct_answer: 'z' as 'a' }
    const { client } = fakeClient(JSON.stringify(bad))
    const ai = createAiService({ client })
    await expectAiGenerationError(ai.generate({ system: 's', user: 'u', expectedCount: 20 }))
  })
})

describe('AiService.generate — expectedCount', () => {
  it('throws AiGenerationError with both numbers when AI returns fewer questions than expectedCount', async () => {
    const fiveQuestions = VALID_QUESTIONS.slice(0, 5)
    const { client } = fakeClient(JSON.stringify(fiveQuestions))
    const ai = createAiService({ client })
    const err = await expectAiGenerationError(
      ai.generate({ system: 's', user: 'u', expectedCount: 10 }),
    )
    expect(err._tag).toBe('AiGenerationError')
    expect(String(err.cause)).toContain('10')
    expect(String(err.cause)).toContain('5')
  })

  it('resolves successfully when AI returns exactly expectedCount questions', async () => {
    const tenQuestions = VALID_QUESTIONS.slice(0, 10)
    const { client } = fakeClient(JSON.stringify(tenQuestions))
    const ai = createAiService({ client })
    const result = await Effect.runPromise(ai.generate({ system: 's', user: 'u', expectedCount: 10 }))
    expect(result).toHaveLength(10)
  })
})

describe('AiService.generate — multi-type schema validation', () => {
  it('resolves with mixed _tag array (1 of each type)', async () => {
    const mixed = [
      {
        _tag: 'mcq_single',
        number: 1,
        text: 'Soal PG', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D',
        correct_answer: 'a', topic: 'T', difficulty: 'mudah',
      },
      {
        _tag: 'mcq_multi',
        number: 2,
        text: 'Soal PGK', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D',
        correct_answers: ['a', 'c'], topic: 'T', difficulty: 'sedang',
      },
      {
        _tag: 'true_false',
        number: 3,
        text: 'Soal BS', topic: 'T', difficulty: 'sulit',
        statements: [{ text: 'p1', answer: 'B' }, { text: 'p2', answer: 'S' }, { text: 'p3', answer: 'B' }],
      },
    ]
    const { client } = fakeClient(JSON.stringify(mixed))
    const ai = createAiService({ client })
    const result = await Effect.runPromise(ai.generate({ system: 's', user: 'u', expectedCount: 3 }))
    expect(result).toHaveLength(3)
    expect(result[0]!._tag).toBe('mcq_single')
    expect(result[1]!._tag).toBe('mcq_multi')
    expect(result[2]!._tag).toBe('true_false')
  })

  it('throws AiGenerationError for mcq_multi with only 1 correct letter', async () => {
    const bad = [
      {
        _tag: 'mcq_multi',
        number: 1,
        text: 'Bad soal', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D',
        correct_answers: ['a'],  // only 1 — min is 2
        topic: 'T', difficulty: 'mudah',
      },
    ]
    const { client } = fakeClient(JSON.stringify(bad))
    const ai = createAiService({ client })
    await expectAiGenerationError(ai.generate({ system: 's', user: 'u', expectedCount: 1 }))
  })

  it('throws AiGenerationError for unknown _tag', async () => {
    const bad = [{ _tag: 'essay', number: 1, text: 'Ceritakan!', topic: 'T', difficulty: 'mudah' }]
    const { client } = fakeClient(JSON.stringify(bad))
    const ai = createAiService({ client })
    await expectAiGenerationError(ai.generate({ system: 's', user: 'u', expectedCount: 1 }))
  })
})

describe('AiService.generateDiscussion', () => {
  const FAKE_MARKDOWN = `## 1. Soal tentang ide pokok\n**Jawaban Benar: B**\n\nPenjelasan.\n\n**Tip:** Kunci.\n\n---`

  it('uses discussionModel (claude-haiku-4-5) by default, not the main model', async () => {
    const { client, create } = fakeClient(FAKE_MARKDOWN)
    const ai = createAiService({ client })
    await Effect.runPromise(ai.generateDiscussion({ system: 's', user: 'u' }))
    const params = create.mock.calls[0]![0] as { model: string }
    expect(params.model).toBe('claude-haiku-4-5')
  })

  it('respects custom discussionModel when provided', async () => {
    const { client, create } = fakeClient(FAKE_MARKDOWN)
    const ai = createAiService({ client, discussionModel: 'claude-opus-4-5' })
    await Effect.runPromise(ai.generateDiscussion({ system: 's', user: 'u' }))
    const params = create.mock.calls[0]![0] as { model: string }
    expect(params.model).toBe('claude-opus-4-5')
  })

  it('generate() still uses the main model not discussionModel', async () => {
    const { client, create } = fakeClient(JSON.stringify(VALID_QUESTIONS))
    const ai = createAiService({ client })
    await Effect.runPromise(ai.generate({ system: 's', user: 'u', expectedCount: 20 }))
    const params = create.mock.calls[0]![0] as { model: string }
    expect(params.model).toBe('claude-opus-4-5')
  })

  it('returns the raw markdown string from Claude', async () => {
    const { client } = fakeClient(FAKE_MARKDOWN)
    const ai = createAiService({ client })
    const result = await Effect.runPromise(ai.generateDiscussion({ system: 's', user: 'u' }))
    expect(result).toBe(FAKE_MARKDOWN)
  })

  it('sends system and user to Anthropic in the correct positions', async () => {
    const { client, create } = fakeClient(FAKE_MARKDOWN)
    const ai = createAiService({ client })
    await Effect.runPromise(ai.generateDiscussion({ system: 'SYS', user: 'USR' }))
    const params = create.mock.calls[0]![0] as {
      system: string
      messages: Array<{ content: Array<{ type: string; text?: string }> }>
    }
    expect(params.system).toBe('SYS')
    const textBlocks = params.messages[0]!.content.filter((b) => b.type === 'text')
    expect(textBlocks[0]!.text).toBe('USR')
  })

  it('strips code-fence wrapper if Claude wraps output in ```markdown', async () => {
    const fenced = '```markdown\n' + FAKE_MARKDOWN + '\n```'
    const { client } = fakeClient(fenced)
    const ai = createAiService({ client })
    const result = await Effect.runPromise(ai.generateDiscussion({ system: 's', user: 'u' }))
    expect(result).not.toContain('```')
    expect(result).toContain('Jawaban Benar')
  })

  it('returns AiGenerationError when stop_reason is not end_turn', async () => {
    const { client } = fakeClient(FAKE_MARKDOWN, { stopReason: 'max_tokens' })
    const ai = createAiService({ client })
    await expectAiGenerationError(ai.generateDiscussion({ system: 's', user: 'u' }))
  })

  it('returns AiGenerationError when Claude returns no text block', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [],
      stop_reason: 'end_turn',
      stop_sequence: null,
    })
    const client: AnthropicLike = { messages: { create } }
    const ai = createAiService({ client })
    await expectAiGenerationError(ai.generateDiscussion({ system: 's', user: 'u' }))
  })
})

describe('AiService.streamDiscussion', () => {
  const FAKE_MARKDOWN = `## 1. Soal tentang ide pokok\n**Jawaban Benar: B**\n\nPenjelasan.\n\n**Tip:** Kunci.\n\n---`

  it('yields the full discussion text from Claude', async () => {
    const { client } = fakeClient(FAKE_MARKDOWN)
    const ai = createAiService({ client })
    const chunks: string[] = []
    for await (const chunk of ai.streamDiscussion({ system: 's', user: 'u' })) {
      chunks.push(chunk)
    }
    expect(chunks.join('')).toBe(FAKE_MARKDOWN)
  })

  it('uses discussionModel (claude-haiku-4-5) by default', async () => {
    const { client, create } = fakeClient(FAKE_MARKDOWN)
    const ai = createAiService({ client })
    // consume the generator
    for await (const _ of ai.streamDiscussion({ system: 's', user: 'u' })) { /* noop */ }
    const params = create.mock.calls[0]![0] as { model: string }
    expect(params.model).toBe('claude-haiku-4-5')
  })

  it('throws AiGenerationError when Claude fails during stream', async () => {
    const { client } = fakeClient(FAKE_MARKDOWN, { stopReason: 'max_tokens' })
    const ai = createAiService({ client })
    await expect(async () => {
      for await (const _ of ai.streamDiscussion({ system: 's', user: 'u' })) { /* noop */ }
    }).rejects.toBeInstanceOf(AiGenerationError)
  })
})
