import { describe, test, expect } from 'vitest'
import { rowToQuestion, questionToRow } from '../question-mapper.js'

const baseRow = {
  id: 'q_1',
  examId: 'e_1',
  number: 1,
  text: 'Apa ibukota?',
  topic: 'Geografi',
  difficulty: 'mudah',
  status: 'accepted' as const,
  validationStatus: null,
  validationReason: null,
  createdAt: '2024-01-01T00:00:00Z',
}

describe('rowToQuestion', () => {
  test('maps legacy mcq_single row (payload null, flat options)', () => {
    const result = rowToQuestion({
      ...baseRow,
      type: 'mcq_single',
      optionA: 'Jakarta', optionB: 'Bandung', optionC: 'Surabaya', optionD: 'Medan',
      correctAnswer: 'a',
      payload: null,
    })
    expect(result._tag).toBe('mcq_single')
    if (result._tag === 'mcq_single') {
      expect(result.options.a).toBe('Jakarta')
      expect(result.correct).toBe('a')
    }
  })

  test('maps mcq_multi row (payload present, legacy cols null)', () => {
    const result = rowToQuestion({
      ...baseRow,
      type: 'mcq_multi',
      optionA: null, optionB: null, optionC: null, optionD: null,
      correctAnswer: null,
      payload: {
        options: { a: 'x', b: 'y', c: 'z', d: 'w' },
        correct: ['a', 'c'],
      },
    })
    expect(result._tag).toBe('mcq_multi')
    if (result._tag === 'mcq_multi') {
      expect(result.correct).toEqual(['a', 'c'])
    }
  })

  test('maps true_false row (payload present, no options)', () => {
    const result = rowToQuestion({
      ...baseRow,
      type: 'true_false',
      optionA: null, optionB: null, optionC: null, optionD: null,
      correctAnswer: null,
      payload: {
        statements: [
          { text: 'Jakarta ibukota', answer: true },
          { text: 'Bali ibukota', answer: false },
          { text: 'Indonesia Asia', answer: true },
        ],
      },
    })
    expect(result._tag).toBe('true_false')
    if (result._tag === 'true_false') {
      expect(result.statements).toHaveLength(3)
      expect(result.statements[0]?.answer).toBe(true)
    }
  })
})

describe('questionToRow', () => {
  test('mcq_single writes flat cols, payload null', () => {
    const result = questionToRow({
      _tag: 'mcq_single',
      ...baseRow,
      options: { a: 'Jakarta', b: 'Bandung', c: 'Surabaya', d: 'Medan' },
      correct: 'a',
    })
    expect(result.type).toBe('mcq_single')
    expect(result.optionA).toBe('Jakarta')
    expect(result.correctAnswer).toBe('a')
    expect(result.payload).toBeNull()
  })

  test('mcq_multi writes payload, legacy cols null', () => {
    const result = questionToRow({
      _tag: 'mcq_multi',
      ...baseRow,
      options: { a: 'x', b: 'y', c: 'z', d: 'w' },
      correct: ['a', 'c'],
    })
    expect(result.type).toBe('mcq_multi')
    expect(result.optionA).toBeNull()
    expect(result.correctAnswer).toBeNull()
    expect(result.payload).toEqual({ options: { a: 'x', b: 'y', c: 'z', d: 'w' }, correct: ['a', 'c'] })
  })

  test('true_false writes payload with statements, legacy cols null', () => {
    const result = questionToRow({
      _tag: 'true_false',
      ...baseRow,
      statements: [
        { text: 'p1', answer: true },
        { text: 'p2', answer: false },
        { text: 'p3', answer: true },
      ],
    })
    expect(result.type).toBe('true_false')
    expect(result.optionA).toBeNull()
    expect(result.payload).toEqual({
      statements: [{ text: 'p1', answer: true }, { text: 'p2', answer: false }, { text: 'p3', answer: true }],
    })
  })
})
