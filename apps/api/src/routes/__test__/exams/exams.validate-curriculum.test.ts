import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Effect } from 'effect'

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ op: 'eq', col, val })),
  and: vi.fn((...args) => ({ op: 'and', args })),
}))

vi.mock('../../../lib/curriculum.js', () => ({
  getCurriculumText: vi.fn(() => Promise.resolve('# stub curriculum')),
}))

import { db } from '@teacher-exam/db'
import type { AiService } from '../../../services/AiService.js'
import { makeChain, makeQuestionRow } from '../helpers.js'
import { makeExamRow, buildTestApp } from './exams-setup.js'

const fakeAiService = {
  validateCurriculum: vi.fn(),
} as unknown as AiService

describe('POST /api/exams/:id/validate-curriculum', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fakeAiService.validateCurriculum as Mock).mockImplementation(
      ({ expectedCount }: { expectedCount: number }) =>
        Effect.succeed(
          Array.from({ length: expectedCount }, (_, i) => ({
            number: i + 1,
            status: i === 0 ? ('needs_review' as const) : ('valid' as const),
            reason: i === 0 ? 'Level kognitif tinggi.' : 'Sesuai CP.',
          })),
        ),
    )
    ;(db.update as Mock).mockReturnValue(makeChain([]))
  })

  it('returns 404 when exam not found', async () => {
    ;(db.select as Mock).mockReturnValue(makeChain([]))
    const app = buildTestApp({ aiService: fakeAiService })
    const res = await app.request('/api/exams/missing/validate-curriculum', { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('runs validation and returns updated exam', async () => {
    const examRow = makeExamRow()
    const questionRows = Array.from({ length: 3 }, (_, i) =>
      makeQuestionRow({
        id: `q-${i + 1}`,
        examId: 'exam-1',
        number: i + 1,
        validationStatus: null,
      }),
    )
    const validatedRows = questionRows.map((q, i) => ({
      ...q,
      validationStatus: i === 0 ? 'needs_review' : 'valid',
      validationReason: i === 0 ? 'Level kognitif tinggi.' : 'Sesuai CP.',
    }))

    let selectCount = 0
    ;(db.select as Mock).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) return makeChain([examRow])
      if (selectCount === 2) return makeChain(questionRows)
      if (selectCount === 3) return makeChain([examRow])
      return makeChain(validatedRows)
    })

    const app = buildTestApp({ aiService: fakeAiService })
    const res = await app.request('/api/exams/exam-1/validate-curriculum', { method: 'POST' })

    expect(res.status).toBe(200)
    expect(db.update as Mock).toHaveBeenCalled()
    const body = (await res.json()) as { questions: Array<{ validationStatus: string | null }> }
    expect(body.questions[0]?.validationStatus).toBe('needs_review')
    expect(body.questions[1]?.validationStatus).toBe('valid')
  })
})
