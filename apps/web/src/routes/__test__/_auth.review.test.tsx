import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import type { ExamWithQuestions } from '@teacher-exam/shared'

const mockNavigate = vi.fn<(opts: unknown) => Promise<void>>()

// Mutable so individual tests can override search params (e.g. from=generate scenario)
let mockSearchParams: { mode: 'fast' | 'slow'; from?: 'generate'; examId?: string } = {
  mode: 'fast',
}

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useSearch: () => mockSearchParams,
      useLoaderData: () => undefined,
    }),
    useNavigate: () => mockNavigate,
    useSearch: () => mockSearchParams,
    redirect: ({ to }: { to: string }) =>
      Object.assign(new Error(`Redirect to ${to}`), { isRedirect: true, to }),
  }
})

vi.mock('../../lib/api.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../lib/api.js')>()
  return {
    ...orig,
    api: {
      ...orig.api,
      exams: { ...orig.api.exams, get: vi.fn() },
      questions: { patch: vi.fn() },
    },
  }
})

vi.mock('@teacher-exam/ui', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@teacher-exam/ui')>()
  return {
    ...orig,
    useToast: () => ({ toast: vi.fn() }),
  }
})

import { api } from '../../lib/api.js'
import { Route } from '../_auth.review.js'
import { examDraftStore } from '../../lib/exam-draft-store.js'

const mockExamsGet = (api as unknown as { exams: { get: ReturnType<typeof vi.fn> } }).exams.get
const mockQuestionsPatch = (api as unknown as { questions: { patch: ReturnType<typeof vi.fn> } }).questions.patch

const NOW = '2024-01-01T00:00:00.000Z'

function makeExamWithQuestions(id = 'exam_123'): ExamWithQuestions {
  return {
    id,
    userId: 'user_1',
    title: 'Bahasa Indonesia · Kelas 6 · Teks Narasi',
    subject: 'bahasa_indonesia',
    grade: 6,
    difficulty: 'sedang',
    topic: 'Teks Narasi',
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

type RouteOptions = {
  component: React.ComponentType
  loader?: (ctx: { deps: Record<string, unknown> }) => Promise<unknown>
}

function getLoader() {
  return (Route as unknown as { options: RouteOptions }).options.loader!
}

function renderReviewPage() {
  const ReviewPage = (Route as unknown as { options: RouteOptions }).options.component
  return render(<ReviewPage />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockNavigate.mockResolvedValue(undefined)
  examDraftStore.reset()
  mockSearchParams = { mode: 'fast' }
})

describe('ReviewPage — loader', () => {
  it('calls api.exams.get and seeds examDraftStore when examId is present', async () => {
    mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('exam_123'))

    const loader = getLoader()
    await loader({ deps: { examId: 'exam_123' } })

    expect(mockExamsGet).toHaveBeenCalledWith('exam_123')
    const { questions } = examDraftStore.getSnapshot()
    expect(questions).toHaveLength(20)
    expect(questions[0]?.text).toBe('Question 1')
  })

  it('throws redirect to /dashboard when examId is absent', async () => {
    const loader = getLoader()
    await expect(loader({ deps: {} })).rejects.toMatchObject({ isRedirect: true, to: '/dashboard' })
  })
})

describe('ReviewPage — component', () => {
  it('renders questions seeded by loader (not mock data)', async () => {
    mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('exam_456'))
    await getLoader()({ deps: { examId: 'exam_456' } })

    renderReviewPage()
    expect(screen.getByText('Question 1')).toBeInTheDocument()
  })
})

describe('ReviewPage — Slow Track reject wires to api.questions.patch', () => {
  it('calls api.questions.patch with status=rejected when Tolak is confirmed', async () => {
    const user = userEvent.setup()
    mockSearchParams = { mode: 'slow', examId: 'exam_slow' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('exam_slow'))
    await getLoader()({ deps: { examId: 'exam_slow' } })

    mockQuestionsPatch.mockResolvedValueOnce({ id: 'q-1', status: 'rejected' })

    renderReviewPage()

    // Click the first individual card Tolak button (not the bulk "Ganti ditolak")
    // The button text is " Tolak" with an icon — find all matching and pick the first
    const tolakButtons = screen.getAllByText('Tolak')
    await user.click(tolakButtons[0]!)

    // Confirm in the AlertDialog — button text is "Tolak & ganti"
    const confirmButton = await screen.findByText('Tolak & ganti')
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockQuestionsPatch).toHaveBeenCalledWith('q-1', { status: 'rejected' })
    })
  })

  it('reverts question status to pending when api.questions.patch fails', async () => {
    const user = userEvent.setup()
    mockSearchParams = { mode: 'slow', examId: 'exam_slow2' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('exam_slow2'))
    await getLoader()({ deps: { examId: 'exam_slow2' } })

    mockQuestionsPatch.mockRejectedValueOnce(new Error('Network error'))

    renderReviewPage()

    const tolakButtons = screen.getAllByText('Tolak')
    await user.click(tolakButtons[0]!)

    const confirmButton = await screen.findByText('Tolak & ganti')
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockQuestionsPatch).toHaveBeenCalledWith('q-1', { status: 'rejected' })
    })
  })
})

describe('ReviewPage — Edit dialog saves via api.questions.patch', () => {
  it('reverts question text in store when api.questions.patch rejects', async () => {
    const user = userEvent.setup()
    mockSearchParams = { mode: 'fast', examId: 'exam_edit_fail' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('exam_edit_fail'))
    await getLoader()({ deps: { examId: 'exam_edit_fail' } })

    const patchSpy = vi.spyOn(api.questions, 'patch').mockRejectedValue(new Error('Network error'))

    renderReviewPage()

    const editButton = screen.getByRole('button', { name: 'Edit cepat soal 1' })
    await user.click(editButton)

    const textArea = await screen.findByLabelText(/teks soal/i)
    await user.clear(textArea)
    await user.type(textArea, 'Teks yang gagal')

    const saveButton = screen.getByRole('button', { name: /simpan perubahan/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('q-1', { text: 'Teks yang gagal' })
    })

    // After failure, the store should have been reverted to the original text
    await waitFor(() => {
      const { questions } = examDraftStore.getSnapshot()
      expect(questions[0]?.text).toBe('Question 1')
    })

    patchSpy.mockRestore()
  })

  it('calls api.questions.patch with only changed fields when text is modified', async () => {
    const user = userEvent.setup()
    mockSearchParams = { mode: 'fast', examId: 'exam_edit' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('exam_edit'))
    await getLoader()({ deps: { examId: 'exam_edit' } })

    const patchSpy = vi.spyOn(api.questions, 'patch').mockResolvedValue({
      id: 'q-1',
      examId: 'exam_edit',
      number: 1,
      text: 'Teks baru',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctAnswer: 'a' as const,
      topic: null,
      difficulty: null,
      status: 'accepted' as const,
      validationStatus: null,
      validationReason: null,
      createdAt: new Date().toISOString(),
    })

    renderReviewPage()

    const editButton = screen.getByRole('button', { name: 'Edit cepat soal 1' })
    await user.click(editButton)

    const textArea = await screen.findByLabelText(/teks soal/i)
    await user.clear(textArea)
    await user.type(textArea, 'Teks baru')

    const saveButton = screen.getByRole('button', { name: /simpan perubahan/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('q-1', { text: 'Teks baru' })
    })

    patchSpy.mockRestore()
  })
})

describe('ReviewPage — from=generate URL strip', () => {
  it('preserves examId in URL when stripping ?from=generate', async () => {
    // Seed store so the component renders without crashing
    mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('exam_xyz'))
    await getLoader()({ deps: { examId: 'exam_xyz' } })

    // Simulate arriving from /generate with all three search params present
    mockSearchParams = { mode: 'fast', from: 'generate', examId: 'exam_xyz' }

    renderReviewPage()

    // The effect fires on mount — navigate must keep examId so a refresh re-loads the exam
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/review',
        replace: true,
        search: expect.objectContaining({ mode: 'fast', examId: 'exam_xyz' }),
      }),
    )
  })
})
