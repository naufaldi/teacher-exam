import { describe, expect, it } from 'vitest'
import { Schema, Either } from 'effect'
import { ExamSchema } from '../entities.js'

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
