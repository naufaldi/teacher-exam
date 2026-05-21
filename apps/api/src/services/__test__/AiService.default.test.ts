import { Effect } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ctorMock = vi.hoisted(() =>
  vi.fn(function MockAnthropic(this: { messages: { create: ReturnType<typeof vi.fn> } }) {
    this.messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
        stop_reason: 'end_turn',
        stop_sequence: null,
      }),
    }
    return this
  }),
)

const openAiCtorMock = vi.hoisted(() =>
  vi.fn(function MockOpenAI(this: {
    chat: { completions: { create: ReturnType<typeof vi.fn> } }
    responses: { create: ReturnType<typeof vi.fn> }
  }) {
    this.chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '[]' }, finish_reason: 'stop' }],
        }),
      },
    }
    this.responses = {
      create: vi.fn().mockResolvedValue({
        output_text: '[]',
        error: null,
        status: 'completed',
      }),
    }
    return this
  }),
)

vi.mock('@anthropic-ai/sdk', () => ({
  default: ctorMock,
}))

vi.mock('openai', () => ({
  default: openAiCtorMock,
  OpenAI: openAiCtorMock,
  APIError: class MockOpenAiApiError extends Error {
    status: number
    constructor(message: string, status = 500) {
      super(message)
      this.name = 'APIError'
      this.status = status
    }
  },
}))

import { createDefaultAiService } from '../AiService'

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000

function getFirstCtorArg(): Record<string, unknown> {
  const firstCall = ctorMock.mock.calls.at(0)
  if (!firstCall) {
    throw new Error('Expected Anthropic constructor to be called at least once')
  }
  const firstArg = (firstCall as Array<unknown>).at(0)
  if (!firstArg || typeof firstArg !== 'object') {
    throw new Error('Expected Anthropic constructor to receive an options object')
  }
  return firstArg as Record<string, unknown>
}

function getCtorArg(index: number): Record<string, unknown> {
  const call = ctorMock.mock.calls.at(index)
  if (!call) {
    throw new Error(`Expected Anthropic constructor call at index ${index}`)
  }
  const arg = (call as Array<unknown>).at(0)
  if (!arg || typeof arg !== 'object') {
    throw new Error('Expected Anthropic constructor to receive an options object')
  }
  return arg as Record<string, unknown>
}

function getCreateMock(index: number): ReturnType<typeof vi.fn> {
  const instance = ctorMock.mock.results.at(index)?.value as
    | { messages?: { create?: ReturnType<typeof vi.fn> } }
    | undefined
  const create = instance?.messages?.create
  if (!create) {
    throw new Error(`Expected create mock on Anthropic instance ${index}`)
  }
  return create
}

function getOpenAiCtorArg(index = 0): Record<string, unknown> {
  const call = openAiCtorMock.mock.calls.at(index)
  if (!call) {
    throw new Error(`Expected OpenAI constructor call at index ${index}`)
  }
  const arg = (call as Array<unknown>).at(0)
  if (!arg || typeof arg !== 'object') {
    throw new Error('Expected OpenAI constructor to receive an options object')
  }
  return arg as Record<string, unknown>
}

function getOpenAiInstance(index = 0): {
  chat: { completions: { create: ReturnType<typeof vi.fn> } }
  responses: { create: ReturnType<typeof vi.fn> }
} {
  const instance = openAiCtorMock.mock.results.at(index)?.value
  if (!instance) {
    throw new Error(`Expected OpenAI instance at index ${index}`)
  }
  return instance as {
    chat: { completions: { create: ReturnType<typeof vi.fn> } }
    responses: { create: ReturnType<typeof vi.fn> }
  }
}

describe('createDefaultAiService', () => {
  beforeEach(() => {
    ctorMock.mockClear()
    openAiCtorMock.mockClear()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses Anthropic default base URL when AI_PROVIDER is anthropic (default)', () => {
    vi.stubEnv('AI_PROVIDER', 'anthropic')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')

    createDefaultAiService()

    expect(ctorMock).toHaveBeenCalledOnce()
    const firstCtorArg = getFirstCtorArg()
    expect(firstCtorArg).toMatchObject({
      apiKey: 'sk-ant-test',
      timeout: DEFAULT_TIMEOUT_MS,
    })
    expect(firstCtorArg).not.toHaveProperty('baseURL')
  })

  it('requires ANTHROPIC_API_KEY when AI_PROVIDER=anthropic', () => {
    vi.stubEnv('AI_PROVIDER', 'anthropic')
    vi.stubEnv('ANTHROPIC_API_KEY', '')

    expect(() => createDefaultAiService()).toThrow(/ANTHROPIC_API_KEY is required/)
  })

  it('builds MiniMax client with baseURL and MINIMAX_API_KEY when AI_PROVIDER=minimax', () => {
    vi.stubEnv('AI_PROVIDER', 'minimax')
    vi.stubEnv('MINIMAX_API_KEY', 'minimax-test')
    vi.stubEnv('MINIMAX_ANTHROPIC_BASE_URL', 'https://api.minimax.io/anthropic')
    vi.stubEnv('AI_MODEL', 'MiniMax-M2.7')
    vi.stubEnv('AI_DISCUSSION_MODEL', 'MiniMax-M2.7-highspeed')

    createDefaultAiService()

    expect(ctorMock).toHaveBeenCalledOnce()
    expect(getFirstCtorArg()).toMatchObject({
      apiKey: 'minimax-test',
      baseURL: 'https://api.minimax.io/anthropic',
      timeout: DEFAULT_TIMEOUT_MS,
    })
    expect(typeof getFirstCtorArg()['fetch']).toBe('function')
  })

  it('uses MiniMax anthropic base URL by default when MINIMAX_ANTHROPIC_BASE_URL is unset', () => {
    vi.stubEnv('AI_PROVIDER', 'minimax')
    vi.stubEnv('MINIMAX_API_KEY', 'minimax-test')
    vi.stubEnv('MINIMAX_ANTHROPIC_BASE_URL', '')

    createDefaultAiService()

    expect(ctorMock).toHaveBeenCalledOnce()
    expect(getFirstCtorArg()).toMatchObject({
      baseURL: 'https://api.minimax.io/anthropic',
    })
  })

  it('requires MINIMAX_API_KEY when AI_PROVIDER=minimax', () => {
    vi.stubEnv('AI_PROVIDER', 'minimax')
    vi.stubEnv('MINIMAX_API_KEY', '')

    expect(() => createDefaultAiService()).toThrow(/MINIMAX_API_KEY is required/)
  })

  it('builds OpenAI client with OPENAI_API_KEY and default base URL when AI_PROVIDER=openai', () => {
    vi.stubEnv('AI_PROVIDER', 'openai')
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-test')

    createDefaultAiService()

    expect(openAiCtorMock).toHaveBeenCalledOnce()
    expect(ctorMock).not.toHaveBeenCalled()
    expect(getOpenAiCtorArg()).toMatchObject({
      apiKey: 'sk-openai-test',
      baseURL: 'https://api.openai.com/v1',
      timeout: DEFAULT_TIMEOUT_MS,
    })
  })

  it('requires OPENAI_API_KEY when AI_PROVIDER=openai', () => {
    vi.stubEnv('AI_PROVIDER', 'openai')
    vi.stubEnv('OPENAI_API_KEY', '')

    expect(() => createDefaultAiService()).toThrow(/OPENAI_API_KEY is required/)
  })

  it('uses OPENAI_BASE_URL and model env overrides when AI_PROVIDER=openai', () => {
    vi.stubEnv('AI_PROVIDER', 'openai')
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-test')
    vi.stubEnv('OPENAI_BASE_URL', 'https://proxy.example/v1')
    vi.stubEnv('AI_MODEL', 'gpt-5.4-mini-custom')
    vi.stubEnv('AI_DISCUSSION_MODEL', 'gpt-5.4-mini-fast')

    const ai = createDefaultAiService()
    expect(getOpenAiCtorArg()).toMatchObject({
      baseURL: 'https://proxy.example/v1',
    })

    void Effect.runPromise(ai.generateDiscussion({ system: 's', user: 'u' }))
    const chatCreate = getOpenAiInstance().chat.completions.create
    expect(chatCreate).toHaveBeenCalledOnce()
    expect((chatCreate.mock.calls[0]![0] as { model: string }).model).toBe('gpt-5.4-mini-fast')
  })

  it('routes PDF generation to OpenAI responses API when AI_PROVIDER=openai', async () => {
    vi.stubEnv('AI_PROVIDER', 'openai')
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-test')

    const ai = createDefaultAiService()
    const pdfQuestion = {
      _tag: 'mcq_single' as const,
      number: 1,
      text: 'Question 1',
      option_a: 'A',
      option_b: 'B',
      option_c: 'C',
      option_d: 'D',
      correct_answer: 'a',
      topic: 'Teks',
      difficulty: 'sedang',
    }
    const instance = getOpenAiInstance()
    instance.responses.create.mockResolvedValueOnce({
      output_text: JSON.stringify([pdfQuestion]),
      error: null,
      status: 'completed',
    })

    await Effect.runPromise(
      ai.generate({
        system: 'system',
        user: 'user',
        pdfBytes: Buffer.from('%PDF-1.4'),
        expectedCount: 1,
      }),
    )

    expect(instance.responses.create).toHaveBeenCalledOnce()
    expect(instance.chat.completions.create).not.toHaveBeenCalled()
  })

  it('routes PDF generation to Anthropic when AI_PROVIDER=minimax', async () => {
    vi.stubEnv('AI_PROVIDER', 'minimax')
    vi.stubEnv('MINIMAX_API_KEY', 'minimax-test')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-fallback')

    const ai = createDefaultAiService()
    const pdfQuestion = {
      _tag: 'mcq_single' as const,
      number: 1,
      text: 'Question 1',
      option_a: 'A',
      option_b: 'B',
      option_c: 'C',
      option_d: 'D',
      correct_answer: 'a',
      topic: 'Teks',
      difficulty: 'sedang',
    }
    ctorMock.mockImplementationOnce(function MockAnthropicPdf(this: {
      messages: { create: ReturnType<typeof vi.fn> }
    }) {
      this.messages = {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify([pdfQuestion]) }],
          stop_reason: 'end_turn',
          stop_sequence: null,
        }),
      }
      return this
    })

    await Effect.runPromise(
      ai.generate({
        system: 'system',
        user: 'user',
        pdfBytes: Buffer.from('%PDF-1.4'),
        expectedCount: 1,
      }),
    )

    expect(ctorMock).toHaveBeenCalledTimes(2)
    expect(getCtorArg(0)).toMatchObject({
      apiKey: 'minimax-test',
      baseURL: 'https://api.minimax.io/anthropic',
    })
    expect(getCtorArg(1)).toMatchObject({
      apiKey: 'sk-ant-fallback',
    })
    expect(getCtorArg(1)).not.toHaveProperty('baseURL')
    expect(getCreateMock(0)).not.toHaveBeenCalled()
    expect(getCreateMock(1)).toHaveBeenCalledOnce()
  })

  it('rejects unknown AI_PROVIDER', () => {
    vi.stubEnv('AI_PROVIDER', 'bogus')

    expect(() => createDefaultAiService()).toThrow(/must be "anthropic", "minimax", or "openai"/)
  })
})
