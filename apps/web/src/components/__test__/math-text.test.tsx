import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MathText } from '../math-text.js'

describe('MathText', () => {
  it('renders inline LaTeX without showing delimiters', () => {
    const { container } = render(<MathText text="Nilai $\\frac{3}{4}$ bagian" />)

    expect(container.querySelector('.katex')).not.toBeNull()
    expect(container.textContent).toContain('Nilai')
    expect(container.textContent).toContain('bagian')
    expect(container.textContent).not.toContain('$')
  })

  it('renders display LaTeX in display mode', () => {
    const { container } = render(<MathText text="$$x^2 + y^2$$" />)

    expect(container.querySelector('.katex-display')).not.toBeNull()
  })

  it('falls back to readable text for malformed LaTeX', () => {
    const { container } = render(<MathText text="Rumus $\\frac{3}{4" />)

    expect(container.textContent).toBe(String.raw`Rumus $\\frac{3}{4`)
  })
})
