import { describe, expect, it } from 'vitest'
import { buildPembahasanPrompt } from '../pembahasan-prompt'

const FAKE_QUESTIONS = Array.from({ length: 20 }, (_, i) => ({
  number: i + 1,
  text: `Bacalah teks berikut! Soal ${i + 1}`,
  optionA: 'Pilihan A',
  optionB: 'Pilihan B',
  optionC: 'Pilihan C',
  optionD: 'Pilihan D',
  correctAnswer: 'b' as const,
  topic: 'Pemahaman Bacaan',
  difficulty: 'sedang' as const,
}))

const FAKE_EXAM = {
  subject: 'Bahasa Indonesia',
  grade: 6,
  examType: 'tka' as const,
}

describe('buildPembahasanPrompt', () => {
  it('returns { system, user } shape', () => {
    const result = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
    expect(typeof result.system).toBe('string')
    expect(typeof result.user).toBe('string')
  })

  it('system contains Bahasa Indonesia instruction', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('Bahasa Indonesia')
    expect(system).toContain('pembahasan')
  })

  it('system specifies the per-question markdown structure from PRD §10.4', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('Jawaban Benar')
    expect(system).toContain('menjelaskan')
    expect(system).toContain('Tip')
  })

  it('system does NOT contain raw question data (keeps system cacheable)', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).not.toContain('Bacalah teks berikut! Soal 1')
    expect(system).not.toContain('option_a')
  })

  it('user contains all 20 questions serialized as JSON', () => {
    const { user } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    const parsed = JSON.parse(user) as unknown
    expect(Array.isArray(parsed)).toBe(true)
    expect((parsed as unknown[]).length).toBe(20)
  })

  it('user question entries include number, text, options, correctAnswer', () => {
    const { user } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    const parsed = JSON.parse(user) as Array<Record<string, unknown>>
    const first = parsed[0]!
    expect(first['number']).toBe(1)
    expect(typeof first['text']).toBe('string')
    expect(first['optionA']).toBe('Pilihan A')
    expect(first['correctAnswer']).toBe('b')
  })

  it('system includes grade and examType for context steering', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('6')
    expect(system).toContain('TKA')
  })

  it('throws when questions array is empty', () => {
    expect(() =>
      buildPembahasanPrompt({ exam: FAKE_EXAM, questions: [] }),
    ).toThrow('buildPembahasanPrompt: questions must not be empty')
  })

  it('system contains kakak persona for student-friendly tone', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('kakak')
  })

  it('system contains 12 kata sentence-length constraint', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('12 kata')
  })

  it('system contains sehari-hari vocabulary instruction', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('sehari-hari')
  })
})
