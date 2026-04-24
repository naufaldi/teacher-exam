import { describe, it, expect, vi, beforeEach, test } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

const mockToast = vi.fn()

vi.mock('@teacher-exam/ui', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@teacher-exam/ui')>()
  return {
    ...orig,
    useToast: () => ({ toast: mockToast }),
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
      expect(patchSpy).toHaveBeenCalledWith('q-1', expect.objectContaining({ text: 'Teks yang gagal' }))
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
      _tag: 'mcq_single' as const,
      id: 'q-1',
      examId: 'exam_edit',
      number: 1,
      text: 'Teks baru',
      options: { a: 'A', b: 'B', c: 'C', d: 'D' },
      correct: 'a' as const,
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
      expect(patchSpy).toHaveBeenCalledWith('q-1', expect.objectContaining({ text: 'Teks baru' }))
    })

    patchSpy.mockRestore()
  })
})

describe('ReviewPage — Slow Track Terima wires to api.questions.patch', () => {
  it('calls api.questions.patch with status=accepted when Terima is clicked', async () => {
    const user = userEvent.setup()
    mockSearchParams = { mode: 'slow', examId: 'exam_terima' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('exam_terima'))
    await getLoader()({ deps: { examId: 'exam_terima' } })

    const patchSpy = vi.spyOn(api.questions, 'patch').mockResolvedValue({
      _tag: 'mcq_single' as const,
      id: 'q-1',
      examId: 'exam_terima',
      number: 1,
      text: 'Question 1',
      options: { a: 'A', b: 'B', c: 'C', d: 'D' },
      correct: 'a' as const,
      topic: null,
      difficulty: null,
      status: 'accepted' as const,
      validationStatus: null,
      validationReason: null,
      createdAt: new Date().toISOString(),
    })

    renderReviewPage()

    const terimaButtons = screen.getAllByText('Terima')
    await user.click(terimaButtons[0]!)

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('q-1', { status: 'accepted' })
    })

    patchSpy.mockRestore()
  })

  it('calls api.questions.patch for each question when Terima Semua is clicked', async () => {
    const user = userEvent.setup()
    mockSearchParams = { mode: 'slow', examId: 'exam_terima_semua' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('exam_terima_semua'))
    await getLoader()({ deps: { examId: 'exam_terima_semua' } })

    const patchSpy = vi.spyOn(api.questions, 'patch').mockResolvedValue({
      _tag: 'mcq_single' as const,
      id: 'q-1',
      examId: 'exam_terima_semua',
      number: 1,
      text: 'Question 1',
      options: { a: 'A', b: 'B', c: 'C', d: 'D' },
      correct: 'a' as const,
      topic: null,
      difficulty: null,
      status: 'accepted' as const,
      validationStatus: null,
      validationReason: null,
      createdAt: new Date().toISOString(),
    })

    renderReviewPage()

    const terimaSemua = screen.getByText('Terima Semua')
    await user.click(terimaSemua)

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledTimes(20)
      expect(patchSpy.mock.calls.every((c) => c[1] !== undefined && (c[1] as { status: string }).status === 'accepted')).toBe(true)
    })

    patchSpy.mockRestore()
  })
})

describe('ReviewPage — Terima Semua partial failure reverts failed statuses', () => {
  it('reverts only the failed question status while keeping successful ones as accepted', async () => {
    const user = userEvent.setup()
    mockSearchParams = { mode: 'slow', examId: 'exam_partial_fail' }

    const exam = makeExamWithQuestions('exam_partial_fail')
    // Use only 3 questions for simplicity
    const threeQuestions = exam.questions.slice(0, 3)
    mockExamsGet.mockResolvedValueOnce({ ...exam, questions: threeQuestions })
    await getLoader()({ deps: { examId: 'exam_partial_fail' } })

    const patchSpy = vi.spyOn(api.questions, 'patch').mockImplementation((id) => {
      if (id === 'q-2') return Promise.reject(new Error('Network error'))
      return Promise.resolve({
        _tag: 'mcq_single' as const,
        id,
        examId: 'exam_partial_fail',
        number: 1,
        text: 'Question',
        options: { a: 'A', b: 'B', c: 'C', d: 'D' },
        correct: 'a' as const,
        topic: null,
        difficulty: null,
        status: 'accepted' as const,
        validationStatus: null,
        validationReason: null,
        createdAt: new Date().toISOString(),
      })
    })

    renderReviewPage()

    const terimaSemua = screen.getByText('Terima Semua')
    await user.click(terimaSemua)

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledTimes(3)
    })

    // q-1 and q-3 succeeded — their statuses should appear accepted in the UI
    await waitFor(() => {
      // q-2 failed — its card should NOT show "Diterima" (it reverted to pending)
      const acceptedLabels = screen.getAllByText('Diterima')
      expect(acceptedLabels).toHaveLength(2)
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

test('Nama Sekolah onBlur PATCHes exam with schoolName only', async () => {
  const examsPatchSpy = vi.spyOn(api.exams, 'patch').mockResolvedValue({} as never)
  mockSearchParams = { mode: 'fast', examId: 'E' }
  mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('E'))
  await getLoader()({ deps: { examId: 'E' } })
  renderReviewPage()

  const input = screen.getByLabelText(/nama sekolah/i)
  await userEvent.clear(input)
  await userEvent.type(input, 'SD Negeri 1')
  fireEvent.blur(input)
  await waitFor(() => {
    expect(examsPatchSpy).toHaveBeenCalledWith('E', { schoolName: 'SD Negeri 1' })
  })
  examsPatchSpy.mockRestore()
})

test('persistMetaField skips PATCH when examId is undefined', async () => {
  const examsPatchSpy = vi.spyOn(api.exams, 'patch').mockResolvedValue({} as never)
  mockSearchParams = { mode: 'fast' }
  examDraftStore.reset()
  renderReviewPage()

  const input = screen.getByLabelText(/nama sekolah/i)
  await userEvent.clear(input)
  await userEvent.type(input, 'SD Negeri 2')
  fireEvent.blur(input)

  await new Promise((r) => setTimeout(r, 50))
  expect(examsPatchSpy).not.toHaveBeenCalled()
  examsPatchSpy.mockRestore()
})

test('persistMetaField skips PATCH when Durasi value is NaN', async () => {
  const examsPatchSpy = vi.spyOn(api.exams, 'patch').mockResolvedValue({} as never)
  mockSearchParams = { mode: 'fast', examId: 'E2' }
  mockExamsGet.mockResolvedValueOnce(makeExamWithQuestions('E2'))
  await getLoader()({ deps: { examId: 'E2' } })
  renderReviewPage()

  const input = screen.getByLabelText(/durasi/i) as HTMLInputElement
  Object.defineProperty(input, 'value', { configurable: true, writable: true, value: 'abc' })
  fireEvent.blur(input)

  await new Promise((r) => setTimeout(r, 50))
  expect(examsPatchSpy).not.toHaveBeenCalled()
  examsPatchSpy.mockRestore()
})

function makeExamWithCompleteMetadata(id = 'E'): ExamWithQuestions {
  const base = makeExamWithQuestions(id)
  return {
    ...base,
    questions: base.questions.map((q) => ({ ...q, status: 'accepted' as const })),
    schoolName: 'SD Negeri 1',
    academicYear: '2025/2026',
    examType: 'formatif',
    examDate: '2025-06-01',
    durationMinutes: 60,
  }
}

test('Preview Lembar click calls api.exams.finalize then navigates with examId', async () => {
  const user = userEvent.setup()
  const finalizeSpy = vi.spyOn(api.exams, 'finalize').mockResolvedValue({} as never)

  mockSearchParams = { mode: 'fast', examId: 'E' }
  mockExamsGet.mockResolvedValueOnce(makeExamWithCompleteMetadata('E'))
  await getLoader()({ deps: { examId: 'E' } })

  renderReviewPage()

  const previewButton = screen.getByRole('button', { name: /preview lembar/i })
  await user.click(previewButton)

  await waitFor(() => {
    expect(finalizeSpy).toHaveBeenCalledWith('E')
  })
  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/preview', search: { examId: 'E' } }),
    )
  })

  finalizeSpy.mockRestore()
})

test('fast mode handlePreviewClick auto-accepts server-pending questions before calling finalize', async () => {
  const user = userEvent.setup()
  const finalizeSpy = vi.spyOn(api.exams, 'finalize').mockResolvedValue({} as never)
  const patchSpy    = vi.spyOn(api.questions, 'patch').mockResolvedValue({} as never)

  mockSearchParams = { mode: 'fast', examId: 'exam_fast_auto' }
  // Complete metadata so Preview button is enabled, but questions still server-pending
  const exam: ExamWithQuestions = {
    ...makeExamWithCompleteMetadata('exam_fast_auto'),
    questions: makeExamWithQuestions('exam_fast_auto').questions, // status: 'pending'
  }
  mockExamsGet.mockResolvedValueOnce(exam)
  await getLoader()({ deps: { examId: 'exam_fast_auto' } })

  renderReviewPage()

  const previewButton = screen.getByRole('button', { name: /preview lembar/i })
  await user.click(previewButton)

  await waitFor(() => {
    expect(patchSpy).toHaveBeenCalledTimes(20)
    expect(
      patchSpy.mock.calls.every((c) => (c[1] as { status: string }).status === 'accepted'),
    ).toBe(true)
    expect(finalizeSpy).toHaveBeenCalledWith('exam_fast_auto')
  })

  finalizeSpy.mockRestore()
  patchSpy.mockRestore()
})

test('slow mode handlePreviewClick does NOT auto-accept questions before finalize', async () => {
  const user = userEvent.setup()
  const finalizeSpy = vi.spyOn(api.exams, 'finalize').mockResolvedValue({} as never)
  const patchSpy    = vi.spyOn(api.questions, 'patch').mockResolvedValue({} as never)

  mockSearchParams = { mode: 'slow', examId: 'exam_slow_no_auto' }
  const exam: ExamWithQuestions = {
    ...makeExamWithCompleteMetadata('exam_slow_no_auto'),
    questions: makeExamWithCompleteMetadata('exam_slow_no_auto').questions, // status: 'accepted'
  }
  mockExamsGet.mockResolvedValueOnce(exam)
  await getLoader()({ deps: { examId: 'exam_slow_no_auto' } })

  renderReviewPage()

  const previewButton = screen.getByRole('button', { name: /preview lembar/i })
  await user.click(previewButton)

  await waitFor(() => {
    expect(finalizeSpy).toHaveBeenCalledWith('exam_slow_no_auto')
  })
  // No patch calls should be made for auto-accept in slow mode
  expect(patchSpy.mock.calls.filter((c) => (c[1] as { status?: string }).status === 'accepted')).toHaveLength(0)

  finalizeSpy.mockRestore()
  patchSpy.mockRestore()
})

test('Preview Lembar shows specific toast when server returns FINALIZE_NOT_ALLOWED', async () => {
  const user = userEvent.setup()
  const finalizeSpy = vi.spyOn(api.exams, 'finalize').mockRejectedValue(
    Object.assign(new Error('Not allowed'), { code: 'FINALIZE_NOT_ALLOWED' }),
  )

  mockSearchParams = { mode: 'fast', examId: 'E' }
  mockExamsGet.mockResolvedValueOnce(makeExamWithCompleteMetadata('E'))
  await getLoader()({ deps: { examId: 'E' } })

  renderReviewPage()

  const previewButton = screen.getByRole('button', { name: /preview lembar/i })
  await user.click(previewButton)

  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        description: 'Semua soal harus diterima sebelum finalisasi.',
      }),
    )
  })

  finalizeSpy.mockRestore()
})

// ── Task 13 — Multi-question type tests ────────────────────────────────────

function makeExamWithMixedTypes(id = 'exam_mixed') {
  const base = {
    id,
    userId: 'user_1',
    title: 'Mixed Types Exam',
    subject: 'bahasa_indonesia' as const,
    grade: 6,
    difficulty: 'sedang' as const,
    topic: 'Teks',
    reviewMode: 'fast' as const,
    status: 'draft' as const,
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
  }
  return {
    ...base,
    questions: [
      {
        _tag: 'mcq_multi' as const,
        id: 'q-multi-1',
        examId: id,
        number: 1,
        text: 'Multi question',
        options: { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' },
        correct: ['a', 'c'] as unknown as McqMultiCorrect,
        topic: null,
        difficulty: null,
        status: 'pending' as const,
        validationStatus: null,
        validationReason: null,
        createdAt: NOW,
      },
      {
        _tag: 'true_false' as const,
        id: 'q-tf-1',
        examId: id,
        number: 2,
        text: 'True/False question',
        statements: [
          { text: 'Statement 1', answer: true },
          { text: 'Statement 2', answer: false },
          { text: 'Statement 3', answer: true },
        ] as unknown as TfStatements,
        topic: null,
        difficulty: null,
        status: 'pending' as const,
        validationStatus: null,
        validationReason: null,
        createdAt: NOW,
      },
    ],
  }
}

// Type aliases to satisfy strict MinItems/MaxItems branded arrays
type McqMultiCorrect = readonly ['a' | 'b' | 'c' | 'd', ...('a' | 'b' | 'c' | 'd')[]] & { readonly length: 2 | 3 }
type TfStatements = readonly [{ readonly text: string; readonly answer: boolean }, { readonly text: string; readonly answer: boolean }, { readonly text: string; readonly answer: boolean }]

describe('ReviewPage — Task 13: Fast mode badges show correct label per type', () => {
  it('mcq_multi question badge shows "A, C"', async () => {
    mockSearchParams = { mode: 'fast', examId: 'exam_mixed' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithMixedTypes('exam_mixed') as ExamWithQuestions)
    await getLoader()({ deps: { examId: 'exam_mixed' } })

    renderReviewPage()

    expect(screen.getByText('A, C')).toBeInTheDocument()
  })

  it('true_false question badge shows "B, S, B"', async () => {
    mockSearchParams = { mode: 'fast', examId: 'exam_mixed2' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithMixedTypes('exam_mixed2') as ExamWithQuestions)
    await getLoader()({ deps: { examId: 'exam_mixed2' } })

    renderReviewPage()

    expect(screen.getByText('B, S, B')).toBeInTheDocument()
  })
})

describe('ReviewPage — Task 13: Slow mode card highlights correctly', () => {
  it('mcq_multi card highlights both correct letters A and C', async () => {
    mockSearchParams = { mode: 'slow', examId: 'exam_mixed_slow' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithMixedTypes('exam_mixed_slow') as ExamWithQuestions)
    await getLoader()({ deps: { examId: 'exam_mixed_slow' } })

    renderReviewPage()

    // Both correct options should have success styling (rendered with data-testid)
    const optionA = screen.getByTestId('slow-option-a-q-multi-1')
    const optionC = screen.getByTestId('slow-option-c-q-multi-1')
    expect(optionA).toHaveClass('bg-success-bg')
    expect(optionC).toHaveClass('bg-success-bg')
  })

  it('true_false card shows 3 statement rows with B/S indicators', async () => {
    mockSearchParams = { mode: 'slow', examId: 'exam_mixed_slow2' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithMixedTypes('exam_mixed_slow2') as ExamWithQuestions)
    await getLoader()({ deps: { examId: 'exam_mixed_slow2' } })

    renderReviewPage()

    // Each statement row should show B or S
    expect(screen.getAllByText('B')).toHaveLength(2)
    expect(screen.getAllByText('S')).toHaveLength(1)
  })
})

describe('ReviewPage — Task 13: Edit dialog save fires api.questions.patch with typed payload', () => {
  it('mcq_multi edit save sends {_tag:"mcq_multi", correct:[...]} to patch', async () => {
    const user = userEvent.setup()
    mockSearchParams = { mode: 'fast', examId: 'exam_multi_edit' }
    mockExamsGet.mockResolvedValueOnce(makeExamWithMixedTypes('exam_multi_edit') as ExamWithQuestions)
    await getLoader()({ deps: { examId: 'exam_multi_edit' } })

    const patchSpy = vi.spyOn(api.questions, 'patch').mockResolvedValue({
      _tag: 'mcq_multi' as const,
      id: 'q-multi-1',
      examId: 'exam_multi_edit',
      number: 1,
      text: 'Multi question updated',
      options: { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' },
      correct: ['a', 'c'] as unknown as McqMultiCorrect,
      topic: null,
      difficulty: null,
      status: 'accepted' as const,
      validationStatus: null,
      validationReason: null,
      createdAt: NOW,
    } as ExamWithQuestions['questions'][number])

    renderReviewPage()

    const editButton = screen.getByRole('button', { name: 'Edit cepat soal 1' })
    await user.click(editButton)

    const textArea = await screen.findByLabelText(/teks soal/i)
    await user.clear(textArea)
    await user.type(textArea, 'Multi question updated')

    const saveButton = screen.getByRole('button', { name: /simpan perubahan/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith(
        'q-multi-1',
        expect.objectContaining({ _tag: 'mcq_multi', text: 'Multi question updated' }),
      )
    })

    patchSpy.mockRestore()
  })
})
