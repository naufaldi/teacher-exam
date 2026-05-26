import './setup.js'
import { mockApiSpyResolvedValue } from '../../../lib/api-test-utils.js'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getLoader, mockExamsGet, renderReviewPage, setReviewSearch,
  mockApiResolvedValueOnce} from './setup.js'
import { api } from '../../../lib/api.js'
import { makeExamWithQuestions, makeExamWithOneAccepted } from './fixtures.js'

describe('ReviewPage — Slow Track Terima wires to api.questions.patch', () => {
  it('calls api.questions.patch with status=accepted when Terima is clicked', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_terima' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_terima'))
    await getLoader()({ deps: { examId: 'exam_terima' } })

    const patchSpy = mockApiSpyResolvedValue(vi.spyOn(api.questions, 'patch'), {
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
    setReviewSearch({ mode: 'slow', examId: 'exam_terima_semua' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_terima_semua'))
    await getLoader()({ deps: { examId: 'exam_terima_semua' } })

    const patchSpy = mockApiSpyResolvedValue(vi.spyOn(api.questions, 'patch'), {
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
    setReviewSearch({ mode: 'slow', examId: 'exam_partial_fail' })

    const exam = makeExamWithQuestions('exam_partial_fail')
    const threeQuestions = exam.questions.slice(0, 3)
    mockApiResolvedValueOnce(mockExamsGet, { ...exam, questions: threeQuestions })
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

    await waitFor(() => {
      const acceptedLabels = screen.getAllByText('Diterima')
      expect(acceptedLabels).toHaveLength(2)
    })

    patchSpy.mockRestore()
  })
})

describe('ReviewPage — Slow Track accepted card state machine', () => {
  it('hides Terima and shows Batalkan terima on an accepted card', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_accepted_state' })
    const exam = makeExamWithOneAccepted()
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_accepted_state' } })

    renderReviewPage()

    await screen.findAllByText('Question 1')

    expect(screen.getByRole('button', { name: /Batalkan terima/i })).toBeInTheDocument()

    const terimaButtons = screen.getAllByRole('button', { name: /^Terima$/i })
    expect(terimaButtons).toHaveLength(19)
  })

  it('hides Tolak on an accepted card', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_accepted_tolak' })
    const exam = makeExamWithOneAccepted('exam_accepted_tolak')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_accepted_tolak' } })

    renderReviewPage()

    await screen.findAllByText('Question 1')

    const tolakButtons = screen.getAllByRole('button', { name: /^Tolak$/i })
    expect(tolakButtons).toHaveLength(19)
  })

  it('clicking Batalkan terima calls PATCH with pending and reverts card to pending state', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_undo_accept' })
    const exam = makeExamWithOneAccepted('exam_undo_accept')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_undo_accept' } })

    const patchSpy = mockApiSpyResolvedValue(vi.spyOn(api.questions, 'patch'), {
      ...exam.questions[0]!,
      status: 'pending' as const,
    })

    renderReviewPage()

    const batalkanBtn = await screen.findByRole('button', { name: /Batalkan terima/i })
    await user.click(batalkanBtn)

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith('q-1', { status: 'pending' }),
    )

    expect(screen.getAllByRole('button', { name: /^Terima$/i })).toHaveLength(20)

    patchSpy.mockRestore()
  })

  it('does not call PATCH twice when Terima is clicked on a pending card (idempotency: one click = one PATCH)', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_idempotent' })
    const exam = makeExamWithQuestions('exam_idempotent')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_idempotent' } })

    const patchSpy = mockApiSpyResolvedValue(vi.spyOn(api.questions, 'patch'), {
      ...exam.questions[0]!,
      status: 'accepted' as const,
    })

    renderReviewPage()

    const terimaButtons = screen.getAllByRole('button', { name: /^Terima$/i })
    await user.click(terimaButtons[0]!)
    await waitFor(() => expect(patchSpy).toHaveBeenCalledTimes(1))

    expect(patchSpy).toHaveBeenCalledTimes(1)

    patchSpy.mockRestore()
  })

  it('disables Terima Semua when all questions are already accepted', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_all_accepted' })
    const base = makeExamWithQuestions('exam_all_accepted')
    const allAccepted = {
      ...base,
      reviewMode: 'slow' as const,
      questions: base.questions.map((q) => ({ ...q, status: 'accepted' as const })),
    }
    mockApiResolvedValueOnce(mockExamsGet, allAccepted)
    await getLoader()({ deps: { examId: 'exam_all_accepted' } })

    renderReviewPage()

    await screen.findAllByText('Question 1')

    const terimaSemuaBtn = screen.getByRole('button', { name: /Terima Semua/i })
    expect(terimaSemuaBtn).toBeDisabled()
  })
})
