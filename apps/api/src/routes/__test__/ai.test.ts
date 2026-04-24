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
import { buildExamPrompt } from '../../lib/prompt'
import { createAiRouter } from '../ai'
import { makeChain, makeQuestionRow } from './helpers'

const NOW = '2024-01-01T00:00:00.000Z'

function makeFakeQuestion(n: number): GeneratedQuestion {
  return {
    _tag: 'mcq_single',
    number: n,
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

  describe('totalSoal resolution', () => {
    function setupDbMocks(examType = 'formatif') {
      const examRow = makeExamRow({ examType })
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
    }

    it('uses input.totalSoal when provided (sas, totalSoal: 30)', async () => {
      setupDbMocks('sas')
      const app = buildTestApp()
      await app.request('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_BODY, examType: 'sas', totalSoal: 30 }),
      })
      expect(buildExamPrompt as Mock).toHaveBeenCalledWith(
        expect.objectContaining({ totalSoal: 30 }),
      )
      expect(fakeAiService.generate as Mock).toHaveBeenCalledWith(
        expect.objectContaining({ expectedCount: 30 }),
      )
    })

    it('uses profile defaultTotalSoal when totalSoal omitted (sas → 25)', async () => {
      setupDbMocks('sas')
      const app = buildTestApp()
      await app.request('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_BODY, examType: 'sas' }),
      })
      expect(buildExamPrompt as Mock).toHaveBeenCalledWith(
        expect.objectContaining({ totalSoal: 25 }),
      )
      expect(fakeAiService.generate as Mock).toHaveBeenCalledWith(
        expect.objectContaining({ expectedCount: 25 }),
      )
    })

    it('uses profile defaultTotalSoal when totalSoal omitted (latihan → 20)', async () => {
      setupDbMocks('latihan')
      const app = buildTestApp()
      await app.request('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_BODY, examType: 'latihan' }),
      })
      expect(buildExamPrompt as Mock).toHaveBeenCalledWith(
        expect.objectContaining({ totalSoal: 20 }),
      )
      expect(fakeAiService.generate as Mock).toHaveBeenCalledWith(
        expect.objectContaining({ expectedCount: 20 }),
      )
    })
  })

  describe('POST /api/ai/generate — composition', () => {
    it('resolves composition from profile default when not provided', async () => {
      const app = buildTestApp()
      ;(db.insert as Mock).mockReturnValue(makeChain([]))
      ;(db.transaction as Mock).mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db))

      const examRow = makeExamRow({ examType: 'latihan' })
      const questionRows = Array.from({ length: 20 }, (_, i) =>
        makeQuestionRow({ id: `q-${i + 1}`, examId: 'exam-gen-1', number: i + 1 }),
      )
      let selectCount = 0
      ;(db.select as Mock).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) return makeChain([examRow])
        return makeChain(questionRows)
      })

      // capture what buildExamPrompt was called with
      const buildMock = buildExamPrompt as Mock
      buildMock.mockClear()
      buildMock.mockReturnValue({ system: 'sys', user: 'usr' })

      await app.request('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_BODY, examType: 'latihan' }),
      })

      // latihan default: mcqSingle=20, mcqMulti=0, trueFalse=0
      const callArg = buildMock.mock.calls[0]?.[0] as { composition: { mcqSingle: number; mcqMulti: number; trueFalse: number } }
      expect(callArg?.composition).toEqual({ mcqSingle: 20, mcqMulti: 0, trueFalse: 0 })
    })

    it('resolves sas composition default {15,5,5} when composition not provided', async () => {
      const app = buildTestApp()
      ;(db.insert as Mock).mockReturnValue(makeChain([]))
      ;(db.transaction as Mock).mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db))

      const examRow = makeExamRow({ examType: 'sas' })
      const questionRows = Array.from({ length: 25 }, (_, i) =>
        makeQuestionRow({ id: `q-${i + 1}`, examId: 'exam-gen-1', number: i + 1 }),
      )
      let selectCount = 0
      ;(db.select as Mock).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) return makeChain([examRow])
        return makeChain(questionRows)
      })
      ;(fakeAiService.generate as Mock).mockResolvedValueOnce(
        Array.from({ length: 25 }, (_, i) => makeFakeQuestion(i + 1)),
      )

      const buildMock = buildExamPrompt as Mock
      buildMock.mockClear()
      buildMock.mockReturnValue({ system: 'sys', user: 'usr' })

      await app.request('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_BODY, examType: 'sas' }),
      })

      // sas default: mcqSingle=15, mcqMulti=5, trueFalse=5
      const callArg = buildMock.mock.calls[0]?.[0] as { composition: { mcqSingle: number; mcqMulti: number; trueFalse: number } }
      expect(callArg?.composition).toEqual({ mcqSingle: 15, mcqMulti: 5, trueFalse: 5 })
    })

    it('accepts valid composition override and passes it to buildExamPrompt', async () => {
      const app = buildTestApp()
      ;(db.insert as Mock).mockReturnValue(makeChain([]))
      ;(db.transaction as Mock).mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db))

      const examRow = makeExamRow({ examType: 'sas' })
      const questionRows = Array.from({ length: 25 }, (_, i) =>
        makeQuestionRow({ id: `q-${i + 1}`, examId: 'exam-gen-1', number: i + 1 }),
      )
      let selectCount = 0
      ;(db.select as Mock).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) return makeChain([examRow])
        return makeChain(questionRows)
      })
      ;(fakeAiService.generate as Mock).mockResolvedValueOnce(
        Array.from({ length: 25 }, (_, i) => makeFakeQuestion(i + 1)),
      )

      const buildMock = buildExamPrompt as Mock
      buildMock.mockClear()
      buildMock.mockReturnValue({ system: 'sys', user: 'usr' })

      const res = await app.request('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_BODY,
          examType: 'sas',
          totalSoal: 25,
          composition: { mcqSingle: 10, mcqMulti: 10, trueFalse: 5 },
        }),
      })

      expect(res.status).toBe(201)
      const callArg = buildMock.mock.calls[0]?.[0] as { composition: { mcqSingle: number; mcqMulti: number; trueFalse: number } }
      expect(callArg?.composition).toEqual({ mcqSingle: 10, mcqMulti: 10, trueFalse: 5 })
    })

    it('returns 400 when composition sum !== totalSoal', async () => {
      const app = buildTestApp()
      const res = await app.request('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_BODY,
          totalSoal: 25,
          composition: { mcqSingle: 10, mcqMulti: 10, trueFalse: 10 }, // sum=30, not 25
        }),
      })
      expect(res.status).toBe(400)
    })

    it('persisted mcq_multi row has type=mcq_multi, non-null payload, null legacy columns', async () => {
      const mcqMultiQuestion: GeneratedQuestion = {
        _tag: 'mcq_multi' as const,
        number: 5,
        text: 'Pilih dua jawaban yang benar!',
        option_a: 'A',
        option_b: 'B',
        option_c: 'C',
        option_d: 'D',
        correct_answers: ['a', 'c'],
        topic: 'Test',
        difficulty: 'mudah',
      }
      // Build a 5-question mixed set: 4 mcq_single + 1 mcq_multi (composition {4,1,0})
      const mixedQuestions: GeneratedQuestion[] = [
        makeFakeQuestion(1),
        makeFakeQuestion(2),
        makeFakeQuestion(3),
        makeFakeQuestion(4),
        mcqMultiQuestion,
      ]
      ;(fakeAiService.generate as Mock).mockResolvedValueOnce(mixedQuestions)

      const examRow = makeExamRow({ examType: 'formatif' })
      const questionRows = Array.from({ length: 5 }, (_, i) =>
        makeQuestionRow({ id: `q-${i + 1}`, examId: 'exam-gen-1', number: i + 1 }),
      )
      let selectCount = 0
      ;(db.select as Mock).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) return makeChain([examRow])
        return makeChain(questionRows)
      })

      const insertChain = makeChain([])
      ;(db.insert as Mock).mockReturnValue(insertChain)
      ;(db.transaction as Mock).mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db))

      const app = buildTestApp()
      await app.request('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_BODY, examType: 'formatif', totalSoal: 5, composition: { mcqSingle: 4, mcqMulti: 1, trueFalse: 0 } }),
      })

      // Second call to values() is the questions insert (first is the exam insert)
      const capturedInsertValues = (insertChain['values'] as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as Array<Record<string, unknown>> | undefined
      expect(capturedInsertValues).toBeDefined()
      const mcqMultiRow = capturedInsertValues?.find((r) => r['type'] === 'mcq_multi')
      expect(mcqMultiRow).toBeDefined()
      expect(mcqMultiRow?.['type']).toBe('mcq_multi')
      expect(mcqMultiRow?.['payload']).not.toBeNull()
      expect(mcqMultiRow?.['payload']).toMatchObject({ options: expect.any(Object), correct: expect.any(Array) })
      expect(mcqMultiRow?.['optionA']).toBeNull()
      expect(mcqMultiRow?.['correctAnswer']).toBeNull()
    })
  })

  it('uses formatExamTitle unified format for the generated exam title', async () => {
    const examRow = makeExamRow({ examType: 'formatif', examDate: null, topic: 'Teks Narasi' })
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
