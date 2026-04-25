import { describe, expect, it, test } from 'vitest'
import { Schema, Either } from 'effect'
import { QuestionSchema, GeneratedQuestionSchema, ExamSchema } from '../entities.js'

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
  test("rejects correct: ['a','a'] (duplicate letters)", () => {
    const result = Schema.decodeUnknownEither(QuestionSchema)({
      ...baseQuestion, _tag: 'mcq_multi',
      options: { a: 'x', b: 'y', c: 'z', d: 'w' }, correct: ['a', 'a'],
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
  test("rejects 5 statements (above max 4)", () => {
    const result = Schema.decodeUnknownEither(QuestionSchema)({
      ...baseQuestion, _tag: 'true_false',
      statements: [
        { text: 'p1', answer: true }, { text: 'p2', answer: false },
        { text: 'p3', answer: true }, { text: 'p4', answer: false },
        { text: 'p5', answer: true },
      ],
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

describe('QuestionSchema — unknown _tag', () => {
  test("rejects unknown _tag 'short_answer'", () => {
    const result = Schema.decodeUnknownEither(QuestionSchema)({
      ...baseQuestion, _tag: 'short_answer',
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

const VALID_EXAM = {
  id: 'exam-1',
  userId: 'user-1',
  title: 'Test Exam',
  subject: 'bahasa_indonesia',
  grade: 6,
  difficulty: 'campuran',
  topics: ['Teks Narasi', 'Puisi'],
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
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as const

describe('ExamSchema.topics', () => {
  it('decodes topics as string array', () => {
    const result = Schema.decodeUnknownEither(ExamSchema)(VALID_EXAM)
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.topics).toEqual(['Teks Narasi', 'Puisi'])
    }
  })

  it('rejects exam without topics array', () => {
    const bad = { ...VALID_EXAM, topics: undefined }
    const result = Schema.decodeUnknownEither(ExamSchema)(bad)
    expect(Either.isLeft(result)).toBe(true)
  })
})
