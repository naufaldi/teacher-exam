import './setup.js'
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ExamWithQuestions } from '@teacher-exam/shared'
import {
  getLoader,
  mockExamsGet,
  renderReviewPage,
  setReviewSearch,
  mockApiResolvedValueOnce} from './setup.js'
import { makeExamWithQuestions, makeExamWithMixedTypes, makeExamWithValidation } from './fixtures.js'

describe('ReviewPage — Task 13: Fast mode badges show correct label per type', () => {
  it('mcq_multi question badge shows "Kunci A, C"', async () => {
    setReviewSearch({ mode: 'fast', examId: 'exam_mixed' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithMixedTypes('exam_mixed') as ExamWithQuestions)
    await getLoader()({ deps: { examId: 'exam_mixed' } })

    renderReviewPage()

    expect(screen.getByText('Kunci A, C')).toBeInTheDocument()
  })

  it('true_false question badge shows "Kunci B, S, B"', async () => {
    setReviewSearch({ mode: 'fast', examId: 'exam_mixed2' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithMixedTypes('exam_mixed2') as ExamWithQuestions)
    await getLoader()({ deps: { examId: 'exam_mixed2' } })

    renderReviewPage()

    expect(screen.getByText('Kunci B, S, B')).toBeInTheDocument()
  })

  it('shows fast mode legend in fast mode only', async () => {
    setReviewSearch({ mode: 'fast', examId: 'exam_legend_fast' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_legend_fast'))
    await getLoader()({ deps: { examId: 'exam_legend_fast' } })

    renderReviewPage()

    expect(screen.getByTestId('fast-mode-legend')).toBeInTheDocument()
  })

  it('hides fast mode legend in slow mode', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_legend_slow' })
    mockApiResolvedValueOnce(mockExamsGet, {
      ...makeExamWithQuestions('exam_legend_slow'),
      reviewMode: 'slow' as const,
    })
    await getLoader()({ deps: { examId: 'exam_legend_slow' } })

    renderReviewPage()

    expect(screen.queryByTestId('fast-mode-legend')).not.toBeInTheDocument()
  })
})

describe('ReviewPage — Task 13: Slow mode card highlights correctly', () => {
  it('mcq_multi card highlights both correct letters A and C', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_mixed_slow' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithMixedTypes('exam_mixed_slow') as ExamWithQuestions)
    await getLoader()({ deps: { examId: 'exam_mixed_slow' } })

    renderReviewPage()

    const optionA = screen.getByTestId('slow-option-a-q-multi-1')
    const optionC = screen.getByTestId('slow-option-c-q-multi-1')
    expect(optionA).toHaveClass('bg-success-bg')
    expect(optionC).toHaveClass('bg-success-bg')
  })

  it('true_false card shows 3 statement rows with B/S indicators', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_mixed_slow2' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithMixedTypes('exam_mixed_slow2') as ExamWithQuestions)
    await getLoader()({ deps: { examId: 'exam_mixed_slow2' } })

    renderReviewPage()

    expect(screen.getAllByText('B')).toHaveLength(2)
    expect(screen.getAllByText('S')).toHaveLength(1)
  })
})

describe('ReviewPage — math rendering', () => {
  it('renders LaTeX in fast review list without dollar signs', async () => {
    setReviewSearch({ mode: 'fast', examId: 'exam_math_fast' })
    const exam = makeExamWithQuestions('exam_math_fast')
    mockApiResolvedValueOnce(mockExamsGet, {
      ...exam,
      subject: 'matematika',
      questions: [{
        ...exam.questions[0]!,
        text: 'Hasil dari $5.678 + 3.421$ adalah ....',
      }],
    })
    await getLoader()({ deps: { examId: 'exam_math_fast' } })

    const { container } = renderReviewPage()

    expect(container.querySelector('.katex')).not.toBeNull()
    expect(container.textContent).not.toContain('$')
  })

  it('renders LaTeX in slow review cards', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_math_review' })
    const exam = makeExamWithQuestions('exam_math_review')
    mockApiResolvedValueOnce(mockExamsGet, {
      ...exam,
      subject: 'matematika',
      questions: [{
        ...exam.questions[0]!,
        text: 'Hitung $\\frac{3}{4}$ dari 20.',
        options: { a: '$15$', b: '$10$', c: '$5$', d: '$20$' },
      }],
    })
    await getLoader()({ deps: { examId: 'exam_math_review' } })

    const { container } = renderReviewPage()

    expect(container.querySelectorAll('.katex').length).toBeGreaterThan(1)
    expect(container.textContent).not.toContain('$')
  })
})

describe('ReviewPage — figure rendering', () => {
  it('renders generated figure specs in slow review cards', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_figure_review' })
    const exam = makeExamWithQuestions('exam_figure_review')
    mockApiResolvedValueOnce(mockExamsGet, {
      ...exam,
      subject: 'matematika',
      questions: [{
        ...exam.questions[0]!,
        topic: 'Bangun Datar',
        text: 'Perhatikan lingkaran berikut.',
        figure: { type: 'circle', radius: 7, label: 'r = 7 cm' },
      }],
    })
    await getLoader()({ deps: { examId: 'exam_figure_review' } })

    const { container } = renderReviewPage()

    expect(container.querySelector('[data-figure-svg]')).not.toBeNull()
  })

  it('renders generated figure specs in fast review cards', async () => {
    setReviewSearch({ mode: 'fast', examId: 'exam_figure_fast' })
    const exam = makeExamWithQuestions('exam_figure_fast')
    mockApiResolvedValueOnce(mockExamsGet, {
      ...exam,
      subject: 'matematika',
      questions: [{
        ...exam.questions[0]!,
        topic: 'Bangun Datar',
        text: 'Perhatikan lingkaran berikut.',
        figure: { type: 'circle', radius: 7, label: 'r = 7 cm' },
      }],
    })
    await getLoader()({ deps: { examId: 'exam_figure_fast' } })

    const { container } = renderReviewPage()

    expect(container.querySelector('[data-figure-svg]')).not.toBeNull()
  })
})

describe('ReviewPage — Penjaga Kurikulum badges', () => {
  it('shows curriculum badges in fast mode', async () => {
    setReviewSearch({ mode: 'fast', examId: 'exam_val_fast' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithValidation('exam_val_fast'))
    await getLoader()({ deps: { examId: 'exam_val_fast' } })

    renderReviewPage()

    expect(await screen.findByTestId('curriculum-badge-needs_review')).toBeInTheDocument()
    expect(screen.getAllByTestId('curriculum-badge-valid').length).toBeGreaterThan(0)
  })

  it('shows curriculum badges in slow mode', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_val_slow' })
    const exam = { ...makeExamWithValidation('exam_val_slow'), reviewMode: 'slow' as const }
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_val_slow' } })

    renderReviewPage()

    await screen.findAllByText('Question 1')
    expect(screen.getAllByTestId('curriculum-badge-needs_review').length).toBeGreaterThan(0)
  })

  it('filters to flagged questions when Perlu review only is checked', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'fast', examId: 'exam_val_filter' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithValidation('exam_val_filter'))
    await getLoader()({ deps: { examId: 'exam_val_filter' } })

    renderReviewPage()
    await screen.findByText('Question 1')

    await user.click(screen.getByTestId('review-only-filter'))

    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.queryByText('Question 2')).not.toBeInTheDocument()
  })
})
