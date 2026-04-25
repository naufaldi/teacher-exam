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
  return {
    generate: vi.fn(),
    generateDiscussion: vi.fn(() =>
      opts.fail
        ? Effect.fail(new AiGenerationError({ cause: 'AI error' }))
        : Effect.succeed(opts.discussion ?? FAKE_DISCUSSION_MD),
    ),
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

  it('returns 502 when AI service fails', async () => {
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
    expect(res.status).toBe(502)
  })

  it('generates discussion, persists it, and returns ExamWithQuestions with discussionMd', async () => {
    const finalExam = makeExamRow({ status: 'final' })
    const updatedExam = makeExamRow({ status: 'final', discussionMd: FAKE_DISCUSSION_MD })
    const q = makeQuestionRow({ status: 'accepted' })

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([finalExam])  // ownership + status check
      return makeChain([q])                                  // questions for AI prompt
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

    const body = await res.json() as Record<string, unknown>
    expect(body['discussionMd']).toBe(FAKE_DISCUSSION_MD)

    // Verify update was called with the markdown
    expect(db.update).toHaveBeenCalledOnce()
  })

  it('calls generateDiscussion with system+user built from exam and questions', async () => {
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
    const app = buildTestApp(fakeAiService)
    await app.request('/api/exams/exam-1/discussion', { method: 'POST' })

    expect(fakeAiService.generateDiscussion).toHaveBeenCalledOnce()
    const callArg = (fakeAiService.generateDiscussion as Mock).mock.calls[0]![0] as {
      system: string
      user: string
    }
    expect(typeof callArg.system).toBe('string')
    expect(callArg.system.length).toBeGreaterThan(0)
    expect(callArg.user).toContain('Soal tentang paragraf')
  })
})
