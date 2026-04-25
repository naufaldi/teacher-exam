import { describe, expect, test } from 'vitest'
import { pointsPerQuestion } from '../points'

describe('pointsPerQuestion', () => {
  test('20 soal → 5 poin (100 total)', () => {
    expect(pointsPerQuestion(20)).toBe(5)
  })

  test('25 soal → 4 poin (100 total)', () => {
    expect(pointsPerQuestion(25)).toBe(4)
  })

  test('50 soal → 2 poin (100 total)', () => {
    expect(pointsPerQuestion(50)).toBe(2)
  })

  test('10 soal → 10 poin (100 total)', () => {
    expect(pointsPerQuestion(10)).toBe(10)
  })

  test('5 soal → 20 poin (100 total)', () => {
    expect(pointsPerQuestion(5)).toBe(20)
  })

  test('returns at least 1 even for very large counts', () => {
    expect(pointsPerQuestion(200)).toBeGreaterThanOrEqual(1)
  })

  test('30 soal → 3 poin (rounds down from 3.33)', () => {
    expect(pointsPerQuestion(30)).toBe(3)
  })
})
