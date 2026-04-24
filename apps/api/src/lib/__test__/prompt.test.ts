import { describe, expect, it, test } from 'vitest'
import { buildExamPrompt } from '../prompt'

const FAKE_CURRICULUM = `# Bahasa Indonesia — Kelas 6 (Fase C, Kurikulum Merdeka)

## Capaian Pembelajaran
- Menyimak: ...
- Membaca dan Memirsa: ...

## Bab 1: Aku Anak Indonesia
**Topik utama:** Identitas diri.
`

describe('buildExamPrompt', () => {
  it('puts the full curriculum corpus in the system message, not in user', () => {
    const { system, user } = buildExamPrompt({
      examType: 'formatif',
      difficulty: 'campuran',
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      topic: 'Pemahaman Bacaan',
      curriculumText: FAKE_CURRICULUM,
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
      topic: 'Hak dan Kewajiban',
      curriculumText: FAKE_CURRICULUM,
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
      topic: 'Pemahaman Bacaan',
      curriculumText: FAKE_CURRICULUM,
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
      topic: 'Pemahaman Bacaan',
      curriculumText: FAKE_CURRICULUM,
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
      topic: 'Pemahaman Bacaan',
      curriculumText: FAKE_CURRICULUM,
      classContext: 'Anak-anak masih bingung membedakan teks persuasi.',
      exampleQuestions: 'Contoh: Bacalah teks berikut...',
    })
    expect(user).toContain('konteks_guru')
    expect(user).toContain('teks persuasi')
    expect(user).toContain('contoh_soal')
  })
})

describe('buildExamPrompt — totalSoal', () => {
  const basePromptInput = {
    examType: 'formatif' as const,
    difficulty: 'campuran' as const,
    subjectLabel: 'Bahasa Indonesia',
    grade: 6,
    topic: 'Pemahaman Bacaan',
    curriculumText: FAKE_CURRICULUM,
  }

  test('system prompt contains exact totalSoal count (not hardcoded 20)', () => {
    const { system } = buildExamPrompt({ ...basePromptInput, totalSoal: 25 })
    expect(system).toContain('25')
    expect(system).not.toContain('tepat 20')
  })

  test('user prompt contains totalSoal count', () => {
    const { user } = buildExamPrompt({ ...basePromptInput, totalSoal: 30 })
    expect(user).toContain('30')
  })
})
