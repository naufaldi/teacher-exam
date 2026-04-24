import { describe, expect, it, vi } from 'vitest'
import {
  AiGenerationError,
  createAiService,
  type AnthropicLike,
} from '../AiService'

const VALID_QUESTIONS = Array.from({ length: 20 }, (_, i) => ({
  text: `Soal ${i + 1}`,
  option_a: 'A',
  option_b: 'B',
  option_c: 'C',
  option_d: 'D',
  correct_answer: 'a',
  topic: 'Pemahaman Bacaan',
  difficulty: 'sedang',
  cognitive_level: 'C2',
}))

function fakeClient(text: string): {
  client: AnthropicLike
  create: ReturnType<typeof vi.fn>
} {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text }],
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
    await ai.generate({ system, user })

    expect(create).toHaveBeenCalledOnce()
    const params = create.mock.calls[0]![0] as {
      system: string
      messages: Array<{ role: string; content: Array<{ type: string; text?: string }> }>
    }
    expect(params.system).toBe(system)
    expect(params.system).toContain('## Capaian Pembelajaran')

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
    await ai.generate({ system: 's', user: 'u', pdfBytes })

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
    const out = await ai.generate({ system: 's', user: 'u' })
    expect(out).toHaveLength(20)
  })

  it('throws AiGenerationError on non-JSON output', async () => {
    const { client } = fakeClient('not json')
    const ai = createAiService({ client })
    await expect(ai.generate({ system: 's', user: 'u' })).rejects.toBeInstanceOf(
      AiGenerationError,
    )
  })

  it('throws AiGenerationError when a question fails schema validation', async () => {
    const bad = [...VALID_QUESTIONS]
    bad[0] = { ...bad[0]!, correct_answer: 'z' as 'a' }
    const { client } = fakeClient(JSON.stringify(bad))
    const ai = createAiService({ client })
    await expect(ai.generate({ system: 's', user: 'u' })).rejects.toBeInstanceOf(
      AiGenerationError,
    )
  })
})
