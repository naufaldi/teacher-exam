import { Schema } from 'effect'
import type {
  Exam,
  HealthResponse,
  ExamListResponse,
  ExamDetailResponse,
  UserProfile,
  UpdateProfileInput,
  ExamWithQuestions,
  GenerateExamInput,
  UpdateExamInput,
  UpdateQuestionInput,
  QuestionResponse,
} from '@teacher-exam/shared'
import { ExamWithQuestionsSchema } from '@teacher-exam/shared'

const API_BASE = '/api'

/**
 * Thrown when an API call returns 401. Caller should clear local session
 * state and redirect to the login page.
 */
export class UnauthorizedError extends Error {
  readonly _tag = 'UnauthorizedError' as const
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Thrown when an API call returns 429. `retryAfterSec` is parsed from the
 * `Retry-After` response header when present.
 */
export class RateLimitedError extends Error {
  readonly _tag = 'RateLimitedError' as const
  readonly retryAfterSec: number
  constructor(retryAfterSec: number, message = 'Terlalu banyak permintaan. Coba lagi sebentar.') {
    super(message)
    this.name = 'RateLimitedError'
    this.retryAfterSec = retryAfterSec
  }
}

export class ApiError extends Error {
  code: string
  status: number
  details?: unknown

  constructor({
    message,
    code,
    status,
    details,
  }: {
    message: string
    code: string
    status: number
    details?: unknown
  }) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

type AuthErrorHandler = (err: UnauthorizedError) => void
let onUnauthorized: AuthErrorHandler | null = null

/**
 * Register a global handler invoked whenever any API call returns 401.
 * Used by the auth layout to sign out and redirect to /.
 */
export function setUnauthorizedHandler(handler: AuthErrorHandler | null): void {
  onUnauthorized = handler
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (res.status === 401) {
    const err = new UnauthorizedError()
    if (onUnauthorized) onUnauthorized(err)
    throw err
  }

  if (res.status === 429) {
    const header = res.headers.get('Retry-After')
    const retryAfterSec = header ? Number(header) : 60
    throw new RateLimitedError(Number.isFinite(retryAfterSec) ? retryAfterSec : 60)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText, code: 'UNKNOWN' }))
    throw new ApiError({
      message: (body as { error?: string }).error ?? res.statusText,
      code: (body as { code?: string }).code ?? 'UNKNOWN',
      status: res.status,
      details: (body as { details?: unknown }).details,
    })
  }
  return res.json() as Promise<T>
}

export const api = {
  health: {
    get: () => apiFetch<HealthResponse>('/health'),
  },
  exams: {
    list: () => apiFetch<ExamListResponse>('/exams'),
    get: (id: string) => apiFetch<ExamDetailResponse>(`/exams/${id}`),
    patch: (id: string, body: Partial<UpdateExamInput>) =>
      apiFetch<ExamDetailResponse>(`/exams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: string) => apiFetch<void>(`/exams/${id}`, { method: 'DELETE' }),
    duplicate: (id: string) => apiFetch<Exam>(`/exams/${id}/duplicate`, { method: 'POST' }),
    finalize: (id: string) =>
      apiFetch<ExamDetailResponse>(`/exams/${id}/finalize`, { method: 'POST' }),
  },
  ai: {
    generate: async (input: GenerateExamInput): Promise<ExamWithQuestions> => {
      const raw = await apiFetch<unknown>('/ai/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      const decoded = Schema.decodeUnknownEither(ExamWithQuestionsSchema)(raw)
      if (decoded._tag === 'Left') {
        throw new ApiError({
          message: 'Invalid response from server',
          code: 'DECODE_ERROR',
          status: 0,
        })
      }
      return decoded.right
    },
  },
  questions: {
    patch: (id: string, body: UpdateQuestionInput) =>
      apiFetch<QuestionResponse>(`/questions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  },
  me: {
    get: () => apiFetch<UserProfile>('/me'),
    update: (body: UpdateProfileInput) =>
      apiFetch<UserProfile>('/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  },
}
