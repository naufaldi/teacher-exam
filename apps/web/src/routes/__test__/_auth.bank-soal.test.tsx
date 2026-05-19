import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...orig,
    createFileRoute:
      () =>
      (opts: Record<string, unknown>) => ({
        options: opts,
      }),
    Link: ({
      children,
      to,
    }: {
      children: React.ReactNode
      to: string
    }) => <a href={to}>{children}</a>,
  }
})

import { Route } from '../_auth.bank-soal.js'

describe('BankSoalPage', () => {
  it('renders the coming soon placeholder for the protected bank route', () => {
    const BankSoalPage = Route.options.component as React.ComponentType

    render(<BankSoalPage />)

    expect(screen.getByRole('heading', { name: /Bank Soal/i })).toBeInTheDocument()
    expect(screen.getByText(/segera hadir/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Kembali ke Dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard',
    )
  })
})
