import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { db } from '@teacher-exam/db'
import { buildHttpApiTestApp } from '../http-api-setup.js'
import { makeChain, makeExamRow, makeQuestionRow } from '../helpers.js'

const NOW = '2024-01-01T00:00:00.000Z'

function buildTestApp() {
  return buildHttpApiTestApp({ userId: 'test-user-id' })
}

function makeBankQuestionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bank-1',
    userId: 'test-user-id',
    questionId: 'q-1',
    subject: 'ipas',
    grade: 5,
    topics: ['Energi'],
    difficulty: 'sedang',
    type: 'mcq_single',
    payload: {},
    isPublic: false,
    usageCount: 0,
    createdAt: new Date(NOW),
    ...overrides,
  }
}

describe('GET /api/bank', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns paginated bank questions for the current user', async () => {
    const bankRow = makeBankQuestionRow()
    const questionRow = makeQuestionRow({ id: 'q-1', text: 'Apa itu energi?' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ count: 1 }])
      if (selectCount === 2) return makeChain([bankRow])
      return makeChain([questionRow])
    })

    const app = buildTestApp()
    const res = await app.request('/api/bank')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['total']).toBe(1)
    const data = body['data'] as Array<Record<string, unknown>>
    expect(data[0]?.['text']).toBe('Apa itu energi?')
  })
})

describe('POST /api/bank', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when question is not owned by user', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request('/api/bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 'missing-q' }),
    })
    expect(res.status).toBe(404)
  })

  it('saves a question to bank and returns 201', async () => {
    const examRow = makeExamRow({ subject: 'ipas', grade: 5 })
    const questionRow = makeQuestionRow({ id: 'q-1', examId: 'exam-1', text: 'Soal bank' })
    const bankRow = makeBankQuestionRow()

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ ...questionRow, examId: examRow.id }])
      if (selectCount === 2) return makeChain([examRow])
      return makeChain([questionRow])
    })

    const insertChain = makeChain([bankRow])
    ;(db.insert as Mock).mockReturnValue({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => insertChain),
        })),
      })),
    })

    const app = buildTestApp()
    const res = await app.request('/api/bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 'q-1' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as Record<string, unknown>
    expect(body['text']).toBe('Soal bank')
  })
})

describe('DELETE /api/bank/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when bank question not found', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))

    const app = buildTestApp()
    const res = await app.request('/api/bank/missing', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('deletes owned bank question', async () => {
    const bankRow = makeBankQuestionRow()
    ;(db.select as Mock).mockReturnValue(makeChain([bankRow]))
    ;(db.delete as Mock).mockReturnValue(makeChain(undefined))

    const app = buildTestApp()
    const res = await app.request('/api/bank/bank-1', { method: 'DELETE' })
    expect(res.status).toBe(204)
  })
})

describe('POST /api/bank/build-exam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 422 when fewer than 5 questions', async () => {
    const app = buildTestApp()
    const res = await app.request('/api/bank/build-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankQuestionIds: ['a', 'b', 'c', 'd'],
        metadata: { subject: 'ipas', grade: 5 },
      }),
    })
    expect(res.status).toBe(400)
  })
})
