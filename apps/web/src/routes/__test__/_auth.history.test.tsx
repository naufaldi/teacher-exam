import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@teacher-exam/ui'
import type { Exam } from '@teacher-exam/shared'
import { ApiError } from '../../lib/api.js'

// Mock TanStack Router
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...orig,
    createFileRoute: () => (opts: { component: React.ComponentType }) => ({
      options: opts,
    }),
    useNavigate: () => vi.fn(),
  }
})

// Mock api
vi.mock('../../lib/api.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../lib/api.js')>()
  return {
    ...orig,
    api: {
      exams: {
        list: vi.fn(),
        remove: vi.fn(),
        duplicate: vi.fn(),
      },
    },
  }
})

import { api } from '../../lib/api.js'
import { Route } from '../_auth.history.js'

const mockApi = api as unknown as {
  exams: {
    list: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    duplicate: ReturnType<typeof vi.fn>
  }
}

const makeExam = (overrides: Partial<Exam> = {}): Exam => ({
  id: 'exam-1',
  userId: 'user-1',
  title: 'Ujian Matematika',
  subject: 'bahasa_indonesia',
  grade: 5,
  difficulty: 'sedang',
  topic: 'Pemahaman Bacaan',
  reviewMode: 'fast',
  status: 'final',
  schoolName: null,
  academicYear: null,
  examType: 'formatif',
  examDate: null,
  durationMinutes: null,
  instructions: null,
  classContext: null,
  discussionMd: null,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  ...overrides,
})

function renderHistoryPage() {
  const HistoryPage = Route.options.component as React.ComponentType
  return render(
    <ToastProvider>
      <HistoryPage />
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HistoryPage', () => {
  it('shows loading spinner initially', () => {
    mockApi.exams.list.mockReturnValue(new Promise(() => {})) // never resolves
    renderHistoryPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows error state when api.exams.list() rejects', async () => {
    mockApi.exams.list.mockRejectedValueOnce(
      new ApiError({ message: 'Server error', code: 'INTERNAL', status: 500 }),
    )
    renderHistoryPage()
    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument()
    })
  })

  it('shows retry button in error state', async () => {
    mockApi.exams.list.mockRejectedValueOnce(
      new ApiError({ message: 'Network error', code: 'NETWORK', status: 503 }),
    )
    renderHistoryPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument()
    })
  })

  it('shows truly-empty state when api returns empty array', async () => {
    mockApi.exams.list.mockResolvedValueOnce([])
    renderHistoryPage()
    await waitFor(() => {
      expect(screen.getByText(/Belum ada lembar tersimpan/i)).toBeInTheDocument()
    })
  })

  it('shows exam rows when api returns data', async () => {
    const exams = [
      makeExam({ id: 'exam-1', title: 'Ujian BI Kelas 5', status: 'final' }),
      makeExam({ id: 'exam-2', title: 'Draft Matematika', status: 'draft' }),
    ]
    mockApi.exams.list.mockResolvedValueOnce(exams)
    renderHistoryPage()
    await waitFor(() => {
      expect(screen.getByText('Ujian BI Kelas 5')).toBeInTheDocument()
      expect(screen.getByText('Draft Matematika')).toBeInTheDocument()
    })
  })

  it('clicking Hapus lembar opens confirm dialog', async () => {
    const user = userEvent.setup()
    const exams = [makeExam({ id: 'exam-1', status: 'final' })]
    mockApi.exams.list.mockResolvedValueOnce(exams)
    renderHistoryPage()

    await waitFor(() => {
      expect(screen.getByText('Ujian Matematika')).toBeInTheDocument()
    })

    // Open the dropdown (details element)
    const moreButton = screen.getByRole('button', { name: /aksi lain/i })
    // details/summary don't respond to userEvent.click in jsdom; click directly
    await user.click(moreButton)

    // Click "Hapus lembar"
    const hapusButton = screen.getByText(/Hapus lembar/i)
    await user.click(hapusButton)

    // Confirm dialog should be visible
    await waitFor(() => {
      expect(screen.getByText(/Hapus lembar ini\?/i)).toBeInTheDocument()
    })
  })

  it('confirming delete calls api.exams.remove and removes exam from list', async () => {
    const user = userEvent.setup()
    const exams = [makeExam({ id: 'exam-1', status: 'final', title: 'Ujian BI' })]
    mockApi.exams.list.mockResolvedValueOnce(exams)
    mockApi.exams.remove.mockResolvedValueOnce(undefined)
    renderHistoryPage()

    await waitFor(() => {
      expect(screen.getByText('Ujian BI')).toBeInTheDocument()
    })

    // Open dropdown
    const moreButton = screen.getByRole('button', { name: /aksi lain/i })
    await user.click(moreButton)

    // Click Hapus lembar
    await user.click(screen.getByText(/Hapus lembar/i))

    // Confirm dialog shown
    await waitFor(() => {
      expect(screen.getByText(/Hapus lembar ini\?/i)).toBeInTheDocument()
    })

    // Confirm delete
    await user.click(screen.getByRole('button', { name: /ya, hapus/i }))

    await waitFor(() => {
      expect(mockApi.exams.remove).toHaveBeenCalledWith('exam-1')
    })
  })
})
