import type {
  Exam,
  HealthResponse,
  ExamListResponse,
  ExamDetailResponse,
  UserProfile,
  UpdateProfileInput,
} from '@teacher-exam/shared'

const API_BASE = '/api'

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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
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
    patch: (id: string, body: object) =>
      apiFetch<ExamDetailResponse>(`/exams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: string) => apiFetch<void>(`/exams/${id}`, { method: 'DELETE' }),
    duplicate: (id: string) => apiFetch<Exam>(`/exams/${id}/duplicate`, { method: 'POST' }),
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
