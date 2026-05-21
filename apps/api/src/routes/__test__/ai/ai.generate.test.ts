import './ai-setup.js'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Effect } from 'effect'
import { db } from '@teacher-exam/db'
import { AiGenerationError } from '../../../errors/index.js'
import type { GeneratedQuestion } from '../../../services/AiService.js'
import {
  buildTestApp,
  buildUnauthApp,
  fakeAiService,
  FAKE_AI_QUESTIONS,
  makeExamRow,
  makeFakeQuestion,
  VALID_BODY,
} from './ai-setup.js'
import { makeChain, makeQuestionRow } from '../helpers.js'
describe('POST /api/ai/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fakeAiService.generateRaw as Mock).mockReturnValue(
      Effect.succeed(JSON.stringify(FAKE_AI_QUESTIONS)),
    )
    ;(fakeAiService.validateCurriculum as Mock).mockImplementation(({ expectedCount }: { expectedCount: number }) =>
      Effect.succeed(
        Array.from({ length: expectedCount }, (_, i) => ({
          number: i + 1,
          status: 'valid' as const,
          reason: 'Sesuai CP.',
        })),
      ),
    )
    ;(db.update as Mock).mockReturnValue(makeChain([]))
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

  it('does not run curriculum validation during generate', async () => {
    const examRow = makeExamRow()
    const questionRows = Array.from({ length: 20 }, (_, i) =>
      makeQuestionRow({
        id: `q-${i + 1}`,
        examId: 'exam-gen-1',
        number: i + 1,
        validationStatus: null,
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
    expect(fakeAiService.validateCurriculum as Mock).not.toHaveBeenCalled()
    expect(db.update as Mock).not.toHaveBeenCalled()
    const body = await res.json() as { questions: Array<{ validationStatus: string | null }> }
    expect(body.questions.every((q) => q.validationStatus === null)).toBe(true)
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

  it('strips invalid generated figure and persists a needs_review validation marker', async () => {
    const generatedWithBadFigure: GeneratedQuestion[] = Array.from({ length: 20 }, (_, i) => ({
      ...makeFakeQuestion(i + 1),
      ...(i === 0 ? { figure: { type: 'pentagon', side: 5 } } : {}),
    }))
    ;(fakeAiService.generateRaw as Mock).mockReturnValueOnce(
      Effect.succeed(JSON.stringify(generatedWithBadFigure)),
    )

    const examRow = makeExamRow()
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
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    })

    expect(res.status).toBe(201)
    const insertedQuestions = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as Array<Record<string, unknown>> | undefined
    const firstQuestion = insertedQuestions?.[0]
    expect(firstQuestion?.['payload']).toBeNull()
    expect(firstQuestion?.['validationStatus']).toBe('needs_review')
    expect(firstQuestion?.['validationReason']).toContain('FigureSpec')
  })

  it('retries Matematika generation when LaTeX validation fails', async () => {
    const invalidLatexQuestions: GeneratedQuestion[] = Array.from({ length: 20 }, (_, i) => ({
      ...makeFakeQuestion(i + 1),
      text: i === 0 ? 'Hitung $\\frac{3}{4}' : `Question ${i + 1}`,
    }))
    const validLatexQuestions: GeneratedQuestion[] = Array.from({ length: 20 }, (_, i) => ({
      ...makeFakeQuestion(i + 1),
      text: i === 0 ? 'Hitung $\\frac{3}{4}$' : `Question ${i + 1}`,
    }))
    ;(fakeAiService.generateRaw as Mock)
      .mockReturnValueOnce(Effect.succeed(JSON.stringify(invalidLatexQuestions)))
      .mockReturnValueOnce(Effect.succeed(JSON.stringify(validLatexQuestions)))

    const examRow = makeExamRow({ subject: 'matematika' })
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
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, subject: 'matematika' }),
    })

    expect(res.status).toBe(201)
    expect(fakeAiService.generateRaw as Mock).toHaveBeenCalledTimes(2)
    const insertedQuestions = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as Array<Record<string, unknown>> | undefined
    expect(insertedQuestions?.[0]?.['text']).toBe('Hitung $\\frac{3}{4}$')
    expect(insertedQuestions?.[0]?.['validationStatus']).toBeNull()
  })

  it('normalizes corrupted imes to times when persisting Matematika questions', async () => {
    const imesQuestions: GeneratedQuestion[] = Array.from({ length: 20 }, (_, i) => ({
      ...makeFakeQuestion(i + 1),
      text: i === 0 ? 'Hasil dari $124 imes 36$ adalah ....' : `Question ${i + 1}`,
    }))
    ;(fakeAiService.generateRaw as Mock).mockReturnValue(
      Effect.succeed(JSON.stringify(imesQuestions)),
    )

    const examRow = makeExamRow({ subject: 'matematika' })
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
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, subject: 'matematika' }),
    })

    expect(res.status).toBe(201)
    expect(fakeAiService.generateRaw as Mock).toHaveBeenCalledTimes(3)
    const insertedQuestions = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as Array<Record<string, unknown>> | undefined
    expect(insertedQuestions?.[0]?.['text']).toBe('Hasil dari $124 \\times 36$ adalah ....')
    expect(insertedQuestions?.[0]?.['validationStatus']).toBe('needs_review')
    expect(insertedQuestions?.[0]?.['validationReason']).toContain('imes')
  })

  it('marks Matematika questions as needs_review when LaTeX stays invalid after retries', async () => {
    const invalidLatexQuestions: GeneratedQuestion[] = Array.from({ length: 20 }, (_, i) => ({
      ...makeFakeQuestion(i + 1),
      text: i === 0 ? 'Hitung $\\frac{3}{4}' : `Question ${i + 1}`,
    }))
    ;(fakeAiService.generateRaw as Mock).mockReturnValue(
      Effect.succeed(JSON.stringify(invalidLatexQuestions)),
    )

    const examRow = makeExamRow({ subject: 'matematika' })
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
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, subject: 'matematika' }),
    })

    expect(res.status).toBe(201)
    expect(fakeAiService.generateRaw as Mock).toHaveBeenCalledTimes(3)
    const insertedQuestions = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as Array<Record<string, unknown>> | undefined
    expect(insertedQuestions?.[0]?.['validationStatus']).toBe('needs_review')
    expect(insertedQuestions?.[0]?.['validationReason']).toContain('LaTeX')
  })

  it('retries Matematika generation when JSON parse fails', async () => {
    ;(fakeAiService.generateRaw as Mock)
      .mockReturnValueOnce(Effect.succeed('not json at all'))
      .mockReturnValueOnce(Effect.succeed(JSON.stringify(FAKE_AI_QUESTIONS)))

    const examRow = makeExamRow({ subject: 'matematika' })
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
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_BODY, subject: 'matematika' }),
    })

    expect(res.status).toBe(201)
    expect(fakeAiService.generateRaw as Mock).toHaveBeenCalledTimes(2)
  })


  it('returns 502 and skips DB insert when AiService fails', async () => {
    ;(fakeAiService.generateRaw as Mock).mockReturnValueOnce(
      Effect.fail(new AiGenerationError({ cause: 'Claude failed' })),
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
