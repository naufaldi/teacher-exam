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

const MATEMATIKA_EXAM = {
  subject: 'Matematika',
  grade: 6,
  examType: 'formatif' as const,
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

  it('system specifies student printable pembahasan structure', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('Jawaban Benar')
    expect(system).toContain('**Langkah:**')
    expect(system).toContain('**Penjelasan:**')
    expect(system).toContain('**Opsi Lain:**')
    expect(system).toContain('**Tip:**')
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

  it('system targets printable lembar for siswa only', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('siswa')
    expect(system).toContain('dicetak')
    expect(system).not.toContain('kakak')
    expect(system).not.toMatch(/### Untuk Guru|\*\*Untuk Guru\*\*/)
    expect(system).not.toMatch(/\*\*Catatan Guru\*\*/)
    expect(system).not.toMatch(/\*\*Strategi Mengajar\*\*/)
  })

  it('system does not impose the old 12-kata sentence cap', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).not.toContain('12 kata')
  })

  it('system contains sehari-hari vocabulary instruction', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('sehari-hari')
  })

  it('system includes GPT-5.4 success criteria and verification blocks', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS })
    expect(system).toContain('# Kriteria keberhasilan')
    expect(system).toContain('Verifikasi (internal')
  })

  it('grade 5 and grade 6 produce different depth rules', () => {
    const grade5 = buildPembahasanPrompt({
      exam: { ...FAKE_EXAM, grade: 5 },
      questions: FAKE_QUESTIONS.slice(0, 1),
    }).system
    const grade6 = buildPembahasanPrompt({
      exam: FAKE_EXAM,
      questions: FAKE_QUESTIONS.slice(0, 1),
    }).system

    expect(grade5).toContain('2–3 langkah')
    expect(grade6).toContain('3–5 langkah')
    expect(grade5).not.toBe(grade6)
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

  it('requires LaTeX delimiters for Matematika pembahasan via shared rules', () => {
    const { system } = buildPembahasanPrompt({ exam: MATEMATIKA_EXAM, questions: MIXED_QUESTIONS })

    expect(system).toContain('$inline$')
    expect(system).toContain('$$display$$')
    expect(system).toContain('\\frac{3}{4}')
    expect(system).toContain('# Kelengkapan')
    expect(system).toContain('# Personality')
  })

  it('requires step-by-step calculation in Langkah for Matematika', () => {
    const { system } = buildPembahasanPrompt({ exam: MATEMATIKA_EXAM, questions: MIXED_QUESTIONS })
    expect(system).toContain('perhitungan bertahap')
  })

  it('requires Bahasa Indonesia reading strategy in Langkah', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: FAKE_QUESTIONS.slice(0, 1) })
    expect(system).toContain('bukti di teks')
  })

  it('instructs skipping Opsi Lain for true_false questions', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: MIXED_QUESTIONS })
    expect(system).toMatch(/true_false.*lewati.*Opsi Lain/is)
  })
})

const SINGLE_QUESTION = FAKE_QUESTIONS.slice(0, 1)

describe('buildPembahasanPrompt subject rules', () => {
  it('includes Bahasa Indonesia-specific pembahasan guidance', () => {
    const { system } = buildPembahasanPrompt({ exam: FAKE_EXAM, questions: SINGLE_QUESTION })
    expect(system).toContain('Aturan Bahasa Indonesia:')
    expect(system).toContain('ide pokok')
    expect(system).toContain('bukti di teks')
  })

  it('includes Pendidikan Pancasila-specific pembahasan guidance', () => {
    const { system } = buildPembahasanPrompt({
      exam: { subject: 'Pendidikan Pancasila', grade: 6, examType: 'formatif' },
      questions: SINGLE_QUESTION,
    })
    expect(system).toContain('Aturan Pendidikan Pancasila:')
    expect(system).toMatch(/nilai Pancasila|norma/)
  })

  it('includes IPAS-specific pembahasan guidance', () => {
    const { system } = buildPembahasanPrompt({
      exam: { subject: 'IPAS', grade: 6, examType: 'formatif' },
      questions: SINGLE_QUESTION,
    })
    expect(system).toContain('Aturan IPAS:')
    expect(system).toMatch(/konsep IPA|fenomena|sebab-akibat/)
  })

  it('includes Bahasa Inggris-specific pembahasan guidance', () => {
    const { system } = buildPembahasanPrompt({
      exam: { subject: 'Bahasa Inggris', grade: 6, examType: 'formatif' },
      questions: SINGLE_QUESTION,
    })
    expect(system).toContain('Aturan Bahasa Inggris:')
    expect(system).toContain('Bahasa Indonesia')
    expect(system).toMatch(/teks.*Inggris|instruksi.*Inggris/i)
  })

  it('includes Matematika-specific pembahasan guidance without BI markers', () => {
    const { system } = buildPembahasanPrompt({ exam: MATEMATIKA_EXAM, questions: SINGLE_QUESTION })
    expect(system).toContain('Aturan Matematika:')
    expect(system).toContain('perhitungan bertahap')
    expect(system).not.toContain('Aturan Bahasa Indonesia:')
  })

  it('uses general fallback for unknown subjects without cross-subject leakage', () => {
    const { system } = buildPembahasanPrompt({
      exam: { subject: 'Seni Budaya', grade: 6, examType: 'formatif' },
      questions: SINGLE_QUESTION,
    })
    expect(system).toContain('Aturan umum mata pelajaran Seni Budaya:')
    expect(system).toMatch(/baca pertanyaan.*pahami topik|pahami topik.*cari bukti/is)
    expect(system).toContain('field `topic`')
    expect(system).not.toContain('perhitungan bertahap')
    expect(system).not.toContain('Aturan Bahasa Indonesia:')
    expect(system).not.toContain('Aturan Pendidikan Pancasila:')
    expect(system).not.toContain('Aturan Matematika:')
  })

  it('normalizes subject label case for known subjects', () => {
    const { system } = buildPembahasanPrompt({
      exam: { subject: 'matematika', grade: 6, examType: 'formatif' },
      questions: SINGLE_QUESTION,
    })
    expect(system).toContain('Aturan Matematika:')
    expect(system).not.toContain('Aturan umum mata pelajaran')
  })
})
