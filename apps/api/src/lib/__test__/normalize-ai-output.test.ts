import { describe, it, expect } from 'vitest'
import { normalizeGeneratedQuestionItem } from '../normalize-ai-output'

describe('normalizeGeneratedQuestionItem', () => {
  it('lowercases correct_answer', () => {
    const out = normalizeGeneratedQuestionItem({
      _tag: 'mcq_single',
      number: 1,
      text: 'Q',
      option_a: 'A',
      option_b: 'B',
      option_c: 'C',
      option_d: 'D',
      correct_answer: 'B',
      topic: 'T',
      difficulty: 'mudah',
    })
    expect(out).toMatchObject({ correct_answer: 'b' })
  })

  it('maps Benar/Salah statement answers to B/S', () => {
    const out = normalizeGeneratedQuestionItem({
      _tag: 'true_false',
      number: 2,
      text: 'TF',
      topic: 'T',
      difficulty: 'sedang',
      statements: [
        { text: 'p1', answer: 'Benar' },
        { text: 'p2', answer: 'Salah' },
        { text: 'p3', answer: 'B' },
      ],
    })
    expect(out).toMatchObject({
      statements: [{ answer: 'B' }, { answer: 'S' }, { answer: 'B' }],
    })
  })
})
