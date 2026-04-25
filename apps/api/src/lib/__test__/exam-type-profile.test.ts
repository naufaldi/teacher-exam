import { describe, expect, test } from 'vitest'
import { EXAM_TYPE_PROFILE, rescaleDifficultyDist, resolveComposition } from '../exam-type-profile'

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
  test('rescale tka (4/11/10 at base 25) to 40 — proportional split', () => {
    // tka: mudah=4, sedang=11, sulit=10, baseTotal=25
    // ratios: mudah=0.16, sedang=0.44, sulit=0.40
    // at 40: mudah=round(6.4)=6, sedang=round(17.6)=18, sulit=40-6-18=16
    const r = rescaleDifficultyDist('tka', 40)
    expect(r.mudah).toBe(6)
    expect(r.sedang).toBe(18)
    expect(r.sulit).toBe(16)
  })
  test('identity: rescale each jenis to its own defaultTotalSoal returns difficultyDist exactly', () => {
    // difficultyDist for each type sums to its defaultTotalSoal.
    // Rescaling back to defaultTotalSoal must reproduce the stored values exactly.
    const types = ['latihan', 'formatif', 'sts', 'sas', 'tka'] as const
    for (const type of types) {
      const profile = EXAM_TYPE_PROFILE[type]
      const r = rescaleDifficultyDist(type, profile.defaultTotalSoal)
      expect(r).toEqual(profile.difficultyDist)
    }
  })
})

describe('EXAM_TYPE_PROFILE composition defaults', () => {
  test('latihan composition sums to defaultTotalSoal (20)', () => {
    const p = EXAM_TYPE_PROFILE.latihan
    const { mcqSingle, mcqMulti, trueFalse } = p.composition
    expect(mcqSingle + mcqMulti + trueFalse).toBe(p.defaultTotalSoal)
    expect(mcqSingle).toBe(20)
    expect(mcqMulti).toBe(0)
    expect(trueFalse).toBe(0)
  })

  test('sas composition sums to defaultTotalSoal (25)', () => {
    const p = EXAM_TYPE_PROFILE.sas
    const { mcqSingle, mcqMulti, trueFalse } = p.composition
    expect(mcqSingle + mcqMulti + trueFalse).toBe(p.defaultTotalSoal)
    expect(mcqSingle).toBe(15)
    expect(mcqMulti).toBe(5)
    expect(trueFalse).toBe(5)
  })

  test('all 5 profiles have composition summing to defaultTotalSoal', () => {
    for (const [, profile] of Object.entries(EXAM_TYPE_PROFILE)) {
      const sum = profile.composition.mcqSingle + profile.composition.mcqMulti + profile.composition.trueFalse
      expect(sum).toBe(profile.defaultTotalSoal)
    }
  })
})

describe('resolveComposition', () => {
  test('returns profile default when no override', () => {
    const result = resolveComposition('sas', 25)
    expect(result).toEqual({ mcqSingle: 15, mcqMulti: 5, trueFalse: 5 })
  })

  test('rescales proportionally to different total', () => {
    const result = resolveComposition('sas', 30)
    expect(result.mcqSingle + result.mcqMulti + result.trueFalse).toBe(30)
  })

  test('returns override when sum matches totalSoal', () => {
    const override = { mcqSingle: 10, mcqMulti: 10, trueFalse: 5 }
    const result = resolveComposition('sas', 25, override)
    expect(result).toEqual(override)
  })

  test('throws when override sum !== totalSoal', () => {
    expect(() => resolveComposition('sas', 25, { mcqSingle: 10, mcqMulti: 10, trueFalse: 10 }))
      .toThrow(/25/)
  })
})
