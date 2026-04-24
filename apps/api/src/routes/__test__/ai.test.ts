import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Hono } from 'hono'
import { AiGenerationError, type AiService, type GeneratedQuestion } from '../../services/AiService'

vi.mock('@teacher-exam/db', () => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  }
  return {
    db,
    exams: { id: 'exams.id', userId: 'exams.userId' },
    questions: { examId: 'questions.examId', number: 'questions.number' },
  }
})

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ op: 'eq', col, val })),
  and: vi.fn((...args) => ({ op: 'and', args })),
  desc: vi.fn((col) => ({ op: 'desc', col })),
}))

vi.mock('../../lib/curriculum', () => ({
  getCurriculumText: vi.fn(async () => 'mock curriculum text'),
}))

vi.mock('../../lib/prompt', () => ({
  buildExamPrompt: vi.fn(() => ({ system: 'mock system', user: 'mock user' })),
}))

import { db } from '@teacher-exam/db'
import { createAiRouter } from '../ai'
import { makeChain, makeQuestionRow } from './helpers.js'

const NOW = '2024-01-01T00:00:00.000Z'

function makeFakeQuestion(n: number): GeneratedQuestion {
  return {
    text: `Question ${n}`,
    option_a: 'Option A',
    option_b: 'Option B',
    option_c: 'Option C',
    option_d: 'Option D',
    correct_answer: 'a',
    topic: 'Teks Narasi',
    difficulty: 'sedang',
  }
}

const FAKE_AI_QUESTIONS: GeneratedQuestion[] = Array.from({ length: 20 }, (_, i) =>
  makeFakeQuestion(i + 1),
)

const fakeAiService: AiService = {
  generate: vi.fn(async () => FAKE_AI_QUESTIONS),
}

function makeExamRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exam-gen-1',
    userId: 'test-user-id',
    title: 'Bahasa Indonesia · Kelas 6 · Teks Narasi',
    subject: 'bahasa_indonesia',
    grade: 6,
    difficulty: 'sedang',
    topics: ['Teks Narasi'],
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
  }
}

const VALID_BODY = {
  subject: 'bahasa_indonesia',
  grade: 6,
  difficulty: 'sedang',
  topics: ['Teks Narasi'],
  reviewMode: 'fast',
  examType: 'formatif',
}

function buildUnauthApp() {
  return new Hono().route('/api/ai', createAiRouter({ aiService: fakeAiService }))
}

function buildTestApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user-id')
    await next()
  })
  app.route('/api/ai', createAiRouter({ aiService: fakeAiService }))
  return app
}

describe('POST /api/ai/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fakeAiService.generate as Mock).mockResolvedValue(FAKE_AI_QUESTIONS)
  })

  it('returns 401 without session', async () => {
    const app = buildUnauthApp()
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid body', async () => {
    const app = buildTestApp()
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'invalid-subject', grade: 6 }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 on invalid JSON', async () => {
    const app = buildTestApp()
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    expect(res.status).toBe(400)
  })

  it('returns 201 with ExamWithQuestions on success', async () => {
    const examRow = makeExamRow()
    const questionRows = Array.from({ length: 20 }, (_, i) =>
      makeQuestionRow({
        id:         `q-${i + 1}`,
        examId:     'exam-gen-1',
        number:     i + 1,
        text:       `Question ${i + 1}`,
        optionA:    'Option A',
        optionB:    'Option B',
        optionC:    'Option C',
        optionD:    'Option D',
        topic:      'Teks Narasi',
        difficulty: 'sedang',
      }),
    )

    const insertChain = makeChain([])
    ;(db.insert as Mock).mockReturnValue(insertChain)
    ;(db.transaction as Mock).mockImplementation(
      async (cb: (tx: typeof db) => Promise<unknown>) => cb(db),
    )

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      return makeChain(questionRows)
    })

    const app = buildTestApp()
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body['id']).toBe('exam-gen-1')
    expect(body['status']).toBe('draft')
    expect(body['title']).toContain('Bahasa Indonesia')
    expect(body['title']).toContain('Kelas 6')
    expect(Array.isArray(body['questions'])).toBe(true)
    expect((body['questions'] as unknown[]).length).toBe(20)
    expect(((body['questions'] as Record<string, unknown>[])[0] ?? {})['number']).toBe(1)
    expect(db.transaction).toHaveBeenCalledOnce()
    expect(db.insert).toHaveBeenCalledTimes(2)
  })

  it('inserts questions with status=accepted when reviewMode is fast', async () => {
    const examRow = makeExamRow({ reviewMode: 'fast' })
    const questionRows = Array.from({ length: 20 }, (_, i) =>
      makeQuestionRow({ id: `q-${i + 1}`, examId: 'exam-gen-1', number: i + 1 }),
    )

    const insertChain = makeChain([])
    ;(db.insert as Mock).mockReturnValue(insertChain)
    ;(db.transaction as Mock).mockImplementation(
      async (cb: (tx: typeof db) => Promise<unknown>) => cb(db),
    )
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      return makeChain(questionRows)
    })

    const app = buildTestApp()
    await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, reviewMode: 'fast' }),
    })

    const insertedQuestions = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as Array<{ status: string }> | undefined
    expect(insertedQuestions).toBeDefined()
    expect(insertedQuestions?.every((q) => q.status === 'accepted')).toBe(true)
  })

  it('inserts questions with status=pending when reviewMode is slow', async () => {
    const examRow = makeExamRow({ reviewMode: 'slow' })
    const questionRows = Array.from({ length: 20 }, (_, i) =>
      makeQuestionRow({ id: `q-${i + 1}`, examId: 'exam-gen-1', number: i + 1, status: 'pending' }),
    )

    const insertChain = makeChain([])
    ;(db.insert as Mock).mockReturnValue(insertChain)
    ;(db.transaction as Mock).mockImplementation(
      async (cb: (tx: typeof db) => Promise<unknown>) => cb(db),
    )
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      return makeChain(questionRows)
    })

    const app = buildTestApp()
    await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, reviewMode: 'slow' }),
    })

    const insertedQuestions = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as Array<{ status: string }> | undefined
    expect(insertedQuestions).toBeDefined()
    expect(insertedQuestions?.every((q) => q.status === 'pending')).toBe(true)
  })

  it('returns 502 and skips DB insert when AiService fails', async () => {
    ;(fakeAiService.generate as Mock).mockRejectedValueOnce(
      new AiGenerationError('Claude failed'),
    )

    const app = buildTestApp()
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    })

    expect(res.status).toBe(502)
    expect(db.transaction).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('uses formatExamTitle unified format for the generated exam title', async () => {
    const examRow = makeExamRow({ examType: 'formatif', examDate: null, topics: ['Teks Narasi'] })
    const questionRows = Array.from({ length: 20 }, (_, i) =>
      makeQuestionRow({ id: `q-${i + 1}`, examId: 'exam-gen-1', number: i + 1 }),
    )

    const insertedValues: unknown[] = []
    ;(db.insert as Mock).mockImplementation(() => {
      const chain = makeChain([])
      ;(chain['values'] as ReturnType<typeof vi.fn>).mockImplementation((vals: unknown) => {
        insertedValues.push(vals)
        return chain
      })
      return chain
    })
    ;(db.transaction as Mock).mockImplementation(
      async (cb: (tx: typeof db) => Promise<unknown>) => cb(db),
    )

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      return makeChain(questionRows)
    })

    const app = buildTestApp()
    await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    })

    const examInsert = insertedValues[0] as Record<string, unknown>
    // Must be unified format, NOT the old "· Kelas ·" format
    expect(examInsert['title']).not.toContain('·')
    expect(examInsert['title']).toBe('Bahasa Indonesia / Kelas 6 / formatif')
  })
})

describe('POST /api/ai/generate — multi-topic', () => {
  it('accepts topics array and returns 201', async () => {
    const insertChain = makeChain([])
    ;(db.insert as Mock).mockReturnValue(insertChain)
    ;(db.transaction as Mock).mockImplementation(
      async (cb: (tx: typeof db) => Promise<unknown>) => cb(db),
    )

    const examRow = makeExamRow({ topics: ['Teks Narasi', 'Puisi'] })
    const questionRows = Array.from({ length: 20 }, (_, i) =>
      makeQuestionRow({ id: `q-${i + 1}`, examId: 'exam-gen-1', number: i + 1 }),
    )
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      return makeChain(questionRows)
    })

    const app = new Hono()
    app.use('*', async (c, next) => { c.set('userId', 'test-user-id'); await next() })
    app.route('/api/ai', createAiRouter({ aiService: fakeAiService }))

    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'bahasa_indonesia',
        grade: 6,
        difficulty: 'campuran',
        topics: ['Teks Narasi', 'Puisi'],
        reviewMode: 'fast',
        examType: 'sas',
      }),
    })

    expect(res.status).toBe(201)
  })

  it('rejects body with old single topic string field', async () => {
    const app = new Hono()
    app.use('*', async (c, next) => { c.set('userId', 'test-user-id'); await next() })
    app.route('/api/ai', createAiRouter({ aiService: fakeAiService }))

    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'bahasa_indonesia',
        grade: 6,
        difficulty: 'campuran',
        topic: 'Teks Narasi',
        reviewMode: 'fast',
      }),
    })

    expect(res.status).toBe(400)
  })
})
