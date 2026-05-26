import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { Effect, Stream } from 'effect'
import type { AiService, GeneratedQuestion } from '../../../services/AiService.js'

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ op: 'eq', col, val })),
  and: vi.fn((...args) => ({ op: 'and', args })),
  desc: vi.fn((col) => ({ op: 'desc', col })),
}))

vi.mock('../../../lib/prompt.js', () => ({
  buildExamPrompt: vi.fn(() => ({ system: 'mock system', user: 'mock user' })),
}))

import { db } from '@teacher-exam/db'
import { buildExamPrompt } from '../../../lib/prompt.js'
import { makeChain, makeQuestionRow } from '../helpers.js'
import { buildHttpApiTestApp } from '../http-api-setup.js'

const NOW = '2024-01-01T00:00:00.000Z'

function makeFakeQuestion(n: number): GeneratedQuestion {
  return {
    _tag: 'mcq_single',
    number: n,
    text: `Question ${n}`,
    option_a: 'Option A',
    option_b: 'Option B',
    option_c: 'Option C',
    option_d: 'Option D',
    correct_answer: 'a',
    topic: 'Teks Narasi',
    difficulty: 'sedang',
  }
}

const FAKE_AI_QUESTIONS: GeneratedQuestion[] = Array.from({ length: 20 }, (_, i) =>
  makeFakeQuestion(i + 1),
)

function fakeGenerateRawJson(questions: ReadonlyArray<GeneratedQuestion> = FAKE_AI_QUESTIONS) {
  return JSON.stringify(questions)
}

const fakeAiService: AiService = {
  generate: vi.fn(() => Effect.succeed(FAKE_AI_QUESTIONS)),
  generateRaw: vi.fn(() => Effect.succeed(fakeGenerateRawJson())),
  validateCurriculum: vi.fn(({ expectedCount }) =>
    Effect.succeed(
      Array.from({ length: expectedCount }, (_, i) => ({
        number: i + 1,
        status: 'valid' as const,
        reason: 'Sesuai CP.',
      })),
    ),
  ),
  generateDiscussion: vi.fn(),
  streamDiscussion: vi.fn(() => Stream.succeed('')),
}

function makeExamRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exam-gen-1',
    userId: 'test-user-id',
    title: 'Bahasa Indonesia · Kelas 6 · Teks Narasi',
    subject: 'bahasa_indonesia',
    grade: 6,
    difficulty: 'sedang',
    topics: ['Teks Narasi'],
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
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  }
}

const VALID_BODY = {
  subject: 'bahasa_indonesia',
  grade: 6,
  difficulty: 'sedang',
  topics: ['Teks Narasi'],
  reviewMode: 'fast',
  examType: 'formatif',
}

function buildUnauthApp() {
  return buildHttpApiTestApp({ aiService: fakeAiService, authenticated: false })
}

function buildTestApp() {
  return buildHttpApiTestApp({ userId: 'test-user-id', aiService: fakeAiService })
}

export {
  buildTestApp,
  buildUnauthApp,
  fakeAiService,
  fakeGenerateRawJson,
  makeExamRow,
  makeFakeQuestion,
  VALID_BODY,
  FAKE_AI_QUESTIONS,
  db,
  buildExamPrompt,
  makeChain,
  makeQuestionRow,
}
