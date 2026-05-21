import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Route } from '../_auth.help.notasi-matematika'

const HelpPage = Route.options.component
if (HelpPage === undefined) {
  throw new Error('Help page component missing')
}

describe('NotasiMatematikaHelpPage', () => {
  it('renders guide heading and imes mistake section', () => {
    render(<HelpPage />)

    expect(screen.getByRole('heading', { name: /panduan notasi matematika/i })).toBeInTheDocument()
    expect(screen.getByText(/Jika pratinjau menampilkan/)).toBeInTheDocument()
    expect(screen.getByText('Salah')).toBeInTheDocument()
    expect(screen.getByText('Benar')).toBeInTheDocument()
  })

  it('renders Benar preview with multiplication sign, not imes', () => {
    const { container } = render(<HelpPage />)

    const benarCard = container.querySelector('.border-success-border')
    expect(benarCard).not.toBeNull()
    const preview = benarCard?.querySelector('.overflow-x-auto')
    expect(preview?.querySelector('.katex')).not.toBeNull()
    expect(preview?.textContent).toMatch(/124\s*×\s*36/)
    expect(preview?.textContent?.toLowerCase()).not.toMatch(/\bimes\b/)
  })

  it('keeps Salah preview showing broken imes for comparison', () => {
    const { container } = render(<HelpPage />)

    const salahCard = container.querySelector('.border-danger-border')
    expect(salahCard).not.toBeNull()
    const preview = salahCard?.querySelector('.overflow-x-auto')
    expect(preview?.textContent?.toLowerCase()).toMatch(/\bimes\b/)
    expect(preview?.textContent).not.toMatch(/124\s*×\s*36/)
  })

  it('renders flat rectangular cards without paper tilt', () => {
    const { container } = render(<HelpPage />)

    expect(container.querySelector('[style*="rotate"]')).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Simbol' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Tulis' })).toBeInTheDocument()
  })
})
