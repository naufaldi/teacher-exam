import { describe, expect, test } from 'vitest'
import {
  detectBrokenMatematikaLatex,
  repairMatematikaLatexInText,
} from '../repair-matematika-latex.js'

describe('repairMatematikaLatexInText', () => {
  test('repairs imes to times inside inline math', () => {
    expect(repairMatematikaLatexInText('Hasil dari $124 imes 36$ adalah ....')).toBe(
      'Hasil dari $124 \\times 36$ adalah ....',
    )
  })

  test('repairs tab-corrupted times from JSON escape', () => {
    expect(repairMatematikaLatexInText('Hasil dari $124\times 36$ adalah ....')).toBe(
      'Hasil dari $124 \\times 36$ adalah ....',
    )
  })

  test('repairs rac{ to frac{ inside math', () => {
    expect(repairMatematikaLatexInText('Nilai $rac{3}{4}$ bagian')).toBe(
      'Nilai $\\frac{3}{4}$ bagian',
    )
  })

  test('repairs qrt{ to sqrt{ inside math', () => {
    expect(repairMatematikaLatexInText('Akar $qrt{16}$')).toBe('Akar $\\sqrt{16}$')
  })

  test('repairs bare div between numbers inside math', () => {
    expect(repairMatematikaLatexInText('Hasil dari $1824 div 12$ adalah ....')).toBe(
      'Hasil dari $1824 \\div 12$ adalah ....',
    )
  })

  test('leaves valid LaTeX unchanged', () => {
    const input = 'Hasil dari $124 \\times 36$ dan $\\frac{3}{4}$'
    expect(repairMatematikaLatexInText(input)).toBe(input)
  })
})

describe('detectBrokenMatematikaLatex', () => {
  test('flags imes inside math delimiters', () => {
    expect(detectBrokenMatematikaLatex('Hasil dari $124 imes 36$')).toContain('imes → \\times')
  })

  test('returns empty for valid LaTeX', () => {
    expect(detectBrokenMatematikaLatex('Hasil dari $124 \\times 36$')).toEqual([])
  })
})
