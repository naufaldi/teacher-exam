import { describe, expect, it, vi } from 'vitest'
import { Effect } from 'effect'
import type { Question } from '@teacher-exam/shared'
import { validateQuestionBatch } from '../ValidatorService'
import type { AiService } from './AiService'
import { AiGenerationError } from '../../errors'

function makeQuestion(n: number, overrides: Partial<Question> = {}): Question {
  return {
    id: `q-${n}`,
    examId: 'exam-1',
    number: n,
    text: `Soal ${n}`,
    topic: 'Topik',
    difficulty: 'sedang',
    status: 'pending',
    validationStatus: null,
    validationReason: null,
    figure: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    _tag: 'mcq_single',
    options: { a: 'A', b: 'B', c: 'C', d: 'D' },
    correct: 'a',
    ...overrides,
  } as Question
}

describe('validateQuestionBatch', () => {
  it('merges curriculum validation with existing structural flags', async () => {
    const aiService: AiService = {
      generate: vi.fn(),
      validateCurriculum: vi.fn(() =>
        Effect.succeed([
          { number: 1, status: 'valid', reason: 'Sesuai CP.' },
          { number: 2, status: 'valid', reason: 'Sesuai CP.' },
        ]),
      ),
      generateDiscussion: vi.fn(),
      streamDiscussion: vi.fn(),
    }

    const updates = await validateQuestionBatch({
      aiService,
      exam: { subject: 'bahasa_indonesia', grade: 6, examType: 'formatif' },
      curriculumText: 'corpus',
      questions: [
        makeQuestion(1, { validationStatus: 'needs_review', validationReason: 'LaTeX invalid' }),
        makeQuestion(2),
      ],
    })

    expect(updates).toEqual([
      {
        id: 'q-1',
        validationStatus: 'needs_review',
        validationReason: 'LaTeX invalid\nSesuai CP.',
      },
      {
        id: 'q-2',
        validationStatus: 'valid',
        validationReason: 'Sesuai CP.',
      },
    ])
  })

  it('chunks large batches and respects concurrency limit', async () => {
    const questions = Array.from({ length: 12 }, (_, i) => makeQuestion(i + 1))
    let inFlight = 0
    let maxInFlight = 0

    const aiService: AiService = {
      generate: vi.fn(),
      validateCurriculum: vi.fn(({ expectedCount }) => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        return Effect.gen(function* () {
          yield* Effect.promise(() => new Promise((r) => setTimeout(r, 10)))
          inFlight--
          return Array.from({ length: expectedCount }, (_, i) => ({
            number: i + 1,
            status: 'valid' as const,
            reason: 'ok',
          }))
        })
      }),
      generateDiscussion: vi.fn(),
      streamDiscussion: vi.fn(),
    }

    const updates = await validateQuestionBatch({
      aiService,
      exam: { subject: 'bahasa_indonesia', grade: 6, examType: 'formatif' },
      curriculumText: 'corpus',
      questions,
    })

    expect(updates).toHaveLength(12)
    expect(maxInFlight).toBeLessThanOrEqual(3)
    expect((aiService.validateCurriculum as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3)
  })

  it('falls back to needs_review when a chunk fails', async () => {
    let call = 0
    const aiService: AiService = {
      generate: vi.fn(),
      validateCurriculum: vi.fn(({ expectedCount }) => {
        call++
        if (call === 2) {
          return Effect.fail(new AiGenerationError({ cause: 'timeout' }))
        }
        return Effect.succeed(
          Array.from({ length: expectedCount }, (_, i) => ({
            number: i + 1,
            status: 'valid' as const,
            reason: 'ok',
          })),
        )
      }),
      generateDiscussion: vi.fn(),
      streamDiscussion: vi.fn(),
    }

    const questions = Array.from({ length: 10 }, (_, i) => makeQuestion(i + 1))
    const updates = await validateQuestionBatch({
      aiService,
      exam: { subject: 'bahasa_indonesia', grade: 6, examType: 'formatif' },
      curriculumText: 'corpus',
      questions,
    })

    expect(updates).toHaveLength(10)
    const failedChunk = updates.slice(5, 10)
    expect(failedChunk.every((u) => u.validationStatus === 'needs_review')).toBe(true)
    expect(failedChunk[0]?.validationReason).toContain('Validasi kurikulum gagal')
  })
})
