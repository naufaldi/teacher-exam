import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REQUIRED_FIELDS } from '../../../scripts/lib/merge-bab'
import { curriculumMdFilename } from '../../lib/curriculum'

interface BookCase {
  slug: string
  subject: string
  grade: number
  expectedMinBab: number
}

const BOOKS: BookCase[] = [
  { slug: 'bahasa-indonesia-kelas-5', subject: 'Bahasa Indonesia', grade: 5, expectedMinBab: 4 },
  { slug: 'bahasa-indonesia-kelas-6', subject: 'Bahasa Indonesia', grade: 6, expectedMinBab: 8 },
  { slug: 'pendidikan-pancasila-kelas-5', subject: 'Pendidikan Pancasila', grade: 5, expectedMinBab: 4 },
  { slug: 'pendidikan-pancasila-kelas-6', subject: 'Pendidikan Pancasila', grade: 6, expectedMinBab: 7 },
  { slug: 'ipas-kelas-5', subject: 'IPAS', grade: 5, expectedMinBab: 6 },
  { slug: 'ipas-kelas-6', subject: 'IPAS', grade: 6, expectedMinBab: 6 },
  { slug: 'bahasa-inggris-kelas-5', subject: 'Bahasa Inggris', grade: 5, expectedMinBab: 6 },
  { slug: 'bahasa-inggris-kelas-6', subject: 'Bahasa Inggris', grade: 6, expectedMinBab: 6 },
]

const MD_DIR = join(__dirname, '..', 'md')

describe('curriculum extraction output', () => {
  for (const book of BOOKS) {
    const path = join(MD_DIR, `${book.slug}.md`)
    it(`${book.slug} matches schema`, () => {
      expect(existsSync(path)).toBe(true)
      const text = readFileSync(path, 'utf-8')
      const size = statSync(path).size
      expect(size).toBeGreaterThan(5 * 1024)
      expect(size).toBeLessThan(50 * 1024)

      expect(text).toMatch(new RegExp(`^# ${book.subject} — Kelas ${book.grade} `, 'm'))
      expect(text).toMatch(/^## Capaian Pembelajaran$/m)

      const bullets = text.match(/^## Capaian Pembelajaran\s*\n([\s\S]*?)(?=^## )/m)?.[1] ?? ''
      const bulletCount = bullets.split('\n').filter((l) => l.trim().startsWith('- ')).length
      expect(bulletCount).toBe(4)

      const babMatches = [...text.matchAll(/^## Bab (\d+):/gm)].map((m) => Number.parseInt(m[1] ?? '0', 10))
      expect(babMatches.length).toBeGreaterThanOrEqual(book.expectedMinBab)
      expect(new Set(babMatches).size).toBe(babMatches.length)
      for (let i = 0; i < babMatches.length; i += 1) {
        expect(babMatches[i]).toBe(i + 1)
      }

      for (const field of REQUIRED_FIELDS) {
        expect(text).toContain(`**${field}:`)
      }
    })
  }
})

describe('curriculum markdown filename resolver', () => {
  it('resolves PRD v3 phase 1 subject filenames', () => {
    expect(curriculumMdFilename('ipas', 5)).toBe('ipas-kelas-5.md')
    expect(curriculumMdFilename('bahasa_inggris', 6)).toBe('bahasa-inggris-kelas-6.md')
  })
})
