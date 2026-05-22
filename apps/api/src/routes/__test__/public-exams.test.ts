import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ op: 'eq', col, val })),
  and: vi.fn((...args) => ({ op: 'and', args })),
}))

import { db } from '@teacher-exam/db'
import { makeChain, makeExamRow, makeQuestionRow } from './helpers'
import { buildHttpApiTestApp } from './http-api-setup'

function buildTestApp() {
  return buildHttpApiTestApp({ authenticated: false })
}

describe('GET /api/public/exams/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when there is no matching public exam', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request('/api/public/exams/missing-slug')

    expect(res.status).toBe(404)
  })

  it('returns a public exam payload without owner userId', async () => {
    const examRow = makeExamRow({
      isPublic: true,
      publicShareSlug: 'share-abc123',
      publishedAt: new Date('2026-05-08T09:00:00.000Z'),
      status: 'final',
    })

    let callCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([examRow])
      return makeChain([makeQuestionRow({ examId: 'exam-1', status: 'accepted' })])
    })

    const app = buildTestApp()
    const res = await app.request('/api/public/exams/share-abc123')

    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body['id']).toBe('exam-1')
    expect(body['publishedAt']).toBe('2026-05-08T09:00:00.000Z')
    expect(body).not.toHaveProperty('userId')
    expect(body['questions']).toEqual(expect.any(Array))
  })
})
