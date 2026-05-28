import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { BankQuestion, PaginatedBankResponse } from '@teacher-exam/shared'

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

const browseMock = vi.fn()

vi.mock('../../lib/api.js', () => ({
  api: {
    bank: {
      browse: (...args: unknown[]) => browseMock(...args),
    },
  },
  unwrapApiEither: <T,>(result: { _tag: 'Right'; right: T }) => result.right,
}))

import { Route } from '../_auth.bank-soal.js'

const sampleResponse: PaginatedBankResponse = {
  data: [
    {
      id: 'bank-1' as BankQuestion['id'],
      questionId: 'q-1' as BankQuestion['questionId'],
      userId: 'user-1',
      subject: 'ipas',
      grade: 5,
      topics: ['Energi'],
      difficulty: 'sedang',
      type: 'mcq_single',
      payload: {},
      isPublic: false,
      usageCount: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      text: 'Apa itu energi?',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctAnswer: 'a',
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

describe('BankSoalPage', () => {
  beforeEach(() => {
    browseMock.mockReset()
    browseMock.mockResolvedValue({ _tag: 'Right', right: sampleResponse })
  })

  it('renders empty state when bank has no questions', async () => {
    browseMock.mockResolvedValue({
      _tag: 'Right',
      right: { data: [], total: 0, page: 1, limit: 20 },
    })

    const BankSoalPage = Route.options.component as React.ComponentType
    render(<BankSoalPage />)

    expect(await screen.findByText(/Bank soal masih kosong/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Generate ujian/i })).toHaveAttribute('href', '/generate')
  })

  it('renders bank question cards from API', async () => {
    const BankSoalPage = Route.options.component as React.ComponentType
    render(<BankSoalPage />)

    await waitFor(() => {
      expect(screen.getByText('Apa itu energi?')).toBeInTheDocument()
    })
    expect(screen.getByText(/Pribadi/i)).toBeInTheDocument()
    expect(screen.getByText(/1 soal di bank Anda/i)).toBeInTheDocument()
  })
})
