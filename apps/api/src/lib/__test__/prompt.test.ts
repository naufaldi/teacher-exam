import { describe, expect, it, test } from 'vitest'
import { buildExamPrompt } from '../prompt'

const FAKE_CURRICULUM = `# Bahasa Indonesia — Kelas 6 (Fase C, Kurikulum Merdeka)

## Capaian Pembelajaran
- Menyimak: ...
- Membaca dan Memirsa: ...

## Bab 1: Aku Anak Indonesia
**Topik utama:** Identitas diri.
`

function parsePromptParams(user: string) {
  const jsonStart = user.indexOf('{')
  if (jsonStart === -1) throw new Error('Prompt user message does not contain JSON params')
  return JSON.parse(user.slice(jsonStart)) as {
    jumlah_soal: number
    distribusi_kesulitan: { mudah: number; sedang: number; sulit: number }
    composition_soal: { mcq_single: number; mcq_multi: number; true_false: number }
  }
}

describe('buildExamPrompt', () => {
  it('puts the full curriculum corpus in the system message, not in user', () => {
    const { system, user } = buildExamPrompt({
      examType: 'formatif',
      difficulty: 'campuran',
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      topics: ['Pemahaman Bacaan'],
      totalSoal: 20,
      curriculumText: FAKE_CURRICULUM,
      composition: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
    })

    expect(system).toContain(FAKE_CURRICULUM)
    expect(system).toContain('## Capaian Pembelajaran')
    expect(system).toContain('## Bab 1: Aku Anak Indonesia')
    expect(user).not.toContain('## Capaian Pembelajaran')
    expect(user).not.toContain('## Bab 1:')
  })

  it('puts the topic and per-request parameters in the user message', () => {
    const { system, user } = buildExamPrompt({
      examType: 'sas',
      difficulty: 'sulit',
      subjectLabel: 'Pendidikan Pancasila',
      grade: 5,
      topics: ['Hak dan Kewajiban'],
      totalSoal: 25,
      curriculumText: FAKE_CURRICULUM,
      composition: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
    })

    expect(user).toContain('Hak dan Kewajiban')
    expect(user).toContain('"kelas": 5')
    expect(user).toContain('"mata_pelajaran": "Pendidikan Pancasila"')
    expect(user).toContain('"jenis_lembar": "sas"')
    expect(system).not.toContain('Hak dan Kewajiban')
  })

  it('declares the authority order so the PDF is treated as additive', () => {
    const { system } = buildExamPrompt({
      examType: 'formatif',
      difficulty: 'campuran',
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      topics: ['Pemahaman Bacaan'],
      totalSoal: 20,
      curriculumText: FAKE_CURRICULUM,
      composition: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
    })

    expect(system.toLowerCase()).toContain('authority order')
    expect(system).toMatch(/PDF guru.*konteks tambahan|konteks tambahan.*PDF guru/i)
    expect(system).toMatch(/baseline/i)
  })

  it('omits optional class context and example questions when absent', () => {
    const { user } = buildExamPrompt({
      examType: 'formatif',
      difficulty: 'campuran',
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      topics: ['Pemahaman Bacaan'],
      totalSoal: 20,
      curriculumText: FAKE_CURRICULUM,
      composition: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
    })
    expect(user).not.toContain('konteks_guru')
    expect(user).not.toContain('contoh_soal')
  })

  it('includes optional class context and example questions when provided', () => {
    const { user } = buildExamPrompt({
      examType: 'formatif',
      difficulty: 'campuran',
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      topics: ['Pemahaman Bacaan'],
      totalSoal: 20,
      curriculumText: FAKE_CURRICULUM,
      composition: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
      classContext: 'Anak-anak masih bingung membedakan teks persuasi.',
      exampleQuestions: 'Contoh: Bacalah teks berikut...',
    })
    expect(user).toContain('konteks_guru')
    expect(user).toContain('teks persuasi')
    expect(user).toContain('contoh_soal')
  })

  it('injects all topics in the user message when multiple provided', () => {
    const { user } = buildExamPrompt({
      examType: 'sas',
      difficulty: 'campuran',
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      topics: ['Teks Narasi', 'Puisi', 'Opini dan Fakta'],
      totalSoal: 25,
      curriculumText: FAKE_CURRICULUM,
    })

    expect(user).toContain('Teks Narasi')
    expect(user).toContain('Puisi')
    expect(user).toContain('Opini dan Fakta')
    expect(user).toMatch(/merata|distribusikan/i)
  })

  it('works with a single topic (backward-compatible)', () => {
    const { user } = buildExamPrompt({
      examType: 'formatif',
      difficulty: 'mudah',
      subjectLabel: 'Bahasa Indonesia',
      grade: 5,
      topics: ['Kosakata'],
      totalSoal: 20,
      curriculumText: FAKE_CURRICULUM,
    })

    expect(user).toContain('Kosakata')
  })

  it('throws when topics array is empty', () => {
    expect(() =>
      buildExamPrompt({
        examType: 'formatif',
        difficulty: 'campuran',
        subjectLabel: 'Bahasa Indonesia',
        grade: 6,
        topics: [],
        totalSoal: 20,
        curriculumText: FAKE_CURRICULUM,
      }),
    ).toThrow('topics must contain at least one item')
  })
})

describe('buildExamPrompt — totalSoal', () => {
  const basePromptInput = {
    examType: 'formatif' as const,
    difficulty: 'campuran' as const,
    subjectLabel: 'Bahasa Indonesia',
    grade: 6,
    topics: ['Pemahaman Bacaan'],
    curriculumText: FAKE_CURRICULUM,
    composition: { mcqSingle: 20, mcqMulti: 0, trueFalse: 0 },
  }

  test('system prompt contains exact totalSoal count (not hardcoded 20)', () => {
    const { system } = buildExamPrompt({ ...basePromptInput, totalSoal: 25 })
    expect(system).toContain('tepat 25 soal')
    expect(system).not.toContain('tepat 20')
  })

  test('user prompt contains totalSoal count', () => {
    const { user } = buildExamPrompt({ ...basePromptInput, totalSoal: 30, composition: { mcqSingle: 30, mcqMulti: 0, trueFalse: 0 } })
    expect(user).toContain('berisi 30 soal')
  })

  test('difficulty distribution in prompt sums to totalSoal', () => {
    const { user } = buildExamPrompt({
      ...basePromptInput,
      difficulty: 'sedang',
      totalSoal: 30,
      composition: { mcqSingle: 30, mcqMulti: 0, trueFalse: 0 },
    })
    const params = parsePromptParams(user)
    const dist = params.distribusi_kesulitan

    expect(params.jumlah_soal).toBe(30)
    expect(dist.mudah + dist.sedang + dist.sulit).toBe(30)
  })

  test('sts sulit prompt keeps requested 40-question totals consistent', () => {
    const { user } = buildExamPrompt({
      examType: 'sts',
      difficulty: 'sulit',
      subjectLabel: 'Bahasa Indonesia',
      grade: 5,
      topics: [
        'Unsur Intrinsik Cerita (Tokoh, Latar, Alur, Amanat)',
        'Ide Pokok dan Gagasan Pendukung',
        'Teks Eksposisi',
        'Teks Eksplanasi',
        'Teks Deskripsi',
      ],
      totalSoal: 40,
      curriculumText: FAKE_CURRICULUM,
      classContext:
        'Fokus pada: Unsur Intrinsik Cerita (Tokoh, Latar, Alur, Amanat).\nHubungkan dengan keagamaan',
      composition: { mcqSingle: 29, mcqMulti: 6, trueFalse: 5 },
    })
    const params = parsePromptParams(user)
    const dist = params.distribusi_kesulitan
    const composition = params.composition_soal

    expect(params.jumlah_soal).toBe(40)
    expect(dist.mudah + dist.sedang + dist.sulit).toBe(40)
    expect(composition.mcq_single + composition.mcq_multi + composition.true_false).toBe(40)
    expect(composition).toEqual({ mcq_single: 29, mcq_multi: 6, true_false: 5 })
  })
})

describe('buildExamPrompt — composition and multi-type', () => {
  const base = {
    examType: 'latihan' as const,
    difficulty: 'campuran' as const,
    subjectLabel: 'Bahasa Indonesia',
    grade: 5,
    topics: ['Teks Narasi'],
    totalSoal: 25,
    curriculumText: 'Dummy curriculum.',
    composition: { mcqSingle: 15, mcqMulti: 5, trueFalse: 5 },
  }

  test('system message mentions _tag field', () => {
    const { system } = buildExamPrompt(base)
    expect(system).toContain('_tag')
  })

  test('system message mentions all three _tag values', () => {
    const { system } = buildExamPrompt(base)
    expect(system).toContain('mcq_single')
    expect(system).toContain('mcq_multi')
    expect(system).toContain('true_false')
  })

  test('system message describes correct_answers for mcq_multi', () => {
    const { system } = buildExamPrompt(base)
    expect(system).toContain('correct_answers')
  })

  test('system message describes statements for true_false', () => {
    const { system } = buildExamPrompt(base)
    expect(system).toContain('statements')
  })

  test('user message contains count for each non-zero type', () => {
    const { user } = buildExamPrompt(base)
    expect(user).toContain('15 soal pilihan ganda')
    expect(user).toContain('5 soal pilihan ganda kompleks')
    expect(user).toContain('5 soal benar/salah')
  })

  test('user message does NOT mention type with 0 count', () => {
    const pureLatihan = { ...base, composition: { mcqSingle: 25, mcqMulti: 0, trueFalse: 0 }, totalSoal: 25 }
    const { user } = buildExamPrompt(pureLatihan)
    expect(user).not.toContain('pilihan ganda kompleks')
    expect(user).not.toContain('benar/salah')
  })
})
