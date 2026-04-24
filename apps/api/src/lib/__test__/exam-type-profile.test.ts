import { describe, expect, test } from 'vitest'
import { EXAM_TYPE_PROFILE, rescaleDifficultyDist } from '../exam-type-profile'

describe('EXAM_TYPE_PROFILE.defaultTotalSoal', () => {
  test('latihan defaults to 20', () => {
    expect(EXAM_TYPE_PROFILE['latihan'].defaultTotalSoal).toBe(20)
  })
  test('formatif defaults to 20', () => {
    expect(EXAM_TYPE_PROFILE['formatif'].defaultTotalSoal).toBe(20)
  })
  test('sts defaults to 25', () => {
    expect(EXAM_TYPE_PROFILE['sts'].defaultTotalSoal).toBe(25)
  })
  test('sas defaults to 25', () => {
    expect(EXAM_TYPE_PROFILE['sas'].defaultTotalSoal).toBe(25)
  })
  test('tka defaults to 25', () => {
    expect(EXAM_TYPE_PROFILE['tka'].defaultTotalSoal).toBe(25)
  })
})

describe('rescaleDifficultyDist', () => {
  test('latihan base (8/8/4) at total=20 returns original values', () => {
    const r = rescaleDifficultyDist('latihan', 20)
    expect(r).toEqual({ mudah: 8, sedang: 8, sulit: 4 })
  })
  test('rescale latihan to 25 — sum equals 25', () => {
    const r = rescaleDifficultyDist('latihan', 25)
    expect(r.mudah + r.sedang + r.sulit).toBe(25)
  })
  test('rescale tka to 30 — sum equals 30', () => {
    const r = rescaleDifficultyDist('tka', 30)
    expect(r.mudah + r.sedang + r.sulit).toBe(30)
  })
  test('rescale sas to 5 — sum equals 5', () => {
    const r = rescaleDifficultyDist('sas', 5)
    expect(r.mudah + r.sedang + r.sulit).toBe(5)
  })
  test('rescale sas to 50 — sum equals 50', () => {
    const r = rescaleDifficultyDist('sas', 50)
    expect(r.mudah + r.sedang + r.sulit).toBe(50)
  })
  test('all values are non-negative integers', () => {
    const r = rescaleDifficultyDist('tka', 7)
    expect(Number.isInteger(r.mudah)).toBe(true)
    expect(Number.isInteger(r.sedang)).toBe(true)
    expect(Number.isInteger(r.sulit)).toBe(true)
    expect(r.mudah).toBeGreaterThanOrEqual(0)
    expect(r.sedang).toBeGreaterThanOrEqual(0)
    expect(r.sulit).toBeGreaterThanOrEqual(0)
  })
  test('rescale tka (3/9/8 at base 20) to 40 — proportional split', () => {
    // tka: mudah=3, sedang=9, sulit=8, baseTotal=20
    // ratios: mudah=0.15, sedang=0.45, sulit=0.40
    // at 40: mudah=round(6)=6, sedang=round(18)=18, sulit=40-6-18=16
    const r = rescaleDifficultyDist('tka', 40)
    expect(r.mudah).toBe(6)
    expect(r.sedang).toBe(18)
    expect(r.sulit).toBe(16)
  })
  test('identity: rescale each jenis to base-20 returns difficultyDist exactly', () => {
    // difficultyDist for all types sums to 20 (legacy lembar baseline).
    // Rescaling back to 20 must reproduce the stored values exactly.
    const types = ['latihan', 'formatif', 'sts', 'sas', 'tka'] as const
    for (const type of types) {
      const profile = EXAM_TYPE_PROFILE[type]
      const r = rescaleDifficultyDist(type, 20)
      expect(r).toEqual(profile.difficultyDist)
    }
  })
})
