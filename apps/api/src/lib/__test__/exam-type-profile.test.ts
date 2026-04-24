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
})
