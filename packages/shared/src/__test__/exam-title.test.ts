import { describe, expect, it } from 'vitest'
import { formatExamTitle } from '../exam-title.js'

describe('formatExamTitle', () => {
  it('joins multiple topics with comma in title', () => {
    const result = formatExamTitle({
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      examType: 'sas',
      examDate: null,
      topics: ['Teks Narasi', 'Puisi'],
    })
    expect(result).toContain('sas')
    expect(result).toContain('Bahasa Indonesia')
    expect(result).toContain('Kelas 6')
  })

  it('uses single topic directly when only one provided', () => {
    const result = formatExamTitle({
      subjectLabel: 'Matematika',
      grade: 5,
      examType: 'formatif',
      examDate: null,
      topics: ['Pecahan'],
    })
    expect(result).toContain('Matematika')
    expect(result).toContain('Kelas 5')
  })

  it('falls back to topic segment when examType is empty', () => {
    const result = formatExamTitle({
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      examType: '',
      examDate: null,
      topics: ['Kosakata'],
    })
    expect(result).toContain('Kosakata')
  })

  it('truncates to 80 characters', () => {
    const result = formatExamTitle({
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      examType: 'tka',
      examDate: null,
      topics: ['A very long topic name that goes on and on and on and keeps going'],
    })
    expect(result.length).toBeLessThanOrEqual(80)
  })

  it('includes formatted date when provided', () => {
    const result = formatExamTitle({
      subjectLabel: 'Bahasa Indonesia',
      grade: 6,
      examType: 'sas',
      examDate: '2026-06-01',
      topics: ['Teks Narasi'],
    })
    expect(result).toMatch(/2026|Jun/)
  })

  it('does not produce trailing separator when topics is empty array', () => {
    const result = formatExamTitle({
      subjectLabel: 'Matematika',
      grade: 5,
      examType: '',
      examDate: null,
      topics: [],
    })
    expect(result).not.toMatch(/\/ $/)
    expect(result).not.toContain('/ /')
  })
})
