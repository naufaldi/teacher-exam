import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch, ApiError, RateLimitedError, api } from '../api.js'

// Make apiFetch testable by exporting it — see implementation

const mockFetch = vi.fn()

beforeEach(() => {
  globalThis.fetch = mockFetch
  mockFetch.mockReset()
})

describe('apiFetch', () => {
  it('returns parsed JSON on a successful response', async () => {
    const data = { id: 'exam_1', title: 'Math Test' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(data),
    })

    const result = await apiFetch<typeof data>('/exams')
    expect(result).toEqual(data)
  })

  it('throws ApiError with correct code, status and message on error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Exam not found', code: 'EXAM_NOT_FOUND' }),
    })

    await expect(apiFetch('/exams/missing')).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ApiError)) return false
      return (
        err.status === 404 &&
        err.code === 'EXAM_NOT_FOUND' &&
        err.message === 'Exam not found'
      )
    })
  })

  it('defaults to UNKNOWN code when error body has no code field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: 'Something blew up' }),
    })

    await expect(apiFetch('/exams')).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ApiError)) return false
      return err.code === 'UNKNOWN' && err.status === 500
    })
  })

  it('falls back to statusText when JSON parsing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new SyntaxError('not json')),
    })

    await expect(apiFetch('/exams')).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ApiError)) return false
      return err.message === 'Bad Gateway' && err.code === 'UNKNOWN' && err.status === 502
    })
  })
})

describe('ApiError', () => {
  it('has correct name and properties', () => {
    const err = new ApiError({ message: 'Oops', code: 'ERR_TEST', status: 400 })
    expect(err.name).toBe('ApiError')
    expect(err.code).toBe('ERR_TEST')
    expect(err.status).toBe(400)
    expect(err.message).toBe('Oops')
    expect(err instanceof Error).toBe(true)
    expect(err instanceof ApiError).toBe(true)
  })

  it('stores optional details', () => {
    const details = { field: 'title', issue: 'required' }
    const err = new ApiError({ message: 'Validation failed', code: 'VALIDATION', status: 422, details })
    expect(err.details).toEqual(details)
  })
})

const VALID_EXAM_WITH_QUESTIONS = {
  id: 'exam_1',
  userId: 'user_1',
  title: 'Bahasa Indonesia · Kelas 6 · Teks Narasi',
  subject: 'bahasa_indonesia',
  grade: 6,
  difficulty: 'sedang',
  topic: 'Teks Narasi',
  reviewMode: 'fast',
  status: 'draft',
  schoolName: null,
  academicYear: null,
  examType: 'formatif',
  examDate: null,
  durationMinutes: null,
  instructions: null,
  classContext: null,
  discussionMd: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  questions: [],
}

describe('api.ai.generate', () => {
  it('POSTs to /api/ai/generate and returns decoded ExamWithQuestions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(VALID_EXAM_WITH_QUESTIONS),
    })

    const input = {
      subject: 'bahasa_indonesia' as const,
      grade: 6,
      difficulty: 'sedang' as const,
      topic: 'Teks Narasi',
      reviewMode: 'fast' as const,
    }

    const result = await api.ai.generate(input)
    expect(result.id).toBe('exam_1')
    expect(result.title).toBe('Bahasa Indonesia · Kelas 6 · Teks Narasi')
    expect(result.questions).toEqual([])

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/generate',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws ApiError when server response fails schema decode', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invalid: 'shape' }),
    })

    await expect(
      api.ai.generate({
        subject: 'bahasa_indonesia' as const,
        grade: 6,
        difficulty: 'sedang' as const,
        topic: 'Teks Narasi',
        reviewMode: 'fast' as const,
      }),
    ).rejects.toThrow()
  })

  it('rethrows RateLimitedError unchanged', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: (h: string) => (h === 'Retry-After' ? '30' : null) },
    })

    await expect(
      api.ai.generate({
        subject: 'bahasa_indonesia' as const,
        grade: 6,
        difficulty: 'sedang' as const,
        topic: 'Teks Narasi',
        reviewMode: 'fast' as const,
      }),
    ).rejects.toSatisfy((err: unknown) => err instanceof RateLimitedError && err.retryAfterSec === 30)
  })
})
