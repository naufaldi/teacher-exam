import OpenAI, { APIError } from 'openai'
import { Effect } from 'effect'
import { AiGenerationError } from '../errors'
import { logAiEvent } from './ai-log'

export interface OpenAiLike {
  chat: {
    completions: {
      create: (
        params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      ) => Promise<OpenAI.Chat.Completions.ChatCompletion>
    }
  }
  responses: {
    create: (params: OpenAI.Responses.ResponseCreateParamsNonStreaming) => Promise<OpenAI.Responses.Response>
  }
}

export interface OpenAiCallConfig {
  client: OpenAiLike
  provider?: 'openai'
  baseURL?: string
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000
const PDF_FILENAME = 'materi.pdf'

function appendConnectionContext(message: string, config: OpenAiCallConfig): string {
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
      // ignore invalid URL values
    }
  }
  if (details.length === 0) {
    return message
  }
  return `${message} (${details.join(', ')})`
}

function summarizeOpenAiFailure(cause: unknown, config: OpenAiCallConfig): string {
  if (cause instanceof APIError) {
    return appendConnectionContext(`[HTTP ${cause.status}] ${cause.message}`, config)
  }
  if (cause instanceof Error) {
    return appendConnectionContext(cause.message, config)
  }
  return String(cause)
}

function extractChatCompletionText(response: OpenAI.Chat.Completions.ChatCompletion): string | undefined {
  const choice = response.choices.at(0)
  const content = choice?.message.content
  if (typeof content === 'string') {
    return content
  }
  if (content != null && typeof content === 'object') {
    const parts = content as ReadonlyArray<{ type?: string; text?: string }>
    for (const part of parts) {
      if (part.type === 'text' && part.text) {
        return part.text
      }
    }
  }
  return undefined
}

function isSuccessfulChatFinishReason(
  finishReason: OpenAI.Chat.Completions.ChatCompletion.Choice['finish_reason'] | null | undefined,
  hasText: boolean,
): boolean {
  if (finishReason === 'stop') {
    return true
  }
  if ((finishReason === null || finishReason === undefined) && hasText) {
    return true
  }
  return false
}

function isSuccessfulResponse(response: OpenAI.Responses.Response, hasText: boolean): boolean {
  if (response.error) {
    return false
  }
  if (response.status === 'completed') {
    return hasText
  }
  if ((response.status === undefined || response.status === null) && hasText) {
    return true
  }
  return false
}

export function createOpenAiClient(apiKey: string, baseURL?: string): OpenAI {
  const clientOptions: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey,
    timeout: DEFAULT_TIMEOUT_MS,
  }
  const trimmedBaseUrl = baseURL?.trim()
  if (trimmedBaseUrl) {
    clientOptions.baseURL = trimmedBaseUrl
  }
  return new OpenAI(clientOptions)
}

export function callOpenAiLlmText({
  config,
  model,
  maxTokens,
  system,
  user,
  pdfBytes,
}: {
  config: OpenAiCallConfig
  model: string
  maxTokens: number
  system: string
  user: string
  pdfBytes?: Buffer | undefined
}): Effect.Effect<string, AiGenerationError> {
  return Effect.gen(function* () {
    const t0 = Date.now()
    if (pdfBytes) {
      const response = yield* Effect.tryPromise({
        try: () =>
          config.client.responses.create({
            model,
            max_output_tokens: maxTokens,
            instructions: system,
            input: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_file',
                    filename: PDF_FILENAME,
                    file_data: `data:application/pdf;base64,${pdfBytes.toString('base64')}`,
                  },
                  { type: 'input_text', text: user },
                ],
              },
            ],
          }),
        catch: (cause) => {
          const msg = summarizeOpenAiFailure(cause, config)
          logAiEvent('ai.responses.create', 'warn', {
            model,
            durationMs: Date.now() - t0,
            status: cause instanceof APIError ? cause.status : undefined,
            message: msg,
          })
          return new AiGenerationError({ cause: msg })
        },
      })

      const durationMs = Date.now() - t0
      const assistantText = response.output_text
      const hasAssistantText = assistantText.length > 0
      logAiEvent('ai.responses.create', 'info', {
        model,
        durationMs,
        status: response.status,
        usage: response.usage,
      })

      if (!isSuccessfulResponse(response, hasAssistantText)) {
        logAiEvent('ai.responses.create', 'warn', {
          model,
          durationMs,
          status: response.status,
          message: response.error?.message ?? 'response not completed',
        })
        return yield* Effect.fail(
          new AiGenerationError({
            cause: `AI returned incomplete output (status: ${String(response.status)})`,
          }),
        )
      }
      if (!hasAssistantText) {
        return yield* Effect.fail(new AiGenerationError({ cause: 'AI returned no text block' }))
      }
      return assistantText
    }

    const response = yield* Effect.tryPromise({
      try: () =>
        config.client.chat.completions.create({
          model,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      catch: (cause) => {
        const msg = summarizeOpenAiFailure(cause, config)
        logAiEvent('ai.chat.completions.create', 'warn', {
          model,
          durationMs: Date.now() - t0,
          status: cause instanceof APIError ? cause.status : undefined,
          message: msg,
        })
        return new AiGenerationError({ cause: msg })
      },
    })

    const durationMs = Date.now() - t0
    const choice = response.choices.at(0)
    logAiEvent('ai.chat.completions.create', 'info', {
      model,
      durationMs,
      finishReason: choice?.finish_reason,
      usage: response.usage,
    })

    const assistantText = extractChatCompletionText(response)
    const hasAssistantText = assistantText !== undefined && assistantText.length > 0
    if (!isSuccessfulChatFinishReason(choice?.finish_reason, hasAssistantText)) {
      logAiEvent('ai.chat.completions.create', 'warn', {
        model,
        durationMs,
        finishReason: choice?.finish_reason,
        message: 'finish_reason not accepted',
      })
      return yield* Effect.fail(
        new AiGenerationError({
          cause: `AI returned incomplete output (finish_reason: ${String(choice?.finish_reason)})`,
        }),
      )
    }
    if (assistantText === undefined) {
      return yield* Effect.fail(new AiGenerationError({ cause: 'AI returned no text block' }))
    }
    return assistantText
  })
}
