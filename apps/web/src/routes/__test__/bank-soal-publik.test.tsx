import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { PaginatedPublicBankResponse } from '@teacher-exam/shared'

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

const browsePublicMock = vi.fn()

vi.mock('../../lib/api.js', () => ({
  api: {
    bank: {
      browsePublic: (...args: unknown[]) => browsePublicMock(...args),
    },
  },
  unwrapApiEither: <T,>(result: { _tag: 'Right'; right: T }) => result.right,
}))

import { Route } from '../bank-soal-publik.js'

describe('BankSoalPublikPage', () => {
  beforeEach(() => {
    browsePublicMock.mockReset()
    browsePublicMock.mockResolvedValue({
      _tag: 'Right',
      right: {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      } satisfies PaginatedPublicBankResponse,
    })
  })

  it('renders login CTA linking to home', async () => {
    const Page = Route.options.component as React.ComponentType
    render(<Page />)

    expect(
      await screen.findByRole('link', { name: /Login untuk simpan/i }),
    ).toHaveAttribute('href', '/')
  })

  it('calls browsePublic on load', async () => {
    const Page = Route.options.component as React.ComponentType
    render(<Page />)

    await waitFor(() => {
      expect(browsePublicMock).toHaveBeenCalled()
    })
  })
})
