import { describe, it, expect } from 'vitest'
import type { Exam } from '@teacher-exam/shared'
import { computeStats, computeWeeklyActivity, getRecentSheets } from '../dashboard-selectors.js'

const makeExam = (overrides: Partial<Exam> = {}): Exam => ({
  id: 'exam-1',
  userId: 'user-1',
  title: 'Test Exam',
  subject: 'bahasa_indonesia',
  grade: 5,
  difficulty: 'sedang',
  topics: ['Topik A'],
  reviewMode: 'fast',
  status: 'draft',
  schoolName: null,
  academicYear: null,
  examType: 'formatif',
  examDate: null,
  durationMinutes: 60,
  instructions: null,
  classContext: null,
  discussionMd: null,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  ...overrides,
})

// Fixed reference date: Friday, 2026-04-24 10:00 local (Jakarta +7, but tests run in UTC)
// We use a UTC date so tests are timezone-independent; the selector uses local time.
// For test determinism we pin to a UTC timestamp and test relative logic.
const NOW = new Date('2026-04-24T03:00:00.000Z') // 10am Jakarta = 03:00 UTC

describe('computeStats', () => {
  it('returns zeros for empty list', () => {
    expect(computeStats([])).toEqual({ totalSheets: 0, finalCount: 0, draftCount: 0 })
  })

  it('counts only final exams correctly', () => {
    const exams = [
      makeExam({ id: '1', status: 'final' }),
      makeExam({ id: '2', status: 'final' }),
    ]
    expect(computeStats(exams)).toEqual({ totalSheets: 2, finalCount: 2, draftCount: 0 })
  })

  it('counts only draft exams correctly', () => {
    const exams = [makeExam({ id: '1', status: 'draft' })]
    expect(computeStats(exams)).toEqual({ totalSheets: 1, finalCount: 0, draftCount: 1 })
  })

  it('splits mixed list in a single pass', () => {
    const exams = [
      makeExam({ id: '1', status: 'final' }),
      makeExam({ id: '2', status: 'draft' }),
      makeExam({ id: '3', status: 'draft' }),
      makeExam({ id: '4', status: 'final' }),
      makeExam({ id: '5', status: 'draft' }),
    ]
    expect(computeStats(exams)).toEqual({ totalSheets: 5, finalCount: 2, draftCount: 3 })
  })
})

describe('computeWeeklyActivity', () => {
  it('returns exactly 7 buckets for empty list', () => {
    const result = computeWeeklyActivity([], NOW)
    expect(result).toHaveLength(7)
    expect(result.every((b) => b.count === 0)).toBe(true)
  })

  it('last bucket (today) has variant secondary', () => {
    const result = computeWeeklyActivity([], NOW)
    expect(result[6]?.variant).toBe('secondary')
  })

  it('all other buckets have variant default', () => {
    const result = computeWeeklyActivity([], NOW)
    for (let i = 0; i < 6; i++) {
      expect(result[i]?.variant).toBe('default')
    }
  })

  it('buckets are labelled with Indonesian weekday abbreviations', () => {
    const result = computeWeeklyActivity([], NOW)
    const LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    for (const bucket of result) {
      expect(LABELS).toContain(bucket.day)
    }
  })

  it('counts exams created on the same local day in the correct bucket', () => {
    // NOW is 2026-04-24T03:00Z. In UTC that is still April 24.
    const exam = makeExam({ id: '1', createdAt: '2026-04-24T01:00:00.000Z' })
    const result = computeWeeklyActivity([exam], NOW)
    // The last bucket covers today (April 24 in UTC = same local day as NOW)
    expect(result[6]?.count).toBe(1)
    expect(result.slice(0, 6).every((b) => b.count === 0)).toBe(true)
  })

  it('ignores exams older than 7 days', () => {
    const old = makeExam({ id: '1', createdAt: '2026-04-17T00:00:00.000Z' }) // 7 days before NOW
    const result = computeWeeklyActivity([old], NOW)
    expect(result.every((b) => b.count === 0)).toBe(true)
  })

  it('counts exams in the correct day bucket (6 days ago)', () => {
    // 6 days before NOW (2026-04-24) = 2026-04-18
    const exam = makeExam({ id: '1', createdAt: '2026-04-18T02:00:00.000Z' })
    const result = computeWeeklyActivity([exam], NOW)
    expect(result[0]?.count).toBe(1)
    expect(result.slice(1).every((b) => b.count === 0)).toBe(true)
  })

  it('accumulates multiple exams on the same day', () => {
    const exams = [
      makeExam({ id: '1', createdAt: '2026-04-24T00:30:00.000Z' }),
      makeExam({ id: '2', createdAt: '2026-04-24T01:30:00.000Z' }),
      makeExam({ id: '3', createdAt: '2026-04-24T02:30:00.000Z' }),
    ]
    const result = computeWeeklyActivity(exams, NOW)
    expect(result[6]?.count).toBe(3)
  })
})

describe('getRecentSheets', () => {
  it('returns empty array for empty input', () => {
    expect(getRecentSheets([], 5)).toEqual([])
  })

  it('returns all items when list is shorter than limit', () => {
    const exams = [makeExam({ id: '1' }), makeExam({ id: '2' })]
    expect(getRecentSheets(exams, 5)).toHaveLength(2)
  })

  it('caps at limit', () => {
    const exams = Array.from({ length: 10 }, (_, i) => makeExam({ id: `exam-${i}` }))
    expect(getRecentSheets(exams, 5)).toHaveLength(5)
  })

  it('preserves original order (does not sort)', () => {
    const exams = [
      makeExam({ id: 'a', title: 'First' }),
      makeExam({ id: 'b', title: 'Second' }),
      makeExam({ id: 'c', title: 'Third' }),
    ]
    const result = getRecentSheets(exams, 2)
    expect(result[0]?.title).toBe('First')
    expect(result[1]?.title).toBe('Second')
  })
})
