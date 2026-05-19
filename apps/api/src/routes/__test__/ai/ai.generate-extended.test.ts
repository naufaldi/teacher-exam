import './ai-setup.js'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Effect } from 'effect'
import { Hono } from 'hono'
import { db } from '@teacher-exam/db'
import { buildExamPrompt } from '../../../lib/prompt.js'
import { createAiRouter } from '../../ai.js'
import {
  buildTestApp,
  fakeAiService,
  FAKE_AI_QUESTIONS,
  makeExamRow,
  VALID_BODY,
} from './ai-setup.js'
import { makeChain, makeQuestionRow } from '../helpers.js'

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

describe('POST /api/ai/generate — PRD v3 phase 1 subjects', () => {
  function setupPhase1Mocks(total = 20) {
    const examRow = makeExamRow()
    const questionRows = Array.from({ length: total }, (_, i) =>
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
    return insertChain
  }

  it('calls buildExamPrompt with ipas and getCurriculumText subject', async () => {
    setupPhase1Mocks()
    const buildMock = buildExamPrompt as Mock
    buildMock.mockClear()
    const { getCurriculumText } = await import('../../../lib/curriculum.js')
    const curriculumMock = getCurriculumText as Mock
    curriculumMock.mockClear()

    const app = buildTestApp()
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...VALID_BODY,
        subject: 'ipas',
        grade: 5,
        topics: ['Cahaya dan Bunyi'],
      }),
    })

    expect(res.status).toBe(201)
    expect(curriculumMock).toHaveBeenCalledWith('ipas', 5)
    expect(buildMock).toHaveBeenCalledWith(
      expect.objectContaining({ examSubject: 'ipas', subjectLabel: 'IPAS' }),
    )
  })

  it('calls buildExamPrompt with bahasa_inggris', async () => {
    setupPhase1Mocks()
    const buildMock = buildExamPrompt as Mock
    buildMock.mockClear()

    const app = buildTestApp()
    const res = await app.request('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...VALID_BODY,
        subject: 'bahasa_inggris',
        grade: 6,
        topics: ['Daily Activities'],
      }),
    })

    expect(res.status).toBe(201)
    expect(buildMock).toHaveBeenCalledWith(
      expect.objectContaining({
        examSubject: 'bahasa_inggris',
        subjectLabel: 'Bahasa Inggris',
      }),
    )
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
