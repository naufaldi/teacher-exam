import { describe, it, expect } from 'vitest'
import { formatExamTitle } from '@teacher-exam/shared'

describe('formatExamTitle', () => {
  it('builds full title when examType and examDate are present', () => {
    const result = formatExamTitle({
      subjectLabel: 'Bahasa Indonesia',
      grade: 5,
      examType: 'formatif',
      examDate: '2026-04-24',
      topics: ['Ide Pokok dan Gagasan Pendukung'],
    })
    expect(result).toBe('Bahasa Indonesia / Kelas 5 / formatif / 24 Apr 2026')
  })

  it('falls back to topic when examType is empty', () => {
    const result = formatExamTitle({
      subjectLabel: 'Pendidikan Pancasila',
      grade: 6,
      examType: '',
      examDate: '2026-04-24',
      topics: ['Nilai-Nilai Pancasila'],
    })
    expect(result).toBe('Pendidikan Pancasila / Kelas 6 / Nilai-Nilai Pancasila / 24 Apr 2026')
  })

  it('drops date segment when examDate is null', () => {
    const result = formatExamTitle({
      subjectLabel: 'Bahasa Indonesia',
      grade: 5,
      examType: 'sas',
      examDate: null,
      topics: ['Ide Pokok dan Gagasan Pendukung'],
    })
    expect(result).toBe('Bahasa Indonesia / Kelas 5 / sas')
  })

  it('drops date segment and falls back to topic when both examType and examDate are missing', () => {
    const result = formatExamTitle({
      subjectLabel: 'Pendidikan Pancasila',
      grade: 5,
      examType: '',
      examDate: null,
      topics: ['Hubungan Antar-Sila'],
    })
    expect(result).toBe('Pendidikan Pancasila / Kelas 5 / Hubungan Antar-Sila')
  })

  it('caps title at 80 characters to match DB column constraint', () => {
    const result = formatExamTitle({
      subjectLabel: 'Bahasa Indonesia',
      grade: 5,
      examType: 'formatif',
      examDate: '2026-04-24',
      topics: ['A'.repeat(100)],
    })
    expect(result.length).toBeLessThanOrEqual(80)
  })

  it('formats date in Indonesian locale (dd MMM yyyy)', () => {
    const result = formatExamTitle({
      subjectLabel: 'Bahasa Indonesia',
      grade: 5,
      examType: 'formatif',
      examDate: '2026-01-05',
      topics: ['Topik'],
    })
    expect(result).toContain('5 Jan 2026')
  })
})
