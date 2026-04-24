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

import { api } from '../../lib/api.js'
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
      id: `q-${i + 1}`,
      examId: id,
      number: i + 1,
      text: `Question ${i + 1}`,
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctAnswer: 'a' as const,
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

  it('uses the dynamic examId from api response, not a fixed value', async () => {
    mockApi.ai.generate.mockResolvedValueOnce(makeExamWithQuestions('exam_from_server_42'))

    renderGeneratePage()
    await clickGenerateAndFlush()

    const call = mockNavigate.mock.calls[0]?.[0] as Record<string, unknown>
    const search = call?.['search'] as Record<string, unknown>
    expect(search?.['examId']).toBe('exam_from_server_42')
  })
})
