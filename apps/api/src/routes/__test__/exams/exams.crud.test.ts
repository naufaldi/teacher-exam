import './exams-setup.js'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Schema, Either } from 'effect'
import { QuestionSchema } from '@teacher-exam/shared'
import { db } from '@teacher-exam/db'
import { buildTestApp, makeExamRow, NOW } from './exams-setup.js'
import { makeChain, makeQuestionRow } from '../helpers.js'
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
      topics: ['Ide Pokok'],
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
