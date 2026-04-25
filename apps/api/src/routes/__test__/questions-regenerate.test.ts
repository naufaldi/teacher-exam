import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Hono } from 'hono'
import { Effect } from 'effect'
import type { AiService, GeneratedQuestion } from '../../services/AiService'
import { AiGenerationError } from '../../errors'

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
  ne:  vi.fn((col, val) => ({ op: 'ne', col, val })),
  and: vi.fn((...args) => ({ op: 'and', args })),
}))

import { db } from '@teacher-exam/db'
import { createQuestionsRouter } from '../questions'
import { makeChain, makeQuestionRow, makeExamRow } from './helpers.js'

function makeGeneratedQuestion(overrides: Partial<Extract<GeneratedQuestion, { _tag: 'mcq_single' }>> = {}): Extract<GeneratedQuestion, { _tag: 'mcq_single' }> {
  return {
    _tag:           'mcq_single',
    number:         1,
    text:           'New question text',
    option_a:       'Option A',
    option_b:       'Option B',
    option_c:       'Option C',
    option_d:       'Option D',
    correct_answer: 'b',
    topic:          'Teks Narasi',
    difficulty:     'sedang',
    ...overrides,
  }
}

function buildTestApp(aiService?: AiService) {
  const router = createQuestionsRouter({ aiService })
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user-id')
    await next()
  })
  app.route('/api/questions', router)
  return app
}

describe('PATCH /api/questions/:id accepts status: pending', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 when status is pending', async () => {
    const questionRow = makeQuestionRow({ status: 'pending' })
    ;(db.select as Mock)
      .mockReturnValueOnce(makeChain([{ questionId: 'q-1', examUserId: 'test-user-id' }]))
      .mockReturnValueOnce(makeChain([questionRow]))
    ;(db.update as Mock).mockReturnValue(makeChain([questionRow]))

    const app = buildTestApp()
    const res = await app.request('/api/questions/q-1', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'pending' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['status']).toBe('pending')
  })
})

describe('POST /api/questions/:id/regenerate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 404 when question belongs to another user', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))  // ownership check returns nothing
    const fakeAi: AiService = { generate: vi.fn() }
    const app = buildTestApp(fakeAi)

    const res = await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(404)
  })

  it('replaces the question row content and resets status to pending', async () => {
    const examRow = makeExamRow()
    const originalRow = makeQuestionRow({ status: 'rejected' })
    const updatedRow = makeQuestionRow({ text: 'New question text', optionB: 'Option B', status: 'pending' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])  // ownership + question
      return makeChain([])  // sibling questions (no others)
    })
    ;(db.update as Mock).mockReturnValue(makeChain([updatedRow]))

    const generated = makeGeneratedQuestion()
    const fakeAi: AiService = { generate: vi.fn(() => Effect.succeed([generated])) }
    const app = buildTestApp(fakeAi)

    const res = await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['id']).toBe('q-1')
    expect(body['status']).toBe('pending')
  })

  it('forwards the hint to the AI service', async () => {
    const examRow = makeExamRow()
    const originalRow = makeQuestionRow({ status: 'rejected' })
    const updatedRow = makeQuestionRow({ status: 'pending' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])
      return makeChain([])
    })
    ;(db.update as Mock).mockReturnValue(makeChain([updatedRow]))

    const generated = makeGeneratedQuestion()
    const fakeAi: AiService = { generate: vi.fn(() => Effect.succeed([generated])) }
    const app = buildTestApp(fakeAi)

    await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ hint: 'fokus ke sila ke-3' }),
    })

    expect(fakeAi.generate).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.stringContaining('fokus ke sila ke-3') }),
    )
  })

  it('returns 502 when AI service throws', async () => {
    const examRow = makeExamRow()
    const originalRow = makeQuestionRow({ status: 'rejected' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([{ question: originalRow, exam: examRow }])
      return makeChain([])
    })

    const fakeAi: AiService = {
      generate: vi.fn(() =>
        Effect.fail(new AiGenerationError({ cause: 'Claude quota exceeded' })),
      ),
    }
    const app = buildTestApp(fakeAi)

    const res = await app.request('/api/questions/q-1/regenerate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    expect(res.status).toBe(502)
  })
})
