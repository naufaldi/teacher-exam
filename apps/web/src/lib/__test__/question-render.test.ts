import { describe, test, expect, vi } from 'vitest'
import { matchQuestion, questionCorrectLabel } from '../question-render'
import type { Question } from '@teacher-exam/shared'

const baseFields = {
  id: 'q_1',
  examId: 'exam_1',
  number: 1,
  text: 'Sample question text' as const,
  topic: null,
  difficulty: null,
  status: 'pending' as const,
  validationStatus: null,
  validationReason: null,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const mcqSingleQ: Question = {
  _tag: 'mcq_single',
  ...baseFields,
  options: {
    a: 'Option A' as const,
    b: 'Option B' as const,
    c: 'Option C' as const,
    d: 'Option D' as const,
  },
  correct: 'b',
}

const mcqMultiQ: Question = {
  _tag: 'mcq_multi',
  ...baseFields,
  options: {
    a: 'Option A' as const,
    b: 'Option B' as const,
    c: 'Option C' as const,
    d: 'Option D' as const,
  },
  correct: ['a', 'c'],
}

const trueFalseQ: Question = {
  _tag: 'true_false',
  ...baseFields,
  statements: [
    { text: 'Statement 1' as const, answer: true },
    { text: 'Statement 2' as const, answer: false },
    { text: 'Statement 3' as const, answer: true },
  ],
}

describe('questionCorrectLabel', () => {
  test('mcq_single: returns uppercased correct letter', () => {
    expect(questionCorrectLabel(mcqSingleQ)).toBe('B')
  })

  test('mcq_multi: returns uppercased correct letters joined by ", "', () => {
    expect(questionCorrectLabel(mcqMultiQ)).toBe('A, C')
  })

  test('true_false: returns B/S labels for each statement answer', () => {
    expect(questionCorrectLabel(trueFalseQ)).toBe('B, S, B')
  })
})

describe('matchQuestion', () => {
  test('dispatches to the correct handler based on question _tag', () => {
    const handlers = {
      mcq_single: vi.fn().mockReturnValue('single'),
      mcq_multi: vi.fn().mockReturnValue('multi'),
      true_false: vi.fn().mockReturnValue('tf'),
    }

    const result1 = matchQuestion(mcqSingleQ, handlers)
    expect(result1).toBe('single')
    expect(handlers.mcq_single).toHaveBeenCalledTimes(1)
    expect(handlers.mcq_single).toHaveBeenCalledWith(mcqSingleQ)
    expect(handlers.mcq_multi).not.toHaveBeenCalled()
    expect(handlers.true_false).not.toHaveBeenCalled()

    vi.clearAllMocks()

    const result2 = matchQuestion(mcqMultiQ, handlers)
    expect(result2).toBe('multi')
    expect(handlers.mcq_multi).toHaveBeenCalledTimes(1)
    expect(handlers.mcq_multi).toHaveBeenCalledWith(mcqMultiQ)
    expect(handlers.mcq_single).not.toHaveBeenCalled()
    expect(handlers.true_false).not.toHaveBeenCalled()

    vi.clearAllMocks()

    const result3 = matchQuestion(trueFalseQ, handlers)
    expect(result3).toBe('tf')
    expect(handlers.true_false).toHaveBeenCalledTimes(1)
    expect(handlers.true_false).toHaveBeenCalledWith(trueFalseQ)
    expect(handlers.mcq_single).not.toHaveBeenCalled()
    expect(handlers.mcq_multi).not.toHaveBeenCalled()
  })
})
