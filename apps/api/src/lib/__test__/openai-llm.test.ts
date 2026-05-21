import { Effect, Either } from 'effect'
import { APIError } from 'openai'
import { describe, expect, it, vi } from 'vitest'
import { AiGenerationError } from '../../errors'
import { callOpenAiLlmText, type OpenAiLike } from '../openai-llm'

function fakeOpenAiClient(opts: {
  chatText?: string
  responseText?: string
  chatError?: unknown
  responseError?: unknown
} = {}): { client: OpenAiLike; chatCreate: ReturnType<typeof vi.fn>; responsesCreate: ReturnType<typeof vi.fn> } {
  const chatCreate = vi.fn().mockImplementation(async () => {
    if (opts.chatError) {
      throw opts.chatError
    }
    return {
      choices: [{ message: { content: opts.chatText ?? '[]' }, finish_reason: 'stop' }],
    }
  })
  const responsesCreate = vi.fn().mockImplementation(async () => {
    if (opts.responseError) {
      throw opts.responseError
    }
    return {
      output_text: opts.responseText ?? '[]',
      error: null,
      status: 'completed',
    }
  })
  return {
    client: {
      chat: { completions: { create: chatCreate } },
      responses: { create: responsesCreate },
    },
    chatCreate,
    responsesCreate,
  }
}

describe('callOpenAiLlmText', () => {
  it('sends system and user via chat.completions when pdfBytes is absent', async () => {
    const { client, chatCreate, responsesCreate } = fakeOpenAiClient()
    await Effect.runPromise(
      callOpenAiLlmText({
        config: { client, provider: 'openai' },
        model: 'gpt-5.4-mini',
        maxTokens: 32000,
        system: 'BASELINE\n## Capaian Pembelajaran',
        user: 'task params',
      }),
    )

    expect(chatCreate).toHaveBeenCalledOnce()
    expect(responsesCreate).not.toHaveBeenCalled()
    const params = chatCreate.mock.calls[0]![0] as {
      model: string
      max_completion_tokens: number
      messages: Array<{ role: string; content: string }>
    }
    expect(params.model).toBe('gpt-5.4-mini')
    expect(params.max_completion_tokens).toBe(32000)
    expect(params.messages).toEqual([
      { role: 'system', content: 'BASELINE\n## Capaian Pembelajaran' },
      { role: 'user', content: 'task params' },
    ])
  })

  it('sends PDF via responses.create with base64 input_file', async () => {
    const { client, chatCreate, responsesCreate } = fakeOpenAiClient()
    const pdfBytes = Buffer.from('%PDF-1.4 fake')

    await Effect.runPromise(
      callOpenAiLlmText({
        config: { client, provider: 'openai' },
        model: 'gpt-5.4-mini',
        maxTokens: 32000,
        system: 'system corpus',
        user: 'user task',
        pdfBytes,
      }),
    )

    expect(responsesCreate).toHaveBeenCalledOnce()
    expect(chatCreate).not.toHaveBeenCalled()
    const params = responsesCreate.mock.calls[0]![0] as {
      model: string
      max_output_tokens: number
      instructions: string
      input: Array<{
        role: string
        content: Array<{ type: string; filename?: string; file_data?: string; text?: string }>
      }>
    }
    expect(params.model).toBe('gpt-5.4-mini')
    expect(params.max_output_tokens).toBe(32000)
    expect(params.instructions).toBe('system corpus')
    expect(params.input[0]!.content[0]).toMatchObject({
      type: 'input_file',
      filename: 'materi.pdf',
    })
    expect(params.input[0]!.content[0]!.file_data).toContain(
      `data:application/pdf;base64,${pdfBytes.toString('base64')}`,
    )
    expect(params.input[0]!.content[1]).toEqual({ type: 'input_text', text: 'user task' })
  })

  it('passes response_format json_schema when structuredOutput is generated_questions', async () => {
    const { client, chatCreate } = fakeOpenAiClient()
    await Effect.runPromise(
      callOpenAiLlmText({
        config: { client, provider: 'openai' },
        model: 'gpt-5.4-mini',
        maxTokens: 32000,
        system: 'BASELINE',
        user: 'task params',
        structuredOutput: 'generated_questions',
      }),
    )

    const params = chatCreate.mock.calls[0]![0] as {
      response_format?: { type: string; json_schema?: { name: string } }
    }
    expect(params.response_format?.type).toBe('json_schema')
    expect(params.response_format?.json_schema?.name).toBe('generated_questions')
  })

  it('omits response_format for markdown-style calls without structuredOutput', async () => {
    const { client, chatCreate } = fakeOpenAiClient()
    await Effect.runPromise(
      callOpenAiLlmText({
        config: { client, provider: 'openai' },
        model: 'gpt-5.4-mini',
        maxTokens: 16000,
        system: 'pembahasan',
        user: '[]',
      }),
    )

    const params = chatCreate.mock.calls[0]![0] as { response_format?: unknown }
    expect(params.response_format).toBeUndefined()
  })

  it('retries without response_format when structured output is rejected', async () => {
    const chatCreate = vi
      .fn()
      .mockRejectedValueOnce(new APIError(400, undefined, 'Invalid response_format json_schema', undefined))
      .mockResolvedValueOnce({
        choices: [{ message: { content: '[]' }, finish_reason: 'stop' }],
      })
    const client: OpenAiLike = {
      chat: { completions: { create: chatCreate } },
      responses: { create: vi.fn() },
    }

    const text = await Effect.runPromise(
      callOpenAiLlmText({
        config: { client, provider: 'openai' },
        model: 'gpt-5.4-mini',
        maxTokens: 1000,
        system: 's',
        user: 'u',
        structuredOutput: 'curriculum_validation',
      }),
    )

    expect(text).toBe('[]')
    expect(chatCreate).toHaveBeenCalledTimes(2)
    expect(chatCreate.mock.calls[0]![0]).toHaveProperty('response_format')
    expect(chatCreate.mock.calls[1]![0]).not.toHaveProperty('response_format')
  })

  it('maps OpenAI APIError status into AiGenerationError', async () => {
    const { client } = fakeOpenAiClient({
      chatError: new APIError(429, undefined, 'Rate limit exceeded', undefined),
    })
    const result = await Effect.runPromise(
      Effect.either(
        callOpenAiLlmText({
          config: { client, provider: 'openai', baseURL: 'https://api.openai.com/v1' },
          model: 'gpt-5.4-mini',
          maxTokens: 1000,
          system: 's',
          user: 'u',
        }),
      ),
    )
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isRight(result)) throw new Error('expected failure')
    expect(result.left).toBeInstanceOf(AiGenerationError)
    expect(String(result.left.cause)).toContain('[HTTP 429]')
    expect(String(result.left.cause)).toContain('Rate limit exceeded')
  })
})
