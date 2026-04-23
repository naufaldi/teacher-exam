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

function makeChain(result: unknown) {
  const p = Promise.resolve(result)
  const chain: Record<string, unknown> = {
    then: (p as Promise<unknown>).then.bind(p),
    catch: (p as Promise<unknown>).catch.bind(p),
  }
  for (const m of ['from', 'where', 'orderBy', 'limit', 'values', 'returning']) {
    chain[m] = vi.fn(() => chain)
  }
  return chain
}

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
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  }
}

function makeQuestionRow(n: number, examId = 'exam-gen-1') {
  return {
    id: `q-${n}`,
    examId,
    number: n,
    text: `Question ${n}`,
    optionA: 'Option A',
    optionB: 'Option B',
    optionC: 'Option C',
    optionD: 'Option D',
    correctAnswer: 'a',
    topic: 'Teks Narasi',
    difficulty: 'sedang',
    status: 'pending',
    validationStatus: null,
    validationReason: null,
    createdAt: new Date(NOW),
  }
}

const VALID_BODY = {
  subject: 'bahasa_indonesia',
  grade: 6,
  difficulty: 'sedang',
  topic: 'Teks Narasi',
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
    const questionRows = Array.from({ length: 20 }, (_, i) => makeQuestionRow(i + 1))

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
})
