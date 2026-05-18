import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownMath } from '../markdown-math.js'

describe('MarkdownMath', () => {
  it('renders LaTeX in normal markdown text', () => {
    const { container } = render(<MarkdownMath markdown="Nilainya $\\frac{1}{2}$." />)

    expect(container.querySelector('.katex')).not.toBeNull()
    expect(container.textContent).not.toContain('$')
  })

  it('preserves literal math delimiters inside code spans', () => {
    const { container } = render(<MarkdownMath markdown="Tulis ` $\\frac{1}{2}$ ` sebagai contoh." />)

    expect(screen.getByText(/\\frac/)).toBeInTheDocument()
    expect(container.querySelector('code .katex')).toBeNull()
  })
})
