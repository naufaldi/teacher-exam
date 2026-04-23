import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Hono } from 'hono'

// Mock the DB module before importing the router
vi.mock('@teacher-exam/db', () => {
  return {
    db: {
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      insert: vi.fn(),
    },
    exams: { id: 'exams.id', userId: 'exams.userId', createdAt: 'exams.createdAt' },
    questions: { examId: 'questions.examId', number: 'questions.number' },
  }
})

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ op: 'eq', col, val })),
  and: vi.fn((...args) => ({ op: 'and', args })),
  desc: vi.fn((col) => ({ op: 'desc', col })),
}))

import { db } from '@teacher-exam/db'
import { examsRouter } from '../exams'

// Helper: build a chainable Drizzle mock that resolves to `result`
function makeChain(result: unknown) {
  const p = Promise.resolve(result)
  const chain: Record<string, unknown> = {
    then: (p as Promise<unknown>).then.bind(p),
    catch: (p as Promise<unknown>).catch.bind(p),
  }
  for (const m of ['from', 'where', 'orderBy', 'limit', 'set', 'values', 'returning']) {
    chain[m] = vi.fn(() => chain)
  }
  return chain
}

// Fixed timestamp for testing
const NOW = '2024-01-01T00:00:00.000Z'

const makeExamRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'exam-1',
  userId: 'test-user-id',
  title: 'Test Exam',
  subject: 'bahasa_indonesia',
  grade: 5,
  difficulty: 'mudah',
  topic: 'topic-a',
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
  createdAt: new Date(NOW),
  updatedAt: new Date(NOW),
  ...overrides,
})

const makeQuestionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'q-1',
  examId: 'exam-1',
  number: 1,
  text: 'Question text',
  optionA: 'A',
  optionB: 'B',
  optionC: 'C',
  optionD: 'D',
  correctAnswer: 'a',
  topic: null,
  difficulty: null,
  status: 'pending',
  validationStatus: null,
  validationReason: null,
  createdAt: new Date(NOW),
  ...overrides,
})

function buildTestApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user-id')
    await next()
  })
  app.route('/api/exams', examsRouter)
  return app
}

describe('GET /api/exams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no exams', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp()
    const res = await app.request('/api/exams')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns owned exams list', async () => {
    const examRow = makeExamRow()
    ;(db.select as Mock).mockReturnValue(makeChain([examRow]))
    const app = buildTestApp()
    const res = await app.request('/api/exams')
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(body).toHaveLength(1)
    expect((body[0] as Record<string, unknown>)['id']).toBe('exam-1')
    expect((body[0] as Record<string, unknown>)['createdAt']).toBe(NOW)
  })
})

describe('GET /api/exams/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 for unknown exam id', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp()
    const res = await app.request('/api/exams/unknown-id')
    expect(res.status).toBe(404)
  })

  it('returns 404 for exam owned by a different user', async () => {
    // Return no rows (query includes userId in WHERE, so wrong owner = no row)
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-999')
    expect(res.status).toBe(404)
  })

  it('returns exam with questions for valid owned exam', async () => {
    const examRow = makeExamRow()
    const questionRow = makeQuestionRow()
    // First select call → exam rows; second select call → question rows
    let callCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([examRow])
      return makeChain([questionRow])
    })
    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['id']).toBe('exam-1')
    expect(Array.isArray(body['questions'])).toBe(true)
    expect((body['questions'] as unknown[]).length).toBe(1)
  })
})

describe('PATCH /api/exams/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when exam not found', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp()
    const res = await app.request('/api/exams/no-exam', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New title' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 422 for invalid body', async () => {
    const examRow = makeExamRow()
    ;(db.select as Mock).mockReturnValue(makeChain([examRow]))
    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid-status-value' }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 400 on invalid JSON', async () => {
    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    expect(res.status).toBe(400)
  })

  it('updates exam and returns ExamWithQuestions on success', async () => {
    const examRow = makeExamRow()
    const updatedExamRow = makeExamRow({ title: 'Updated title' })
    const questionRow = makeQuestionRow()

    let callCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      callCount++
      // 1: ownership check; 2: fetch updated exam; 3: fetch questions
      if (callCount === 1) return makeChain([examRow])
      if (callCount === 2) return makeChain([updatedExamRow])
      return makeChain([questionRow])
    })

    const updateChain = makeChain([])
    ;(db.update as Mock).mockReturnValue(updateChain)

    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated title' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['title']).toBe('Updated title')
    expect(Array.isArray(body['questions'])).toBe(true)
  })
})

describe('DELETE /api/exams/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when exam not found', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp()
    const res = await app.request('/api/exams/no-exam', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('returns 204 on successful delete', async () => {
    const examRow = makeExamRow()
    ;(db.select as Mock).mockReturnValue(makeChain([examRow]))
    const deleteChain = makeChain([])
    ;(db.delete as Mock).mockReturnValue(deleteChain)

    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1', { method: 'DELETE' })
    expect(res.status).toBe(204)
  })
})

describe('POST /api/exams/:id/duplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when exam not found', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp()
    const res = await app.request('/api/exams/no-exam/duplicate', { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('returns 201 with cloned exam and questions', async () => {
    const examRow = makeExamRow()
    const questionRow = makeQuestionRow()

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      // 1: ownership check exam; 2: questions for source; 3: new exam fetch; 4: new questions
      if (selectCount === 1) return makeChain([examRow])
      if (selectCount === 2) return makeChain([questionRow])
      if (selectCount === 3) return makeChain([{ ...examRow, id: 'new-exam-id', status: 'draft' }])
      return makeChain([{ ...questionRow, id: 'new-q-id', examId: 'new-exam-id' }])
    })

    const insertChain = makeChain([])
    ;(db.insert as Mock).mockReturnValue(insertChain)

    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1/duplicate', { method: 'POST' })
    expect(res.status).toBe(201)
    const body = await res.json() as Record<string, unknown>
    expect(body['id']).toBe('new-exam-id')
    expect(body['status']).toBe('draft')
    expect(Array.isArray(body['questions'])).toBe(true)
  })
})
