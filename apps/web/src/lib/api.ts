import type {
  HealthResponse,
  ExamListResponse,
  ExamDetailResponse,
  UserProfile,
  UpdateProfileInput,
} from '@teacher-exam/shared'

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

type AuthErrorHandler = (err: UnauthorizedError) => void
let onUnauthorized: AuthErrorHandler | null = null

/**
 * Register a global handler invoked whenever any API call returns 401.
 * Used by the auth layout to sign out and redirect to /.
 */
export function setUnauthorizedHandler(handler: AuthErrorHandler | null): void {
  onUnauthorized = handler
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: {
    get: () => apiFetch<HealthResponse>('/health'),
  },
  exams: {
    list: ()               => apiFetch<ExamListResponse>('/exams'),
    get:  (id: string)     => apiFetch<ExamDetailResponse>(`/exams/${id}`),
    patch: (id: string, body: object) =>
      apiFetch<ExamDetailResponse>(`/exams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: string)   =>
      apiFetch<void>(`/exams/${id}`, { method: 'DELETE' }),
  },
  me: {
    get:    ()                          => apiFetch<UserProfile>('/me'),
    update: (body: UpdateProfileInput)  =>
      apiFetch<UserProfile>('/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  },
}
