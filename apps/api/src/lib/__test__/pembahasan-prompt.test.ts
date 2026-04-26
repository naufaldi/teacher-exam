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

const MIXED_QUESTIONS = [
  {
    _tag: 'mcq_single' as const,
    number: 1,
    text: 'Apa ide pokok paragraf tersebut?',
    options: { a: 'Jawaban A', b: 'Jawaban B', c: 'Jawaban C', d: 'Jawaban D' },
    correct: 'b' as const,
    topic: 'Ide Pokok',
    difficulty: 'sedang',
  },
  {
    _tag: 'mcq_multi' as const,
    number: 2,
    text: 'Pilih dua jawaban yang benar tentang gagasan pendukung.',
    options: { a: 'Data', b: 'Cerita utama', c: 'Contoh', d: 'Judul' },
    correct: ['a', 'c'] as const,
    topic: 'Gagasan Pendukung',
    difficulty: 'sedang',
  },
  {
    _tag: 'true_false' as const,
    number: 3,
    text: 'Tentukan apakah pernyataan berikut benar (B) atau salah (S):',
    statements: [
      { text: 'Teks eksplanasi menjelaskan proses terjadinya fenomena.', answer: true },
      { text: 'Deret penjelas berisi kesimpulan dari fenomena.', answer: false },
      { text: 'Interpretasi merupakan bagian akhir teks eksplanasi.', answer: true },
    ],
    topic: 'Teks Eksplanasi',
    difficulty: 'sedang',
  },
]

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

  it('system explicitly bans formal/academic words that are too hard for SD students', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('implisit')
    expect(system).toContain('eksplisit')
    expect(system).toContain('rincian')
    expect(system).toContain('mendalam')
    expect(system).toContain('JANGAN')
  })

  it('system provides replacement words for banned terms', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('tersembunyi')
  })

  it('serializes mixed question types without empty legacy option placeholders', () => {
    const { user } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: MIXED_QUESTIONS })
    const parsed = JSON.parse(user) as Array<Record<string, unknown>>

    expect(parsed[1]).toMatchObject({
      type: 'mcq_multi',
      correct: ['a', 'c'],
      options: { a: 'Data', c: 'Contoh' },
    })
    expect(parsed[2]).toMatchObject({
      type: 'true_false',
      answers: ['B', 'S', 'B'],
      statements: [
        'Teks eksplanasi menjelaskan proses terjadinya fenomena.',
        'Deret penjelas berisi kesimpulan dari fenomena.',
        'Interpretasi merupakan bagian akhir teks eksplanasi.',
      ],
    })
    expect(parsed[2]).not.toHaveProperty('optionA')
    expect(parsed[2]).not.toHaveProperty('correctAnswer')
  })

  it('instructs Claude how to format answers for all supported question types', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: MIXED_QUESTIONS })

    expect(system).toContain('Pilihan ganda biasa')
    expect(system).toContain('Pilihan ganda kompleks')
    expect(system).toContain('Benar/Salah')
    expect(system).toContain('A, C')
    expect(system).toContain('B, S, B')
  })
})
