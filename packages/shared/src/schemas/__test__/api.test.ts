import { describe, test, expect } from 'vitest'
import { Schema, Either } from 'effect'
import { GenerateExamInputSchema } from '../api.js'

describe('GenerateExamInputSchema — totalSoal', () => {
  const baseInput = {
    subject: 'bahasa_indonesia',
    grade: 5,
    difficulty: 'campuran',
    topic: 'Pecahan',
    reviewMode: 'fast',
  }

  test('accepts valid totalSoal=20', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)({
      ...baseInput,
      totalSoal: 20,
    })
    expect(Either.isRight(result)).toBe(true)
  })

  test('accepts valid totalSoal=50 (max)', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)({
      ...baseInput,
      totalSoal: 50,
    })
    expect(Either.isRight(result)).toBe(true)
  })

  test('accepts valid totalSoal=5 (min)', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)({
      ...baseInput,
      totalSoal: 5,
    })
    expect(Either.isRight(result)).toBe(true)
  })

  test('rejects totalSoal=4 (below min)', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)({
      ...baseInput,
      totalSoal: 4,
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  test('rejects totalSoal=51 (above max)', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)({
      ...baseInput,
      totalSoal: 51,
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  test('accepts input without totalSoal (optional)', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(baseInput)
    expect(Either.isRight(result)).toBe(true)
  })

  test('rejects non-integer totalSoal', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)({
      ...baseInput,
      totalSoal: 20.5,
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})
