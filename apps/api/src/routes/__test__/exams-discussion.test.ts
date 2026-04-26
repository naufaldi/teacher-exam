import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Hono } from 'hono'
import { Effect } from 'effect'
import type { AiService } from '../../services/AiService'
import { AiGenerationError } from '../../errors'

// Mock DB before importing the router
vi.mock('@teacher-exam/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
  exams:     { id: 'exams.id', userId: 'exams.userId', discussionMd: 'exams.discussionMd' },
  questions: { examId: 'questions.examId', number: 'questions.number' },
}))

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn((col, val) => ({ op: 'eq', col, val })),
  and: vi.fn((...args) => ({ op: 'and', args })),
}))

vi.mock('../../lib/exams-query', () => ({
  fetchExamWithQuestions: vi.fn(),
  toExam: vi.fn((row: unknown) => row),
}))

import { db } from '@teacher-exam/db'
import { fetchExamWithQuestions } from '../../lib/exams-query'
import { createExamsRouter } from '../exams'
import { makeChain, makeExamRow, makeQuestionRow } from './helpers'

const FAKE_DISCUSSION_MD = `## 1. Soal pertama\n**Jawaban Benar: B**\n\nPenjelasan.\n\n**Tip:** Kunci.\n\n---`

function makeFakeAiService(opts: {
  discussion?: string
  fail?: boolean
} = {}): AiService {
  const md = opts.discussion ?? FAKE_DISCUSSION_MD
  return {
    generate: vi.fn(),
    generateDiscussion: vi.fn(() =>
      opts.fail
        ? Effect.fail(new AiGenerationError({ cause: 'AI error' }))
        : Effect.succeed(md),
    ),
    streamDiscussion: opts.fail
      ? async function* () { throw new AiGenerationError({ cause: 'AI error' }) }
      : async function* () { yield md },
  } as unknown as AiService
}

function buildTestApp(aiService: AiService) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user-id')
    await next()
  })
  app.route('/api/exams', createExamsRouter({ aiService }))
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/exams/:id/discussion', () => {
  it('returns 404 when exam does not belong to the user', async () => {
    ;(db.select as Mock).mockImplementation(() => makeChain([]))  // exam not found

    const app = buildTestApp(makeFakeAiService())
    const res = await app.request('/api/exams/exam-1/discussion', { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('returns 400 when exam status is not final', async () => {
    const draftExam = makeExamRow({ status: 'draft' })
    ;(db.select as Mock).mockImplementation(() => makeChain([draftExam]))

    const app = buildTestApp(makeFakeAiService())
    const res = await app.request('/api/exams/exam-1/discussion', { method: 'POST' })
    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body['code']).toBe('EXAM_NOT_FINAL')
  })

  it('returns 409 when discussionMd already exists (one-shot)', async () => {
    const examWithDiscussion = makeExamRow({ status: 'final', discussionMd: 'existing content' })
    ;(db.select as Mock).mockImplementation(() => makeChain([examWithDiscussion]))

    const app = buildTestApp(makeFakeAiService())
    const res = await app.request('/api/exams/exam-1/discussion', { method: 'POST' })
    expect(res.status).toBe(409)
    const body = await res.json() as Record<string, unknown>
    expect(body['code']).toBe('DISCUSSION_ALREADY_EXISTS')
  })

  it('sends SSE error event with non-empty message describing the cause when AI service fails', async () => {
    const finalExam = makeExamRow({ status: 'final' })
    const q = makeQuestionRow({ status: 'accepted' })
    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([finalExam])
      return makeChain([q])
    })

    const app = buildTestApp(makeFakeAiService({ fail: true }))
    const res = await app.request('/api/exams/exam-1/discussion', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const text = await res.text()
    expect(text).toContain('event: error')

    const errMatch = text.match(/event: error\ndata: (.+)/)
    expect(errMatch).not.toBeNull()
    const errPayload = JSON.parse(errMatch![1]!) as { message: string }
    expect(errPayload.message).not.toBe('')
    expect(errPayload.message).toContain('AI error')
  })

  it('streams discussion, persists it, and sends SSE done event with discussionMd', async () => {
    const finalExam = makeExamRow({ status: 'final' })
    const updatedExam = makeExamRow({ status: 'final', discussionMd: FAKE_DISCUSSION_MD })
    const q = makeQuestionRow({ status: 'accepted' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([finalExam])
      return makeChain([q])
    })

    const updateChain = makeChain([])
    ;(db.update as Mock).mockReturnValue(updateChain)
    ;(fetchExamWithQuestions as Mock).mockResolvedValue({
      ...updatedExam,
      questions: [q],
    })

    const app = buildTestApp(makeFakeAiService())
    const res = await app.request('/api/exams/exam-1/discussion', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const text = await res.text()
    expect(text).toContain('event: done')

    const doneMatch = text.match(/event: done\ndata: (.+)/)
    expect(doneMatch).not.toBeNull()
    const done = JSON.parse(doneMatch![1]!) as Record<string, unknown>
    expect(done['discussionMd']).toBe(FAKE_DISCUSSION_MD)
    expect(db.update).toHaveBeenCalledOnce()
  })

  it('calls streamDiscussion with system+user built from exam and questions', async () => {
    const finalExam = makeExamRow({ status: 'final', grade: 6, subject: 'bahasa_indonesia' })
    const q = makeQuestionRow({ status: 'accepted', text: 'Soal tentang paragraf' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([finalExam])
      return makeChain([q])
    })

    const updateChain = makeChain([])
    ;(db.update as Mock).mockReturnValue(updateChain)
    ;(fetchExamWithQuestions as Mock).mockResolvedValue({ ...finalExam, questions: [q] })

    const fakeAiService = makeFakeAiService()
    const streamSpy = vi.spyOn(fakeAiService, 'streamDiscussion')
    const app = buildTestApp(fakeAiService)
    await app.request('/api/exams/exam-1/discussion', { method: 'POST' })

    expect(streamSpy).toHaveBeenCalledOnce()
    const callArg = streamSpy.mock.calls[0]![0] as { system: string; user: string }
    expect(typeof callArg.system).toBe('string')
    expect(callArg.system.length).toBeGreaterThan(0)
    expect(callArg.user).toContain('Soal tentang paragraf')
  })

  it('passes mixed question rows to discussion prompt with complete type-specific data', async () => {
    const finalExam = makeExamRow({ status: 'final', grade: 6, subject: 'bahasa_indonesia' })
    const mcqSingle = makeQuestionRow({
      id: 'q-1',
      number: 1,
      type: 'mcq_single',
      text: 'Apa ide pokok paragraf tersebut?',
      optionA: 'Pilihan A',
      optionB: 'Pilihan B',
      optionC: 'Pilihan C',
      optionD: 'Pilihan D',
      correctAnswer: 'b',
    })
    const mcqMulti = makeQuestionRow({
      id: 'q-2',
      number: 2,
      type: 'mcq_multi',
      text: 'Pilih dua jawaban yang benar.',
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: null,
      payload: {
        options: { a: 'Data', b: 'Cerita utama', c: 'Contoh', d: 'Judul' },
        correct: ['a', 'c'],
      },
    })
    const trueFalse = makeQuestionRow({
      id: 'q-3',
      number: 3,
      type: 'true_false',
      text: 'Tentukan apakah pernyataan berikut benar (B) atau salah (S):',
      optionA: null,
      optionB: null,
      optionC: null,
      optionD: null,
      correctAnswer: null,
      payload: {
        statements: [
          { text: 'Teks eksplanasi menjelaskan fenomena.', answer: true },
          { text: 'Deret penjelas berisi kesimpulan.', answer: false },
          { text: 'Interpretasi adalah bagian akhir.', answer: true },
        ],
      },
    })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([finalExam])
      return makeChain([mcqSingle, mcqMulti, trueFalse])
    })

    ;(db.update as Mock).mockReturnValue(makeChain([]))
    ;(fetchExamWithQuestions as Mock).mockResolvedValue({ ...finalExam, questions: [mcqSingle, mcqMulti, trueFalse] })

    const fakeAiService = makeFakeAiService()
    const streamSpy = vi.spyOn(fakeAiService, 'streamDiscussion')
    const app = buildTestApp(fakeAiService)
    await app.request('/api/exams/exam-1/discussion', { method: 'POST' })

    const callArg = streamSpy.mock.calls[0]![0] as { user: string }
    const promptQuestions = JSON.parse(callArg.user) as Array<Record<string, unknown>>

    expect(promptQuestions[1]).toMatchObject({
      type: 'mcq_multi',
      options: { a: 'Data', c: 'Contoh' },
      correct: ['a', 'c'],
    })
    expect(promptQuestions[2]).toMatchObject({
      type: 'true_false',
      statements: [
        'Teks eksplanasi menjelaskan fenomena.',
        'Deret penjelas berisi kesimpulan.',
        'Interpretasi adalah bagian akhir.',
      ],
      answers: ['B', 'S', 'B'],
    })
    expect(promptQuestions[2]).not.toHaveProperty('optionA')
    expect(promptQuestions[2]).not.toHaveProperty('correctAnswer')
  })
})
