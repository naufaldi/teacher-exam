import { Schema, Either, Match } from 'effect'
import type {
  Exam,
  ExamShareResponse,
  HealthResponse,
  ExamListResponse,
  ExamDetailResponse,
  PublicExamDetailResponse,
  UserProfile,
  UpdateProfileInput,
  ExamWithQuestions,
  GenerateExamInput,
  UpdateExamInput,
  UpdateQuestionInput,
  QuestionResponse,
  RegenerateQuestionInput,
} from '@teacher-exam/shared'
import {
  ExamShareResponseSchema,
  ExamWithQuestionsSchema,
  PublicExamWithQuestionsSchema,
} from '@teacher-exam/shared'
import { devLog } from './dev-log.js'
import {
  type ApiClientFailure,
  UnauthorizedClientError,
  RateLimitedClientError,
  ApiClientError,
  NetworkClientError,
  DecodeClientError,
  UnauthorizedError,
  RateLimitedError,
  ApiError,
} from './api-errors.js'

export {
  UnauthorizedError,
  RateLimitedError,
  ApiError,
  type ApiClientFailure,
  UnauthorizedClientError,
  RateLimitedClientError,
  ApiClientError,
  NetworkClientError,
  DecodeClientError,
}

const API_BASE = import.meta.env['VITE_API_URL'] ?? '/api'

type AuthErrorHandler = (err: UnauthorizedClientError) => void
let onUnauthorized: AuthErrorHandler | null = null

export function setUnauthorizedHandler(handler: AuthErrorHandler | null): void {
  onUnauthorized = handler
}

export function throwClientError(err: ApiClientFailure): never {
  Match.value(err).pipe(
    Match.tag('UnauthorizedClientError', (e) => {
      const legacy = new UnauthorizedError(e.message)
      if (onUnauthorized) onUnauthorized(e)
      throw legacy
    }),
    Match.tag('RateLimitedClientError', (e) => {
      throw new RateLimitedError(e.retryAfterSec, e.message)
    }),
    Match.tag('ApiClientError', (e) => {
      throw new ApiError({
        message: e.message,
        code: e.code,
        status: e.status,
        details: e.details,
      })
    }),
    Match.tag('NetworkClientError', (e) => {
      throw new Error(e.message)
    }),
    Match.tag('DecodeClientError', (e) => {
      throw new ApiError({
        message: e.message,
        code: 'DECODE_ERROR',
        status: 0,
      })
    }),
    Match.exhaustive,
  )
}

export function unwrapApiEither<A>(result: Either.Either<ApiClientFailure, A>): A {
  if (Either.isLeft(result)) {
    throwClientError(result.left)
  }
  return result.right
}

export async function apiFetchEither<T>(
  path: string,
  init?: RequestInit,
): Promise<Either.Either<ApiClientFailure, T>> {
  const method = init?.method ?? 'GET'
  const t0 = performance.now()
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    })
  } catch (err) {
    devLog('api.fetch', {
      path,
      method,
      ok: false,
      durationMs: Math.round(performance.now() - t0),
      error: err instanceof Error ? err.message : String(err),
    })
    return Either.left(
      new NetworkClientError({
        message: err instanceof Error ? err.message : String(err),
      }),
    )
  }

  const durationMs = Math.round(performance.now() - t0)
  if (!res.ok) {
    devLog('api.fetch', { path, method, status: res.status, ok: false, durationMs })
  } else {
    devLog('api.fetch', { path, method, status: res.status, ok: true, durationMs })
  }

  if (res.status === 401) {
    const err = new UnauthorizedClientError({})
    if (onUnauthorized) onUnauthorized(err)
    return Either.left(err)
  }

  if (res.status === 429) {
    const header = res.headers.get('Retry-After')
    const retryAfterSec = header ? Number(header) : 60
    return Either.left(
      new RateLimitedClientError({
        retryAfterSec: Number.isFinite(retryAfterSec) ? retryAfterSec : 60,
      }),
    )
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText, code: 'UNKNOWN' }))
    const errorBody = body as { error?: string; message?: string; code?: string; details?: unknown }
    return Either.left(
      new ApiClientError({
        message: errorBody.message ?? errorBody.error ?? res.statusText,
        code: errorBody.code ?? 'UNKNOWN',
        status: res.status,
        details: errorBody.details,
      }),
    )
  }

  const json = (await res.json()) as T
  return Either.right(json)
}

/** Throws legacy errors — use in TanStack loaders or legacy call sites. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return unwrapApiEither(await apiFetchEither<T>(path, init))
}

function decodeEither<T>(schema: Schema.Schema<T>, raw: unknown): Either.Either<ApiClientFailure, T> {
  const decoded = Schema.decodeUnknownEither(schema)(raw)
  if (decoded._tag === 'Left') {
    return Either.left(
      new DecodeClientError({ message: 'Invalid response from server' }),
    )
  }
  return Either.right(decoded.right)
}

export const api = {
  health: {
    get: () => apiFetchEither<HealthResponse>('/health'),
  },
  exams: {
    list: () => apiFetchEither<ExamListResponse>('/exams'),
    get: (id: string) => apiFetchEither<ExamDetailResponse>(`/exams/${id}`),
    patch: (id: string, body: Partial<UpdateExamInput>) =>
      apiFetchEither<ExamDetailResponse>(`/exams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: string) => apiFetchEither<void>(`/exams/${id}`, { method: 'DELETE' }),
    duplicate: (id: string) => apiFetchEither<Exam>(`/exams/${id}/duplicate`, { method: 'POST' }),
    share: async (id: string): Promise<Either.Either<ApiClientFailure, ExamShareResponse>> => {
      const raw = await apiFetchEither<unknown>(`/exams/${id}/share`, { method: 'POST' })
      if (Either.isLeft(raw)) return raw
      return decodeEither(ExamShareResponseSchema, raw.right)
    },
    finalize: (id: string) =>
      apiFetchEither<ExamDetailResponse>(`/exams/${id}/finalize`, { method: 'POST' }),
    validateCurriculum: async (id: string): Promise<Either.Either<ApiClientFailure, ExamWithQuestions>> => {
      const raw = await apiFetchEither<unknown>(`/exams/${id}/validate-curriculum`, { method: 'POST' })
      if (Either.isLeft(raw)) return raw
      return decodeEither(ExamWithQuestionsSchema, raw.right)
    },
    generateDiscussion: (id: string) =>
      apiFetchEither<ExamDetailResponse>(`/exams/${id}/discussion`, { method: 'POST' }),
    streamDiscussion: async (
      id: string,
      onDone: (exam: ExamDetailResponse) => void,
      onError: (message: string) => void,
    ): Promise<Either.Either<ApiClientFailure, void>> => {
      let response: Response
      try {
        response = await fetch(`${API_BASE}/exams/${id}/discussion`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Length': '0' },
        })
      } catch {
        return Either.left(new NetworkClientError({ message: 'Failed to fetch' }))
      }

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({})) as { message?: string; error?: string }
        return Either.left(
          new ApiClientError({
            message: body.message ?? body.error ?? `Request failed (${response.status})`,
            code: 'DISCUSSION_ERROR',
            status: response.status,
          }),
        )
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''
          for (const part of parts) {
            if (!part.trim()) continue
            let eventType = ''
            let data = ''
            for (const line of part.split('\n')) {
              if (line.startsWith('event: ')) eventType = line.slice(7)
              else if (line.startsWith('data: ')) data = line.slice(6)
            }
            if (eventType === 'done') {
              const decoded = decodeEither(ExamWithQuestionsSchema, JSON.parse(data))
              if (Either.isLeft(decoded)) {
                return Either.left(decoded.left)
              }
              onDone(decoded.right as ExamDetailResponse)
              return Either.right(undefined)
            }
            if (eventType === 'error') {
              const err = JSON.parse(data) as { message: string }
              onError(err.message)
              return Either.left(
                new ApiClientError({
                  message: err.message,
                  code: 'DISCUSSION_STREAM_ERROR',
                  status: 500,
                }),
              )
            }
          }
        }
      } catch {
        return Either.left(new NetworkClientError({ message: 'Failed to fetch' }))
      }
      return Either.right(undefined)
    },
  },
  ai: {
    generate: async (input: GenerateExamInput): Promise<Either.Either<ApiClientFailure, ExamWithQuestions>> => {
      const raw = await apiFetchEither<unknown>('/ai/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (Either.isLeft(raw)) return raw
      return decodeEither(ExamWithQuestionsSchema, raw.right)
    },
  },
  questions: {
    patch: (id: string, body: UpdateQuestionInput) =>
      apiFetchEither<QuestionResponse>(`/questions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    regenerate: (id: string, body?: RegenerateQuestionInput) =>
      apiFetchEither<QuestionResponse>(`/questions/${id}/regenerate`, {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
  },
  me: {
    get: () => apiFetchEither<UserProfile>('/me'),
    update: (body: UpdateProfileInput) =>
      apiFetchEither<UserProfile>('/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  },
  publicExams: {
    get: async (slug: string): Promise<Either.Either<ApiClientFailure, PublicExamDetailResponse>> => {
      const raw = await apiFetchEither<unknown>(`/public/exams/${slug}`)
      if (Either.isLeft(raw)) return raw
      return decodeEither(PublicExamWithQuestionsSchema, raw.right)
    },
  },
}
