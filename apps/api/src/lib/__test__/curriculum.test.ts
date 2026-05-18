import { describe, expect, test, beforeEach } from 'vitest'
import type { ExamSubject } from '@teacher-exam/shared'
import { __resetCurriculumCache, curriculumMdFilename, getCurriculumText } from '../curriculum'

describe('Matematika curriculum corpus', () => {
  beforeEach(() => {
    __resetCurriculumCache()
  })

  test('uses the canonical Matematika markdown filename', () => {
    expect(curriculumMdFilename('matematika' as ExamSubject, 5)).toBe('matematika-kelas-5.md')
    expect(curriculumMdFilename('matematika' as ExamSubject, 6)).toBe('matematika-kelas-6.md')
  })

  test('loads Matematika class 5 corpus without diagram topics before D phase', async () => {
    const text = await getCurriculumText('matematika' as ExamSubject, 5)

    expect(text).toContain('# Matematika Kelas 5')
    expect(text).toContain('Fase C')
    expect(text).not.toContain('Bangun Datar')
    expect(text).not.toContain('Bangun Ruang')
    expect(text).not.toContain('Bidang Koordinat')
  })
})
