import './setup.js'
import { Either } from 'effect'
import { mockApiSpyResolvedValue } from '../../../lib/api-test-utils.js'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Question } from '@teacher-exam/shared'
import {
  getLoader,
  mockExamsGet,
  mockQuestionsRegenerate,
  mockToast,
  renderReviewPage,
  setReviewSearch,
  mockApiResolvedValueOnce} from './setup.js'
import { api } from '../../../lib/api.js'
import { deferred } from './interactions.js'
import { makeExamWithQuestions } from './fixtures.js'

describe('ReviewPage — Slow Track Tolak fuses with AI regenerate', () => {
  it('shows loading and replaces the card when Tolak is confirmed', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_slow' })
    const exam = makeExamWithQuestions('exam_slow')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_slow' } })

    const pending = deferred<Question>()
    mockQuestionsRegenerate.mockReturnValueOnce(pending.promise)

    renderReviewPage()

    const tolakButtons = screen.getAllByText('Tolak')
    await user.click(tolakButtons[0]!)

    const confirmButton = await screen.findByRole('button', { name: /^Ganti$/i })
    await user.click(confirmButton)

    expect(await screen.findByText('AI sedang mengganti soal...')).toBeInTheDocument()
    expect(mockQuestionsRegenerate).toHaveBeenCalledWith('q-1', expect.any(Object))

    pending.resolve(
      Either.right({
        ...exam.questions[0]!,
        text: 'Soal pengganti setelah ditolak',
        status: 'pending' as const,
      }),
    )

    expect(await screen.findByText('Soal pengganti setelah ditolak')).toBeInTheDocument()
  })

  it('passes the typed hint to the regenerate call', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_slow_hint' })
    const exam = makeExamWithQuestions('exam_slow_hint')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_slow_hint' } })

    mockApiResolvedValueOnce(mockQuestionsRegenerate, {
      ...exam.questions[0]!,
      text: 'Replacement',
      status: 'pending' as const,
    })

    renderReviewPage()

    const tolakButtons = screen.getAllByText('Tolak')
    await user.click(tolakButtons[0]!)

    const textarea = await screen.findByPlaceholderText(/petunjuk untuk ai/i)
    await user.type(textarea, 'terlalu sulit')
    await user.click(screen.getByRole('button', { name: /^Ganti$/i }))

    await waitFor(() => {
      expect(mockQuestionsRegenerate).toHaveBeenCalledWith('q-1', { hint: 'terlalu sulit' })
    })
  })

  it('shows the persistent failure state with [Coba lagi] and [Batalkan] when regenerate fails', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_slow2' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_slow2'))
    await getLoader()({ deps: { examId: 'exam_slow2' } })

    mockQuestionsRegenerate.mockRejectedValueOnce(new Error('AI generation failed'))

    renderReviewPage()

    const tolakButtons = screen.getAllByText('Tolak')
    await user.click(tolakButtons[0]!)

    const confirmButton = await screen.findByRole('button', { name: /^Ganti$/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText('Regenerate gagal')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Coba lagi$/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Batalkan$/ })).toBeInTheDocument()
    })
  })
})

describe('ReviewPage — fused Tolak replaces standalone "Ganti dengan AI" button', () => {
  it('does NOT render a standalone "Ganti dengan AI" button on any card', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_no_ganti_btn' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_no_ganti_btn'))
    await getLoader()({ deps: { examId: 'exam_no_ganti_btn' } })

    renderReviewPage()

    expect(screen.queryByText('Ganti dengan AI')).not.toBeInTheDocument()
  })

  it('shows an error toast when Tolak-triggered regenerate fails', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_tolak_toast' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_tolak_toast'))
    await getLoader()({ deps: { examId: 'exam_tolak_toast' } })

    mockQuestionsRegenerate.mockRejectedValueOnce(new Error('AI generation failed'))

    renderReviewPage()

    const tolakButtons = screen.getAllByText('Tolak')
    await user.click(tolakButtons[0]!)
    await user.click(await screen.findByRole('button', { name: /^Ganti$/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'error',
          title: 'Gagal mengganti soal',
          description: 'AI generation failed',
        }),
      )
    })
  })
})

describe('ReviewPage — "Soal baru" badge for AI replacements', () => {
  it('shows the "Soal baru" badge after a successful Tolak → regenerate', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_new_badge' })

    const exam = makeExamWithQuestions('exam_new_badge')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_new_badge' } })

    mockApiResolvedValueOnce(mockQuestionsRegenerate, {
      ...exam.questions[0]!,
      text: 'Soal pengganti',
      status: 'pending' as const,
    })

    renderReviewPage()

    const tolakButtons = screen.getAllByText('Tolak')
    await user.click(tolakButtons[0]!)
    await user.click(await screen.findByRole('button', { name: /^Ganti$/i }))

    await waitFor(() => {
      expect(screen.getByText('Soal pengganti')).toBeInTheDocument()
      expect(screen.getByText('Soal baru')).toBeInTheDocument()
    })
  })

  it('clears the "Soal baru" badge when the user clicks Terima on that card', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_new_badge_terima' })

    const exam = makeExamWithQuestions('exam_new_badge_terima')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_new_badge_terima' } })

    mockApiResolvedValueOnce(mockQuestionsRegenerate, {
      ...exam.questions[0]!,
      text: 'Soal pengganti',
      status: 'pending' as const,
    })
    const patchSpy = mockApiSpyResolvedValue(vi.spyOn(api.questions, 'patch'), {
      ...exam.questions[0]!,
      text: 'Soal pengganti',
      status: 'accepted' as const,
    })

    renderReviewPage()

    await user.click(screen.getAllByText('Tolak')[0]!)
    await user.click(await screen.findByRole('button', { name: /^Ganti$/i }))

    await waitFor(() => {
      expect(screen.getByText('Soal baru')).toBeInTheDocument()
    })

    const terimaButtons = screen.getAllByText('Terima')
    await user.click(terimaButtons[0]!)

    await waitFor(() => {
      expect(screen.queryByText('Soal baru')).not.toBeInTheDocument()
    })

    patchSpy.mockRestore()
  })
})

describe('ReviewPage — Batalkan reverts on regenerate failure', () => {
  it('restores the original question content when [Batalkan] is clicked', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_batalkan' })

    const exam = makeExamWithQuestions('exam_batalkan')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_batalkan' } })

    mockQuestionsRegenerate.mockRejectedValueOnce(new Error('AI failed'))

    renderReviewPage()

    expect(screen.getByText('Question 1')).toBeInTheDocument()

    await user.click(screen.getAllByText('Tolak')[0]!)
    await user.click(await screen.findByRole('button', { name: /^Ganti$/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Batalkan$/ })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^Batalkan$/ }))

    await waitFor(() => {
      expect(screen.queryByText('Regenerate gagal')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Batalkan$/ })).not.toBeInTheDocument()
    })

    expect(screen.getByText('Question 1')).toBeInTheDocument()
  })
})

describe('ReviewPage — "Coba lagi yang gagal" top-bar button', () => {
  it('is hidden when there are no failed regenerations', async () => {
    setReviewSearch({ mode: 'slow', examId: 'exam_no_fail' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_no_fail'))
    await getLoader()({ deps: { examId: 'exam_no_fail' } })

    renderReviewPage()

    expect(screen.queryByText(/Coba lagi yang gagal/i)).not.toBeInTheDocument()
  })

  it('appears with the count once a regenerate fails', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_fail_count' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_fail_count'))
    await getLoader()({ deps: { examId: 'exam_fail_count' } })

    mockQuestionsRegenerate.mockRejectedValueOnce(new Error('AI failed'))

    renderReviewPage()

    await user.click(screen.getAllByText('Tolak')[0]!)
    await user.click(await screen.findByRole('button', { name: /^Ganti$/i }))

    expect(await screen.findByText(/Coba lagi yang gagal \(1\)/i)).toBeInTheDocument()
  })

  it('reuses the preserved hint when retrying all failed regenerations', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_retry_all' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_retry_all'))
    await getLoader()({ deps: { examId: 'exam_retry_all' } })

    mockQuestionsRegenerate.mockRejectedValueOnce(new Error('AI failed'))

    renderReviewPage()

    await user.click(screen.getAllByText('Tolak')[0]!)
    const textarea = await screen.findByPlaceholderText(/petunjuk untuk ai/i)
    await user.type(textarea, 'terlalu sulit')
    await user.click(screen.getByRole('button', { name: /^Ganti$/i }))

    const retryAllBtn = await screen.findByText(/Coba lagi yang gagal \(1\)/i)

    mockApiResolvedValueOnce(mockQuestionsRegenerate, {
      ...makeExamWithQuestions('exam_retry_all').questions[0]!,
      text: 'Soal AI baru',
      status: 'pending' as const,
    })

    await user.click(retryAllBtn)
    await user.click(await screen.findByRole('button', { name: /Coba lagi semua/i }))

    await waitFor(() => {
      expect(mockQuestionsRegenerate).toHaveBeenCalledTimes(2)
      expect(mockQuestionsRegenerate).toHaveBeenLastCalledWith('q-1', { hint: 'terlalu sulit' })
    })
  })
})
