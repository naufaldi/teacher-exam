import './setup.js'
import { mockApiSpyResolvedValue } from '../../../lib/api-test-utils.js'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getLoader, mockExamsGet, mockNavigate, renderReviewPage, setReviewSearch,
  mockApiResolvedValueOnce} from './setup.js'
import { api } from '../../../lib/api.js'
import { lastReviewSearchResult } from './interactions.js'
import { makeExamWithQuestions } from './fixtures.js'

describe('ReviewPage — from=generate URL strip', () => {
  it('preserves examId in URL when stripping ?from=generate', async () => {
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_xyz'))
    await getLoader()({ deps: { examId: 'exam_xyz' } })

    setReviewSearch({ mode: 'fast', from: 'generate', examId: 'exam_xyz' })

    renderReviewPage()

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/review',
        replace: true,
        search: expect.objectContaining({ mode: 'fast', examId: 'exam_xyz' }),
      }),
    )
  })
})

describe('ReviewPage — switch mode preserves examId in URL', () => {
  it('navigates with both mode=slow AND examId when switching from fast → slow (clean state)', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'fast', examId: 'exam_switch_1' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_switch_1'))
    await getLoader()({ deps: { examId: 'exam_switch_1' } })

    renderReviewPage()

    await user.click(screen.getByRole('button', { name: /Switch ke Review Detail/i }))

    expect(lastReviewSearchResult()).toEqual(
      expect.objectContaining({ mode: 'slow', examId: 'exam_switch_1' }),
    )
  })

  it('navigates with both mode=fast AND examId when switching from slow → fast (clean state)', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_switch_2' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_switch_2'))
    await getLoader()({ deps: { examId: 'exam_switch_2' } })

    renderReviewPage()

    await user.click(screen.getByRole('button', { name: /Switch ke Mode Cepat/i }))

    expect(lastReviewSearchResult()).toEqual(
      expect.objectContaining({ mode: 'fast', examId: 'exam_switch_2' }),
    )
  })

  it('preserves examId through the dirty-state confirm dialog when switching modes', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_switch_dirty' })
    const exam = makeExamWithQuestions('exam_switch_dirty')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_switch_dirty' } })

    const patchSpy = mockApiSpyResolvedValue(vi.spyOn(api.questions, 'patch'), {
      ...exam.questions[0]!,
      status: 'accepted' as const,
    })

    renderReviewPage()

    const terimaButtons = screen.getAllByText('Terima')
    await user.click(terimaButtons[0]!)
    await waitFor(() => expect(patchSpy).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: /Switch ke Mode Cepat/i }))
    expect(mockNavigate).not.toHaveBeenCalled()

    const confirm = await screen.findByRole('button', { name: /Pindah ke Mode Cepat/i })
    await user.click(confirm)

    expect(lastReviewSearchResult()).toEqual(
      expect.objectContaining({ mode: 'fast', examId: 'exam_switch_dirty' }),
    )

    patchSpy.mockRestore()
  })
})
