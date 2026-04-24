import { describe, expect, it } from 'vitest'
import { Schema, Either } from 'effect'
import { GenerateExamInputSchema } from '../api.js'

const VALID_BASE = {
  subject: 'bahasa_indonesia',
  grade: 6,
  difficulty: 'campuran',
  topics: ['Teks Narasi'],
  reviewMode: 'fast',
} as const

describe('GenerateExamInputSchema.topics', () => {
  it('accepts 1 topic', () => {
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(VALID_BASE)
    expect(Either.isRight(result)).toBe(true)
  })

  it('accepts up to 5 topics', () => {
    const input = { ...VALID_BASE, topics: ['A', 'B', 'C', 'D', 'E'] }
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(input)
    expect(Either.isRight(result)).toBe(true)
  })

  it('rejects empty topics array', () => {
    const input = { ...VALID_BASE, topics: [] }
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(input)
    expect(Either.isLeft(result)).toBe(true)
  })

  it('rejects more than 5 topics', () => {
    const input = { ...VALID_BASE, topics: ['A', 'B', 'C', 'D', 'E', 'F'] }
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(input)
    expect(Either.isLeft(result)).toBe(true)
  })

  it('rejects empty string topics', () => {
    const input = { ...VALID_BASE, topics: ['Valid', ''] }
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(input)
    expect(Either.isLeft(result)).toBe(true)
  })

  it('rejects missing topics field', () => {
    const input = { ...VALID_BASE, topics: undefined }
    const result = Schema.decodeUnknownEither(GenerateExamInputSchema)(input)
    expect(Either.isLeft(result)).toBe(true)
  })
})
