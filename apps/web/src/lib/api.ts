import type {
  HealthResponse,
  ExamListResponse,
  ExamDetailResponse,
  UserProfile,
  UpdateProfileInput,
} from '@teacher-exam/shared'

const API_BASE = '/api'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
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
