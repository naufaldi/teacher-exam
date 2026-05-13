import { describe, expect, test } from 'vitest'
import { validateLatexText } from '../latex-validator'

describe('validateLatexText', () => {
  test('accepts valid inline LaTeX', () => {
    const result = validateLatexText('Soal $\\frac{3}{4}$ bagian')

    expect(result._tag).toBe('valid')
  })

  test('rejects unclosed inline delimiter', () => {
    const result = validateLatexText('Soal $\\frac{3}{4}')

    expect(result._tag).toBe('invalid')
  })

  test('accepts text without math delimiters', () => {
    const result = validateLatexText('Soal tanpa notasi matematika')

    expect(result._tag).toBe('valid')
  })
})
