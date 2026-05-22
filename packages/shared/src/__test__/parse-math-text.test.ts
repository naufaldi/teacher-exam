import { describe, expect, test } from 'vitest'
import { parseMathText } from '../parse-math-text.js'

describe('parseMathText', () => {
  test('splits inline math from plain text', () => {
    const parts = parseMathText('Nilai $\\frac{3}{4}$ bagian')

    expect(parts).toEqual([
      { _tag: 'text', value: 'Nilai ' },
      { _tag: 'math', value: '\\frac{3}{4}', displayMode: false, raw: '$\\frac{3}{4}$' },
      { _tag: 'text', value: ' bagian' },
    ])
  })

  test('parses display math', () => {
    const parts = parseMathText('$$x^2$$')

    expect(parts).toEqual([
      { _tag: 'math', value: 'x^2', displayMode: true, raw: '$$x^2$$' },
    ])
  })

  test('treats unclosed delimiter as plain text', () => {
    const parts = parseMathText('Rumus $\\frac{3}{4}')

    expect(parts.some((p) => p._tag === 'text' && p.value.includes('$'))).toBe(true)
  })
})
