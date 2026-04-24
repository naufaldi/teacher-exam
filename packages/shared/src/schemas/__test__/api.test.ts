import { describe, test, expect } from 'vitest'
import { Schema, Either } from 'effect'
import { GenerateExamInputSchema } from '../api.js'

describe('GenerateExamInputSchema — composition', () => {
  const base = {
    subject: 'bahasa_indonesia',
    grade: 5,
    difficulty: 'campuran',
    topic: 'Teks Narasi',
    reviewMode: 'fast',
  }

  test('accepts valid composition', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)({
      ...base,
      composition: { mcqSingle: 15, mcqMulti: 5, trueFalse: 5 },
    })
    expect(Either.isRight(result)).toBe(true)
  })

  test('accepts input without composition', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(base)
    expect(Either.isRight(result)).toBe(true)
  })

  test('rejects negative mcqSingle', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)({
      ...base,
      composition: { mcqSingle: -1, mcqMulti: 5, trueFalse: 5 },
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  test('rejects composition with string values', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)({
      ...base,
      composition: { mcqSingle: 'fifteen', mcqMulti: 5, trueFalse: 5 },
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})
