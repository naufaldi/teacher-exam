import { describe, test, expect } from 'vitest'
import { Schema, Either } from 'effect'
import {
  AnswerLetterSchema,
  ExamSubjectSchema,
  MultiAnswerSchema,
  QuestionTypeSchema,
  SUBJECT_LABEL,
} from '../primitives.js'

describe('ExamSubjectSchema', () => {
  test.each([
    ['bahasa_indonesia', 'Bahasa Indonesia'],
    ['pendidikan_pancasila', 'Pendidikan Pancasila'],
    ['ipas', 'IPAS'],
    ['bahasa_inggris', 'Bahasa Inggris'],
    ['matematika', 'Matematika'],
  ])("accepts '%s' and exposes its label", (subject, label) => {
    const result = Schema.decodeUnknownEither(ExamSubjectSchema)(subject)
    expect(Either.isRight(result)).toBe(true)
    expect(SUBJECT_LABEL[subject as keyof typeof SUBJECT_LABEL]).toBe(label)
  })
})

describe('AnswerLetterSchema', () => {
  test("accepts 'a'", () => {
    const result = Schema.decodeUnknownEither(AnswerLetterSchema)('a')
    expect(Either.isRight(result)).toBe(true)
  })

  test("accepts 'b'", () => {
    const result = Schema.decodeUnknownEither(AnswerLetterSchema)('b')
    expect(Either.isRight(result)).toBe(true)
  })

  test("accepts 'c'", () => {
    const result = Schema.decodeUnknownEither(AnswerLetterSchema)('c')
    expect(Either.isRight(result)).toBe(true)
  })

  test("accepts 'd'", () => {
    const result = Schema.decodeUnknownEither(AnswerLetterSchema)('d')
    expect(Either.isRight(result)).toBe(true)
  })

  test("rejects 'e' (out of range)", () => {
    const result = Schema.decodeUnknownEither(AnswerLetterSchema)('e')
    expect(Either.isLeft(result)).toBe(true)
  })

  test("rejects 'A' (case-sensitive)", () => {
    const result = Schema.decodeUnknownEither(AnswerLetterSchema)('A')
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe('MultiAnswerSchema', () => {
  test("accepts ['a','b'] (min 2)", () => {
    const result = Schema.decodeUnknownEither(MultiAnswerSchema)(['a', 'b'])
    expect(Either.isRight(result)).toBe(true)
  })

  test("accepts ['a','b','c'] (max 3)", () => {
    const result = Schema.decodeUnknownEither(MultiAnswerSchema)(['a', 'b', 'c'])
    expect(Either.isRight(result)).toBe(true)
  })

  test("rejects [] (below min 2)", () => {
    const result = Schema.decodeUnknownEither(MultiAnswerSchema)([])
    expect(Either.isLeft(result)).toBe(true)
  })

  test("rejects ['a'] (below min 2)", () => {
    const result = Schema.decodeUnknownEither(MultiAnswerSchema)(['a'])
    expect(Either.isLeft(result)).toBe(true)
  })

  test("rejects ['a','a'] (duplicate letters)", () => {
    const result = Schema.decodeUnknownEither(MultiAnswerSchema)(['a', 'a'])
    expect(Either.isLeft(result)).toBe(true)
  })

  test("rejects ['a','e'] (invalid letter in array)", () => {
    const result = Schema.decodeUnknownEither(MultiAnswerSchema)(['a', 'e'])
    expect(Either.isLeft(result)).toBe(true)
  })

  test("rejects ['a','b','c','d'] (above max 3)", () => {
    const result = Schema.decodeUnknownEither(MultiAnswerSchema)(['a', 'b', 'c', 'd'])
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe('QuestionTypeSchema', () => {
  test("accepts 'mcq_single'", () => {
    const result = Schema.decodeUnknownEither(QuestionTypeSchema)('mcq_single')
    expect(Either.isRight(result)).toBe(true)
  })

  test("accepts 'mcq_multi'", () => {
    const result = Schema.decodeUnknownEither(QuestionTypeSchema)('mcq_multi')
    expect(Either.isRight(result)).toBe(true)
  })

  test("accepts 'true_false'", () => {
    const result = Schema.decodeUnknownEither(QuestionTypeSchema)('true_false')
    expect(Either.isRight(result)).toBe(true)
  })

  test("rejects 'essay'", () => {
    const result = Schema.decodeUnknownEither(QuestionTypeSchema)('essay')
    expect(Either.isLeft(result)).toBe(true)
  })

  test("rejects 'mcq_Single' (case-sensitive)", () => {
    const result = Schema.decodeUnknownEither(QuestionTypeSchema)('mcq_Single')
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe('ExamSubjectSchema', () => {
  test("accepts 'matematika'", () => {
    const result = Schema.decodeUnknownEither(ExamSubjectSchema)('matematika')
    expect(Either.isRight(result)).toBe(true)
  })

  test('labels matematika as Matematika', () => {
    expect((SUBJECT_LABEL as Record<string, string>)['matematika']).toBe('Matematika')
  })
})
