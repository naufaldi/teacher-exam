import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { parseGeneratedQuestions } from '../parse-generated-questions'

const validMcq = (n: number) => ({
  _tag: 'mcq_single' as const,
  number: n,
  text: `Soal ${n}`,
  option_a: 'A',
  option_b: 'B',
  option_c: 'C',
  option_d: 'D',
  correct_answer: 'a' as const,
  topic: 'T',
  difficulty: 'mudah',
})

describe('parseGeneratedQuestions', () => {
  it('returns 24 valid + 1 failed + missing slot when one item is invalid', () => {
    const items = Array.from({ length: 25 }, (_, i) => {
      if (i === 24) return { ...validMcq(25), correct_answer: 'z' }
      return validMcq(i + 1)
    })
    const result = parseGeneratedQuestions(JSON.stringify(items), 25)
    expect(Either.isRight(result)).toBe(true)
    if (Either.isLeft(result)) return
    expect(result.right.valid).toHaveLength(24)
    expect(result.right.failed).toHaveLength(1)
    expect(result.right.missingNumbers).toEqual([25])
  })

  it('fails when JSON is not parseable', () => {
    const result = parseGeneratedQuestions('not json', 5)
    expect(Either.isLeft(result)).toBe(true)
  })

  it('repairs unquoted Rupiah option values and returns valid questions', () => {
    const broken =
      '[{"_tag":"mcq_single","number":1,"text":"Berapa harga?","option_a": Rp350.000,"option_b":"B","option_c":"C","option_d":"D","correct_answer":"a","topic":"T","difficulty":"mudah"}]'
    const result = parseGeneratedQuestions(broken, 1)
    expect(Either.isRight(result)).toBe(true)
    if (Either.isLeft(result)) return
    expect(result.right.valid).toHaveLength(1)
    const q = result.right.valid[0]
    expect(q?._tag).toBe('mcq_single')
    if (q?._tag === 'mcq_single') {
      expect(q.option_a).toBe('Rp350.000')
    }
  })

  it('fails when zero items pass schema', () => {
    const result = parseGeneratedQuestions(JSON.stringify([{ bad: true }]), 3)
    expect(Either.isLeft(result)).toBe(true)
  })

  it('reports missing numbers when array is shorter than expectedCount', () => {
    const items = [validMcq(1), validMcq(2)]
    const result = parseGeneratedQuestions(JSON.stringify(items), 5)
    expect(Either.isRight(result)).toBe(true)
    if (Either.isLeft(result)) return
    expect(result.right.valid).toHaveLength(2)
    expect(result.right.missingNumbers).toEqual([3, 4, 5])
  })
})
