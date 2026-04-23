import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Hono } from 'hono'

vi.mock('@teacher-exam/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
  exams:     { id: 'exams.id', userId: 'exams.userId' },
  questions: { id: 'questions.id', examId: 'questions.examId', status: 'questions.status' },
}))

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn((col, val) => ({ op: 'eq', col, val })),
  and: vi.fn((...args) => ({ op: 'and', args })),
}))

import { db } from '@teacher-exam/db'
import { questionsRouter } from '../questions'

function makeChain(result: unknown) {
  const p = Promise.resolve(result)
  const chain: Record<string, unknown> = {
    then:  (p as Promise<unknown>).then.bind(p),
    catch: (p as Promise<unknown>).catch.bind(p),
  }
  for (const m of ['from', 'where', 'orderBy', 'limit', 'set', 'values', 'innerJoin', 'returning']) {
    chain[m] = vi.fn(() => chain)
  }
  return chain
}

const NOW = '2024-01-01T00:00:00.000Z'

const makeQuestionRow = (overrides: Record<string, unknown> = {}) => ({
  id:               'q-1',
  examId:           'exam-1',
  number:           1,
  text:             'Question text',
  optionA:          'A',
  optionB:          'B',
  optionC:          'C',
  optionD:          'D',
  correctAnswer:    'a',
  topic:            null,
  difficulty:       null,
  status:           'pending',
  validationStatus: null,
  validationReason: null,
  createdAt:        new Date(NOW),
  ...overrides,
})

function buildTestApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user-id')
    await next()
  })
  app.route('/api/questions', questionsRouter)
  return app
}

describe('PATCH /api/questions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 on invalid JSON', async () => {
    const app = buildTestApp()
    const res = await app.request('/api/questions/q-1', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    'not-json',
    })
    expect(res.status).toBe(400)
  })

  it('returns 422 on invalid body (bad status value)', async () => {
    const app = buildTestApp()
    const res = await app.request('/api/questions/q-1', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'bogus-value' }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 422 when body has no recognized fields', async () => {
    const app = buildTestApp()
    const res = await app.request('/api/questions/q-1', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(422)
  })

  it('returns 404 when question not found or belongs to another user', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))  // ownership JOIN returns nothing
    const app = buildTestApp()
    const res = await app.request('/api/questions/q-1', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'accepted' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 200 with updated question on success', async () => {
    const questionRow = makeQuestionRow({ status: 'accepted' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ questionId: 'q-1', examUserId: 'test-user-id' }])  // ownership
      return makeChain([questionRow])  // re-fetch after update
    })

    const updateChain = makeChain([])
    ;(db.update as Mock).mockReturnValue(updateChain)

    const app = buildTestApp()
    const res = await app.request('/api/questions/q-1', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'accepted' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['id']).toBe('q-1')
    expect(body['status']).toBe('accepted')
  })
})
