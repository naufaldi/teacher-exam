import './setup.js'
import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  getLoader,
  mockExamsGet,
  mockQuestionsRegenerate,
  renderReviewPage,
  setReviewSearch,
} from './setup.js'
import { Route } from '../../_auth.review.js'
import { makeExamWithQuestions } from './fixtures.js'

describe('ReviewPage — generation salvage', () => {
  it('shows Regenerate on fast track for generationFailed soal', async () => {
    setReviewSearch({ mode: 'fast', examId: 'exam_salvage_fast' })
    const exam = makeExamWithQuestions('exam_salvage_fast')
    const first = exam.questions[0]!
    mockExamsGet.mockResolvedValueOnce({
      ...exam,
      generationIncomplete: true,
      failedQuestionNumbers: [1],
      questions: [
        {
          ...first,
          generationFailed: true,
          status: 'pending',
          text: 'Soal belum berhasil dibuat — gunakan Regenerate untuk membuat ulang.',
          validationStatus: 'needs_review',
          validationReason: 'Schema gagal',
        },
        ...exam.questions.slice(1),
      ],
    })
    await getLoader()({ deps: { examId: 'exam_salvage_fast' } })

    renderReviewPage()

    expect(await screen.findByTestId('generation-incomplete-banner')).toBeInTheDocument()
    expect(screen.getByTestId('fast-regenerate-1')).toBeInTheDocument()
    expect(screen.queryByTestId('curriculum-badge-needs_review')).not.toBeInTheDocument()
  })

  it('shows Meregenerate while regenerate is pending', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'fast', examId: 'exam_salvage_loading' })
    const exam = makeExamWithQuestions('exam_salvage_loading')
    const first = exam.questions[0]!
    mockExamsGet.mockResolvedValueOnce({
      ...exam,
      generationIncomplete: true,
      failedQuestionNumbers: [1],
      questions: [
        {
          ...first,
          generationFailed: true,
          status: 'pending',
          text: 'Soal belum berhasil dibuat — gunakan Regenerate untuk membuat ulang.',
          validationStatus: 'needs_review',
        },
        ...exam.questions.slice(1),
      ],
    })
    await getLoader()({ deps: { examId: 'exam_salvage_loading' } })

    let resolveRegenerate!: (value: unknown) => void
    mockQuestionsRegenerate.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRegenerate = resolve
        }),
    )

    renderReviewPage()
    await screen.findByTestId('fast-regenerate-1')

    await user.click(screen.getByTestId('fast-regenerate-1'))

    expect(screen.getByTestId('fast-regenerate-1')).toHaveTextContent('Meregenerate…')

    resolveRegenerate({
      ...first,
      generationFailed: undefined,
      text: 'Soal baru setelah regenerate',
      validationStatus: null,
      validationReason: null,
      status: 'pending',
    })

    await waitFor(() => {
      expect(screen.queryByTestId('fast-regenerate-1')).not.toBeInTheDocument()
    })
    expect(screen.queryByTestId('curriculum-badge-valid')).not.toBeInTheDocument()
  })

  it('disables preview when generationFailed soal remain', async () => {
    setReviewSearch({ mode: 'fast', examId: 'exam_salvage_preview' })
    const exam = makeExamWithQuestions('exam_salvage_preview')
    const first = exam.questions[0]!
    mockExamsGet.mockResolvedValueOnce({
      ...exam,
      generationIncomplete: true,
      failedQuestionNumbers: [1],
      schoolName: 'SD Test',
      academicYear: '2024/2025',
      examDate: '2024-06-01',
      durationMinutes: 60,
      questions: [
        {
          ...first,
          generationFailed: true,
          status: 'pending',
          text: 'Soal belum berhasil dibuat — gunakan Regenerate untuk membuat ulang.',
          validationStatus: 'needs_review',
        },
        ...exam.questions.slice(1),
      ],
    })
    await getLoader()({ deps: { examId: 'exam_salvage_preview' } })

    renderReviewPage()
    await screen.findByTestId('fast-regenerate-1')

    const previewBtn = screen.getByRole('button', { name: /preview lembar/i })
    expect(previewBtn).toBeDisabled()
  })
})

describe('ReviewRoute — pendingComponent', () => {
  it('route has pendingComponent for loading state during navigation', () => {
    const options = (Route as { options: { pendingComponent?: unknown } }).options
    expect(options.pendingComponent).toBeDefined()
  })
})
