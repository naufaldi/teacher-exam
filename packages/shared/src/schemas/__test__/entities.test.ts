import { describe, test, expect } from 'vitest'
import { Schema, Either } from 'effect'
import { QuestionSchema, GeneratedQuestionSchema } from '../entities.js'

const baseQuestion = {
  id: 'q_1', examId: 'e_1', number: 1,
  text: 'Apa ibukota Indonesia?',
  topic: 'Geografi', difficulty: 'mudah',
  status: 'accepted',
  validationStatus: null, validationReason: null,
  createdAt: '2024-01-01',
}

describe('QuestionSchema — mcq_single', () => {
  test('decodes valid mcq_single', () => {
    const result = Schema.decodeUnknownEither(QuestionSchema)({
      ...baseQuestion,
      _tag: 'mcq_single',
      options: { a: 'Jakarta', b: 'Bandung', c: 'Surabaya', d: 'Medan' },
      correct: 'a',
    })
    expect(Either.isRight(result)).toBe(true)
  })
  test('rejects correct letter "e"', () => {
    const result = Schema.decodeUnknownEither(QuestionSchema)({
      ...baseQuestion, _tag: 'mcq_single',
      options: { a: 'x', b: 'y', c: 'z', d: 'w' }, correct: 'e',
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe('QuestionSchema — mcq_multi', () => {
  test('decodes valid mcq_multi', () => {
    const result = Schema.decodeUnknownEither(QuestionSchema)({
      ...baseQuestion, _tag: 'mcq_multi',
      options: { a: 'Jakarta', b: 'Bandung', c: 'Surabaya', d: 'Medan' },
      correct: ['a', 'c'],
    })
    expect(Either.isRight(result)).toBe(true)
  })
  test('rejects single-item correct array', () => {
    const result = Schema.decodeUnknownEither(QuestionSchema)({
      ...baseQuestion, _tag: 'mcq_multi',
      options: { a: 'x', b: 'y', c: 'z', d: 'w' }, correct: ['a'],
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe('QuestionSchema — true_false', () => {
  test('decodes valid true_false with 3 statements', () => {
    const result = Schema.decodeUnknownEither(QuestionSchema)({
      ...baseQuestion, _tag: 'true_false',
      statements: [
        { text: 'Jakarta adalah ibukota', answer: true },
        { text: 'Bali adalah ibukota', answer: false },
        { text: 'Indonesia di Asia', answer: true },
      ],
    })
    expect(Either.isRight(result)).toBe(true)
  })
  test('rejects fewer than 3 statements', () => {
    const result = Schema.decodeUnknownEither(QuestionSchema)({
      ...baseQuestion, _tag: 'true_false',
      statements: [{ text: 'x', answer: true }, { text: 'y', answer: false }],
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe('GeneratedQuestionSchema — mcq_single', () => {
  test('decodes valid ai mcq_single', () => {
    const result = Schema.decodeUnknownEither(GeneratedQuestionSchema)({
      _tag: 'mcq_single', number: 1,
      text: 'Soal?', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D',
      correct_answer: 'b', topic: 'Geografi', difficulty: 'mudah',
    })
    expect(Either.isRight(result)).toBe(true)
  })
})

describe('GeneratedQuestionSchema — mcq_multi', () => {
  test('decodes valid ai mcq_multi', () => {
    const result = Schema.decodeUnknownEither(GeneratedQuestionSchema)({
      _tag: 'mcq_multi', number: 2,
      text: 'Soal multi?', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D',
      correct_answers: ['a', 'c'], topic: 'Sains', difficulty: 'sedang',
    })
    expect(Either.isRight(result)).toBe(true)
  })
})

describe('GeneratedQuestionSchema — true_false', () => {
  test('decodes valid ai true_false', () => {
    const result = Schema.decodeUnknownEither(GeneratedQuestionSchema)({
      _tag: 'true_false', number: 3,
      text: 'Pernyataan berikut?', topic: 'IPS', difficulty: 'sulit',
      statements: [{ text: 'p1', answer: 'B' }, { text: 'p2', answer: 'S' }, { text: 'p3', answer: 'B' }],
    })
    expect(Either.isRight(result)).toBe(true)
  })
  test('rejects true_false with boolean answer (B/S strings required for wire shape)', () => {
    const result = Schema.decodeUnknownEither(GeneratedQuestionSchema)({
      _tag: 'true_false', number: 3,
      text: 'x', topic: 'IPS', difficulty: 'sulit',
      statements: [{ text: 'p1', answer: true }, { text: 'p2', answer: false }, { text: 'p3', answer: true }],
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})
