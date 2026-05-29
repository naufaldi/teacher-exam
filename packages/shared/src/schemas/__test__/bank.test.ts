import { describe, expect, it } from 'vitest'
import { Schema, Either } from 'effect'
import {
  SaveToBankInputSchema,
  BrowseBankQuerySchema,
  BankQuestionSchema,
  PaginatedBankResponseSchema,
} from '../../schemas/bank.js'

describe('bank schemas', () => {
  it('decodes SaveToBankInput', () => {
    const decoded = Schema.decodeUnknownEither(SaveToBankInputSchema)({
      questionId: 'q-1',
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it('decodes BrowseBankQuery with sort and type filters', () => {
    const decoded = Schema.decodeUnknownEither(BrowseBankQuerySchema)({
      subject: 'ipas',
      grade: 5,
      sort: 'terpopuler',
      type: 'mcq_single',
      page: 1,
      limit: 20,
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it('decodes PaginatedBankResponse', () => {
    const decoded = Schema.decodeUnknownEither(PaginatedBankResponseSchema)({
      data: [
        {
          id: 'bank-1',
          questionId: 'q-1',
          userId: 'user-1',
          subject: 'ipas',
          grade: 5,
          topics: ['Energi'],
          difficulty: 'sedang',
          type: 'mcq_single',
          payload: {},
          isPublic: false,
          usageCount: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          text: 'Soal contoh',
          optionA: 'A',
          optionB: 'B',
          optionC: 'C',
          optionD: 'D',
          correctAnswer: 'a',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.data[0]?.text).toBe('Soal contoh')
    }
  })

  it('decodes BankQuestion with public flag', () => {
    const decoded = Schema.decodeUnknownEither(BankQuestionSchema)({
      id: 'bank-1',
      questionId: 'q-1',
      userId: 'user-1',
      subject: 'ipas',
      grade: 5,
      topics: [],
      difficulty: 'mudah',
      type: 'mcq_single',
      payload: {},
      isPublic: true,
      usageCount: 2,
      createdAt: '2024-01-01T00:00:00.000Z',
      text: 'Publik',
    })
    expect(Either.isRight(decoded)).toBe(true)
  })
})
