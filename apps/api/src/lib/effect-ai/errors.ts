import { AiError } from '@effect/ai'
import { Match } from 'effect'
import { AiGenerationError } from '../../errors'

export interface ProviderErrorContext {
  provider?: 'anthropic' | 'minimax' | 'openai'
  baseURL?: string
}

export function appendConnectionContext(message: string, context: ProviderErrorContext): string {
  if (!/connection|fetch failed|timed? ?out|enotfound|econn/i.test(message)) {
    return message
  }
  const details: Array<string> = []
  if (context.provider !== undefined) {
    details.push(`provider=${context.provider}`)
  }
  if (context.baseURL !== undefined) {
    try {
      const url = new URL(context.baseURL)
      if (url.host) {
        details.push(`host=${url.host}`)
      }
    } catch {
      // keep original message when baseURL is invalid
    }
  }
  if (details.length === 0) {
    return message
  }
  return `${message} (${details.join(', ')})`
}

function summarizeAiError(error: AiError.AiError): string {
  return Match.value(error).pipe(
    Match.tag('HttpRequestError', (err) => err.message),
    Match.tag('HttpResponseError', (err) => {
      const status = err.response.status
      return `[HTTP ${status}] ${err.message}`
    }),
    Match.tag('MalformedInput', (err) => err.message),
    Match.tag('MalformedOutput', (err) => err.message),
    Match.tag('UnknownError', (err) => err.description ?? err.message),
    Match.exhaustive,
  )
}

export function mapAiError(
  error: AiError.AiError,
  context: ProviderErrorContext,
): AiGenerationError {
  const message = appendConnectionContext(summarizeAiError(error), context)
  return new AiGenerationError({ cause: message })
}
