import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import type { ExamWithQuestions } from '@teacher-exam/shared'

const mockNavigate = vi.fn<(opts: unknown) => Promise<void>>()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...orig,
    createFileRoute: () => (opts: { component: React.ComponentType }) => ({
      options: opts,
      useSearch: () => ({ simulate: undefined }),
    }),
    useNavigate: () => mockNavigate,
    useSearch: () => ({ simulate: undefined }),
  }
})

vi.mock('../../lib/api.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../lib/api.js')>()
  return {
    ...orig,
    api: {
      ...orig.api,
      ai: { generate: vi.fn() },
    },
  }
})

// Replace Radix Button with a plain <button> that ignores `disabled`.
// The Generate button is disabled by default until the form is filled — this
// lets us test the generate flow without Radix Select interaction.
vi.mock('@teacher-exam/ui', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@teacher-exam/ui')>()
  return {
    ...orig,
    Button: ({ onClick, children, type }: { onClick?: () => void; children: React.ReactNode; type?: 'button' | 'submit' | 'reset' }) => (
      <button type={type ?? 'button'} onClick={onClick}>{children}</button>
    ),
  }
})

import { api, ApiError } from '../../lib/api.js'
import { Route } from '../_auth.generate.js'

const mockApi = api as unknown as { ai: { generate: ReturnType<typeof vi.fn> } }

const NOW = '2024-01-01T00:00:00.000Z'

function makeExamWithQuestions(id = 'exam_abc'): ExamWithQuestions {
  return {
    id,
    userId: 'user_1',
    title: 'Bahasa Indonesia · Kelas 6 · Teks Narasi',
    subject: 'bahasa_indonesia',
    grade: 6,
    difficulty: 'sedang',
    topics: ['Teks Narasi'],
    reviewMode: 'fast',
    status: 'draft',
    schoolName: null,
    academicYear: null,
    examType: 'formatif',
    examDate: null,
    durationMinutes: null,
    instructions: null,
    classContext: null,
    discussionMd: null,
    createdAt: NOW,
    updatedAt: NOW,
    questions: Array.from({ length: 20 }, (_, i) => ({
      _tag: 'mcq_single' as const,
      id: `q-${i + 1}`,
      examId: id,
      number: i + 1,
      text: `Question ${i + 1}`,
      options: { a: 'A', b: 'B', c: 'C', d: 'D' },
      correct: 'a' as const,
      topic: 'Teks Narasi',
      difficulty: 'sedang',
      status: 'pending' as const,
      validationStatus: null,
      validationReason: null,
      createdAt: NOW,
    })),
  }
}

function renderGeneratePage() {
  const GeneratePage = (Route as unknown as { options: { component: React.ComponentType } }).options
    .component
  return render(<GeneratePage />)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mockNavigate.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

async function clickGenerateAndFlush() {
  // fireEvent.click is synchronous — avoids waiting for Radix Dialog animations
  fireEvent.click(screen.getByRole('button', { name: /generate lembar/i }))

  // advanceTimersByTimeAsync advances virtual time to a fixed point AND flushes
  // microtasks (Promise chains) between each timer fire — unlike runAllTimers()
  // which causes an infinite loop when a setInterval is active (tips cycling,
  // progress interval). 20s covers GENERATE_DURATION_MS (7000 or 18000) + 450ms nav delay.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20_000)
  })
}

describe('Jumlah Soal input', () => {
  it('defaults to 20 for default jenis (formatif)', () => {
    renderGeneratePage()
    const input = screen.getByLabelText('Jumlah Soal') as HTMLInputElement
    expect(input.value).toBe('20')
  })

  it('auto-fills to 25 when UAS (sas) jenis is selected', () => {
    renderGeneratePage()
    fireEvent.click(screen.getByText('UAS'))
    const input = screen.getByLabelText('Jumlah Soal') as HTMLInputElement
    expect(input.value).toBe('25')
  })

  it('shows error when value is below 5', () => {
    renderGeneratePage()
    const input = screen.getByLabelText('Jumlah Soal')
    fireEvent.change(input, { target: { value: '3' } })
    expect(screen.getByText('Minimum 5 soal')).toBeInTheDocument()
  })

  it('shows error when value is above 50', () => {
    renderGeneratePage()
    const input = screen.getByLabelText('Jumlah Soal')
    fireEvent.change(input, { target: { value: '51' } })
    expect(screen.getByText('Maksimum 50 soal')).toBeInTheDocument()
  })

  it('api.ai.generate is called with totalSoal in body', async () => {
    mockApi.ai.generate.mockResolvedValueOnce(makeExamWithQuestions('exam_abc'))

    renderGeneratePage()

    // Change totalSoal to 25
    const input = screen.getByLabelText('Jumlah Soal')
    fireEvent.change(input, { target: { value: '25' } })

    await clickGenerateAndFlush()

    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({ totalSoal: 25 }),
    )
  })
})

describe('GeneratePage — runGenerate flow', () => {
  it('calls api.ai.generate and navigates to /review with examId on success', async () => {
    mockApi.ai.generate.mockResolvedValueOnce(makeExamWithQuestions('exam_abc'))

    renderGeneratePage()
    await clickGenerateAndFlush()

    expect(mockApi.ai.generate).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/review',
        search: expect.objectContaining({
          examId: 'exam_abc',
          from: 'generate',
        }),
      }),
    )
  })

  it('does NOT navigate when api.ai.generate rejects', async () => {
    mockApi.ai.generate.mockRejectedValueOnce(new Error('AI generation failed'))

    renderGeneratePage()
    await clickGenerateAndFlush()

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows the API error message in the failure dialog', async () => {
    mockApi.ai.generate.mockRejectedValueOnce(
      new ApiError({
        message: 'Expected 40 questions, got 20',
        code: 'AI_GENERATION_ERROR',
        status: 502,
      }),
    )

    renderGeneratePage()
    await clickGenerateAndFlush()

    expect(screen.getByRole('dialog')).toHaveTextContent('Expected 40 questions, got 20')
  })

  it('uses the dynamic examId from api response, not a fixed value', async () => {
    mockApi.ai.generate.mockResolvedValueOnce(makeExamWithQuestions('exam_from_server_42'))

    renderGeneratePage()
    await clickGenerateAndFlush()

    const call = mockNavigate.mock.calls[0]?.[0] as Record<string, unknown>
    const search = call?.['search'] as Record<string, unknown>
    expect(search?.['examId']).toBe('exam_from_server_42')
  })
})

describe('Atur komposisi panel', () => {
  it('is collapsed by default: the 3 number inputs are not visible', () => {
    renderGeneratePage()
    expect(screen.queryByLabelText(/PG Pilihan Tunggal/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/PG Pilihan Jamak/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Benar\/Salah/i)).not.toBeInTheDocument()
  })

  it('SAS auto-fill: selecting UAS fills {mcqSingle:15, mcqMulti:5, trueFalse:5} when expanded', () => {
    renderGeneratePage()
    // Select SAS jenis
    fireEvent.click(screen.getByText('UAS'))
    // Expand the panel
    fireEvent.click(screen.getByRole('button', { name: /atur komposisi/i }))
    // Inputs should now be visible with correct defaults
    expect((screen.getByLabelText(/PG Pilihan Tunggal/i) as HTMLInputElement).value).toBe('15')
    expect((screen.getByLabelText(/PG Pilihan Jamak/i) as HTMLInputElement).value).toBe('5')
    expect((screen.getByLabelText(/Benar\/Salah/i) as HTMLInputElement).value).toBe('5')
  })

  it('shows sum validation error when composition does not equal totalSoal', () => {
    renderGeneratePage()
    // Expand the panel
    fireEvent.click(screen.getByRole('button', { name: /atur komposisi/i }))
    // Break the sum: change mcqSingle to 10 (default total is 20, so 10+0+0=10 !== 20)
    const mcqSingleInput = screen.getByLabelText(/PG Pilihan Tunggal/i)
    fireEvent.change(mcqSingleInput, { target: { value: '10' } })
    expect(screen.getByText('Total harus sama dengan 20')).toBeInTheDocument()
  })

  it('includes composition in the API payload on submit', async () => {
    mockApi.ai.generate.mockResolvedValueOnce(makeExamWithQuestions('exam_abc'))

    renderGeneratePage()
    // Expand panel; default formatif composition is {20,0,0} which sums to 20 == totalSoal
    fireEvent.click(screen.getByRole('button', { name: /atur komposisi/i }))

    await clickGenerateAndFlush()

    expect(mockApi.ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        composition: expect.objectContaining({ mcqSingle: 20, mcqMulti: 0, trueFalse: 0 }),
      }),
    )
  })

  it('totalSoal rescale: changing totalSoal re-applies profile default composition scaled to new total', () => {
    renderGeneratePage()
    // Select SAS: profile {15,5,5} totalSoal=25
    fireEvent.click(screen.getByText('UAS'))
    // Expand panel to verify values
    fireEvent.click(screen.getByRole('button', { name: /atur komposisi/i }))
    // Verify initial SAS composition
    expect((screen.getByLabelText(/PG Pilihan Tunggal/i) as HTMLInputElement).value).toBe('15')
    // Change totalSoal to 50 → should rescale: 15/25*50=30, 5/25*50=10, trueFalse=50-30-10=10
    const totalSoalInput = screen.getByLabelText('Jumlah Soal')
    fireEvent.change(totalSoalInput, { target: { value: '50' } })
    expect((screen.getByLabelText(/PG Pilihan Tunggal/i) as HTMLInputElement).value).toBe('30')
    expect((screen.getByLabelText(/PG Pilihan Jamak/i) as HTMLInputElement).value).toBe('10')
    expect((screen.getByLabelText(/Benar\/Salah/i) as HTMLInputElement).value).toBe('10')
  })
})
