import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Hono } from 'hono'
import { Schema, Either } from 'effect'
import { QuestionSchema } from '@teacher-exam/shared'

// Mock the DB module before importing the router
vi.mock('@teacher-exam/db', () => {
  return {
    db: {
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      insert: vi.fn(),
    },
    exams: {
      id: 'exams.id',
      userId: 'exams.userId',
      createdAt: 'exams.createdAt',
      isPublic: 'exams.isPublic',
      publicShareSlug: 'exams.publicShareSlug',
    },
    questions: { examId: 'questions.examId', number: 'questions.number' },
  }
})

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ op: 'eq', col, val })),
  and: vi.fn((...args) => ({ op: 'and', args })),
  desc: vi.fn((col) => ({ op: 'desc', col })),
}))

import { db } from '@teacher-exam/db'
import { examsRouter } from '../../exams.js'
import { makeChain, makeQuestionRow } from '../helpers.js'

// Fixed timestamp for testing
const NOW = '2024-01-01T00:00:00.000Z'

const makeExamRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'exam-1',
  userId: 'test-user-id',
  title: 'Test Exam',
  subject: 'bahasa_indonesia',
  grade: 5,
  difficulty: 'mudah',
  topics: ['topic-a'],
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
  isPublic: false,
  publicShareSlug: null,
  publishedAt: null,
  createdAt: new Date(NOW),
  updatedAt: new Date(NOW),
  ...overrides,
})

function buildTestApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user-id')
    await next()
  })
  app.route('/api/exams', examsRouter)
  return app
}

export { buildTestApp, makeExamRow, NOW }
