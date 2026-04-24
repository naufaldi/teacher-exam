import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Hono } from 'hono'
import { Schema, Either } from 'effect'
import { QuestionSchema } from '@teacher-exam/shared'

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
import { makeChain, makeQuestionRow } from './helpers'

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

  it('returns questions with correct _tag for mixed row types (mcq_single, mcq_multi, true_false)', async () => {
    const examRow = makeExamRow()
    const mcqSingleRow = makeQuestionRow({
      id: 'q-1',
      number: 1,
      type: 'mcq_single',
      payload: null,
      optionA: 'Option A',
      optionB: 'Option B',
      optionC: 'Option C',
      optionD: 'Option D',
      correctAnswer: 'a',
    })
    const mcqMultiRow = makeQuestionRow({
      id: 'q-2',
      number: 2,
      type: 'mcq_multi',
      payload: {
        options: { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' },
        correct: ['a', 'c'],
      },
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: null,
    })
    const trueFalseRow = makeQuestionRow({
      id: 'q-3',
      number: 3,
      type: 'true_false',
      payload: {
        statements: [
          { text: 'Pernyataan pertama', answer: true },
          { text: 'Pernyataan kedua', answer: false },
          { text: 'Pernyataan ketiga', answer: true },
        ],
      },
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: null,
    })

    let callCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([examRow])
      return makeChain([mcqSingleRow, mcqMultiRow, trueFalseRow])
    })

    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    const qs = body['questions'] as Array<Record<string, unknown>>
    expect(qs).toHaveLength(3)
    expect(qs[0]?.['_tag']).toBe('mcq_single')
    expect(qs[1]?.['_tag']).toBe('mcq_multi')
    expect(qs[2]?.['_tag']).toBe('true_false')
  })

  it('GET /api/exams/:id questions decode successfully with QuestionSchema', async () => {
    const examRow = makeExamRow()
    const mcqSingleRow = makeQuestionRow({
      id: 'q-1',
      number: 1,
      type: 'mcq_single',
      payload: null,
      optionA: 'Option A',
      optionB: 'Option B',
      optionC: 'Option C',
      optionD: 'Option D',
      correctAnswer: 'a',
    })
    const mcqMultiRow = makeQuestionRow({
      id: 'q-2',
      number: 2,
      type: 'mcq_multi',
      payload: {
        options: { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' },
        correct: ['a', 'c'],
      },
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: null,
    })
    const trueFalseRow = makeQuestionRow({
      id: 'q-3',
      number: 3,
      type: 'true_false',
      payload: {
        statements: [
          { text: 'Pernyataan pertama', answer: true },
          { text: 'Pernyataan kedua', answer: false },
          { text: 'Pernyataan ketiga', answer: true },
        ],
      },
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: null,
    })

    let callCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([examRow])
      return makeChain([mcqSingleRow, mcqMultiRow, trueFalseRow])
    })

    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>

    const decodeResult = Schema.decodeUnknownEither(Schema.Array(QuestionSchema))(body['questions'])
    expect(Either.isRight(decodeResult)).toBe(true)
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

  it('uses formatExamTitle for the cloned title, not the source verbatim title', async () => {
    const examRow = makeExamRow({
      title: 'Test Exam',
      subject: 'bahasa_indonesia',
      grade: 5,
      examType: 'formatif',
      examDate: null,
      topic: 'Ide Pokok',
    })
    const questionRow = makeQuestionRow()

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      if (selectCount === 2) return makeChain([questionRow])
      if (selectCount === 3) return makeChain([{ ...examRow, id: 'new-exam-id', status: 'draft' }])
      return makeChain([{ ...questionRow, id: 'new-q-id', examId: 'new-exam-id' }])
    })

    const insertedValues: unknown[] = []
    ;(db.insert as Mock).mockImplementation(() => {
      const chain = makeChain([])
      ;(chain['values'] as ReturnType<typeof vi.fn>).mockImplementation((vals: unknown) => {
        insertedValues.push(vals)
        return chain
      })
      return chain
    })

    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1/duplicate', { method: 'POST' })
    expect(res.status).toBe(201)

    // The first insert is the exam row — its title must NOT be the source verbatim title
    const examInsert = insertedValues[0] as Record<string, unknown>
    expect(examInsert['title']).not.toBe('Test Exam')
    expect(examInsert['title']).toBe('Bahasa Indonesia / Kelas 5 / formatif')
  })
})

describe('POST /api/exams/:id/finalize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 for non-existent or unowned exam', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp()
    const res = await app.request('/api/exams/no-exam/finalize', { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('returns 422 when exam has no questions', async () => {
    const examRow = makeExamRow()

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])  // ownership check
      return makeChain([])                                // no questions
    })

    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1/finalize', { method: 'POST' })
    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body['code']).toBe('FINALIZE_NOT_ALLOWED')
  })

  it('returns 422 when any question is pending or rejected in slow mode', async () => {
    const examRow = makeExamRow({ reviewMode: 'slow' })
    // 19 accepted + 1 pending
    const acceptedQ = makeQuestionRow({ status: 'accepted' })
    const pendingQ  = makeQuestionRow({ id: 'q-pending', status: 'pending' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])     // ownership check
      return makeChain([acceptedQ, pendingQ])                // questions select
    })

    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1/finalize', { method: 'POST' })
    expect(res.status).toBe(422)
    const body = await res.json() as Record<string, unknown>
    expect(body['code']).toBe('FINALIZE_NOT_ALLOWED')
    const details = body['details'] as Record<string, unknown>
    expect(details['pendingCount']).toBe(1)
    expect(details['rejectedCount']).toBe(0)
  })

  it('auto-accepts pending questions and finalizes when exam reviewMode is fast', async () => {
    const examRow      = makeExamRow({ reviewMode: 'fast' })
    const pendingQ     = makeQuestionRow({ status: 'pending' })
    const finalExamRow = makeExamRow({ status: 'final', reviewMode: 'fast' })
    const acceptedQ    = makeQuestionRow({ status: 'accepted' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])      // ownership check
      if (selectCount === 2) return makeChain([pendingQ])     // questions
      if (selectCount === 3) return makeChain([finalExamRow]) // fetchExamWithQuestions → exam
      return makeChain([acceptedQ])                           // fetchExamWithQuestions → questions
    })

    const updateChain = makeChain([])
    ;(db.update as Mock).mockReturnValue(updateChain)

    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1/finalize', { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['status']).toBe('final')
    // db.update called twice: once to auto-accept questions, once to set exam status=final
    expect(db.update).toHaveBeenCalledTimes(2)
  })

  it('returns 200 with status=final when all questions accepted', async () => {
    const examRow        = makeExamRow()
    const finalExamRow   = makeExamRow({ status: 'final' })
    const acceptedQ      = makeQuestionRow({ status: 'accepted' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])       // ownership check
      if (selectCount === 2) return makeChain([acceptedQ])     // questions — all accepted
      if (selectCount === 3) return makeChain([finalExamRow])  // fetchExamWithQuestions → exam
      return makeChain([acceptedQ])                            // fetchExamWithQuestions → questions
    })

    const updateChain = makeChain([])
    ;(db.update as Mock).mockReturnValue(updateChain)

    const app = buildTestApp()
    const res = await app.request('/api/exams/exam-1/finalize', { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['status']).toBe('final')
    expect(Array.isArray(body['questions'])).toBe(true)
  })
})
