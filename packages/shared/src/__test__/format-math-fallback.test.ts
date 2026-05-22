import { describe, expect, test } from 'vitest'
import { formatMathFallbackPlain } from '../format-math-fallback.js'

describe('formatMathFallbackPlain', () => {
  test('replaces div and times without dollar signs', () => {
    expect(formatMathFallbackPlain('1.824 \\div 12')).toBe('1.824 ÷ 12')
    expect(formatMathFallbackPlain('256 \\times 34')).toBe('256 × 34')
  })

  test('formats simple fractions', () => {
    expect(formatMathFallbackPlain('\\frac{3}{4}')).toBe('3/4')
    expect(formatMathFallbackPlain('\\frac{3}{4')).toBe('3/4')
  })

  test('never includes dollar delimiters', () => {
    expect(formatMathFallbackPlain('$5.678 + 3.421$')).not.toContain('$')
  })
})
