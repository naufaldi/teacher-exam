import { describe, expect, it, vi } from 'vitest'
import {
  AiGenerationError,
  createAiService,
  type AnthropicLike,
} from '../AiService'

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

describe('AiService.generate', () => {
  it('sends curriculum via the top-level system field, not in user content', async () => {
    const { client, create } = fakeClient(JSON.stringify(VALID_QUESTIONS))
    const ai = createAiService({ client })

    const system = 'BASELINE\n## Capaian Pembelajaran\n- foo'
    const user = 'task params'
    await ai.generate({ system, user, expectedCount: 20 })

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
    await ai.generate({ system: 's', user: 'u', pdfBytes, expectedCount: 20 })

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
    const out = await ai.generate({ system: 's', user: 'u', expectedCount: 20 })
    expect(out).toHaveLength(20)
  })

  it('throws AiGenerationError when question count does not match expectedCount', async () => {
    const { client } = fakeClient(JSON.stringify(VALID_QUESTIONS.slice(0, 5)))
    const ai = createAiService({ client })
    await expect(ai.generate({ system: 's', user: 'u', expectedCount: 20 })).rejects.toBeInstanceOf(
      AiGenerationError,
    )
  })

  it('throws a clear AiGenerationError when Claude stops at max_tokens', async () => {
    const { client } = fakeClient('[{"_tag":"mcq_single","text":"truncated', {
      stopReason: 'max_tokens',
    })
    const ai = createAiService({ client })

    const err = await ai.generate({ system: 's', user: 'u', expectedCount: 20 }).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(AiGenerationError)
    expect((err as AiGenerationError).message).toContain('max_tokens')
    expect((err as AiGenerationError).message).toContain('incomplete')
  })


  it('throws AiGenerationError on non-JSON output', async () => {
    const { client } = fakeClient('not json')
    const ai = createAiService({ client })
    await expect(ai.generate({ system: 's', user: 'u', expectedCount: 20 })).rejects.toBeInstanceOf(
      AiGenerationError,
    )
  })

  it('throws AiGenerationError when a question fails schema validation', async () => {
    const bad = [...VALID_QUESTIONS]
    bad[0] = { ...bad[0]!, correct_answer: 'z' as 'a' }
    const { client } = fakeClient(JSON.stringify(bad))
    const ai = createAiService({ client })
    await expect(ai.generate({ system: 's', user: 'u', expectedCount: 20 })).rejects.toBeInstanceOf(
      AiGenerationError,
    )
  })
})

describe('AiService.generate — expectedCount', () => {
  it('throws AiGenerationError with both numbers when AI returns fewer questions than expectedCount', async () => {
    const fiveQuestions = VALID_QUESTIONS.slice(0, 5)
    const { client } = fakeClient(JSON.stringify(fiveQuestions))
    const ai = createAiService({ client })
    const err = await ai.generate({ system: 's', user: 'u', expectedCount: 10 }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AiGenerationError)
    expect((err as AiGenerationError).message).toContain('10')
    expect((err as AiGenerationError).message).toContain('5')
  })

  it('resolves successfully when AI returns exactly expectedCount questions', async () => {
    const tenQuestions = VALID_QUESTIONS.slice(0, 10)
    const { client } = fakeClient(JSON.stringify(tenQuestions))
    const ai = createAiService({ client })
    const result = await ai.generate({ system: 's', user: 'u', expectedCount: 10 })
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
    const result = await ai.generate({ system: 's', user: 'u', expectedCount: 3 })
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
    await expect(ai.generate({ system: 's', user: 'u', expectedCount: 1 })).rejects.toBeInstanceOf(AiGenerationError)
  })

  it('throws AiGenerationError for unknown _tag', async () => {
    const bad = [{ _tag: 'essay', number: 1, text: 'Ceritakan!', topic: 'T', difficulty: 'mudah' }]
    const { client } = fakeClient(JSON.stringify(bad))
    const ai = createAiService({ client })
    await expect(ai.generate({ system: 's', user: 'u', expectedCount: 1 })).rejects.toBeInstanceOf(AiGenerationError)
  })
})
