import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch, ApiError } from '../api.js'

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
