import './setup.js'
import { mockApiSpyResolvedValue } from '../../../lib/api-test-utils.js'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ExamWithQuestions } from '@teacher-exam/shared'
import { examDraftStore } from '../../../lib/exam-draft-store.js'
import {
  getLoader,
  mockExamsGet,
  mockQuestionsRegenerate,
  renderReviewPage,
  setReviewSearch,
  mockApiResolvedValueOnce} from './setup.js'
import { api } from '../../../lib/api.js'
import { makeExamWithQuestions, makeExamWithMixedTypes } from './fixtures.js'

describe('ReviewPage — Edit dialog saves via api.questions.patch', () => {
  it('reverts question text in store when api.questions.patch rejects', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'fast', examId: 'exam_edit_fail' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_edit_fail'))
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

    await waitFor(() => {
      const { questions } = examDraftStore.getSnapshot()
      expect(questions[0]?.text).toBe('Question 1')
    })

    patchSpy.mockRestore()
  })

  it('calls api.questions.patch with only changed fields when text is modified', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'fast', examId: 'exam_edit' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_edit'))
    await getLoader()({ deps: { examId: 'exam_edit' } })

    const patchSpy = mockApiSpyResolvedValue(vi.spyOn(api.questions, 'patch'), {
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

describe('ReviewPage — Task 13: Edit dialog save fires api.questions.patch with typed payload', () => {
  it('mcq_multi edit save sends {_tag:"mcq_multi", correct:[...]} to patch', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'fast', examId: 'exam_multi_edit' })
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithMixedTypes('exam_multi_edit') as ExamWithQuestions)
    await getLoader()({ deps: { examId: 'exam_multi_edit' } })

    const patchSpy = mockApiSpyResolvedValue(vi.spyOn(api.questions, 'patch'), {
      _tag: 'mcq_multi' as const,
      id: 'q-multi-1',
      examId: 'exam_multi_edit',
      number: 1,
      text: 'Multi question updated',
      options: { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' },
      correct: ['a', 'c'],
      topic: null,
      difficulty: null,
      status: 'accepted' as const,
      validationStatus: null,
      validationReason: null,
      createdAt: new Date().toISOString(),
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

describe('ReviewPage — Edit preserves current status', () => {
  it('does NOT include `status` in the PATCH diff when editing a pending question', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_edit_pending' })

    const exam = makeExamWithQuestions('exam_edit_pending')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_edit_pending' } })

    const patchSpy = mockApiSpyResolvedValue(vi.spyOn(api.questions, 'patch'), {
      ...exam.questions[0]!,
      text: 'Teks baru',
    })

    renderReviewPage()

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0]!)

    const textArea = await screen.findByLabelText(/teks soal/i)
    await user.clear(textArea)
    await user.type(textArea, 'Teks baru')

    await user.click(screen.getByRole('button', { name: /simpan perubahan/i }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalled()
    })

    const [, payload] = patchSpy.mock.calls[0]!
    expect(payload).toMatchObject({ text: 'Teks baru' })
    expect(payload as Record<string, unknown>).not.toHaveProperty('status')

    patchSpy.mockRestore()
  })

  it('does NOT include `status` in the PATCH diff when editing an accepted question', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_edit_accepted' })

    const exam = makeExamWithQuestions('exam_edit_accepted')
    const questions = exam.questions.map((q) => ({ ...q, status: 'accepted' as const }))
    mockApiResolvedValueOnce(mockExamsGet, { ...exam, questions })
    await getLoader()({ deps: { examId: 'exam_edit_accepted' } })

    const patchSpy = mockApiSpyResolvedValue(vi.spyOn(api.questions, 'patch'), {
      ...questions[0]!,
      text: 'Teks baru',
    })

    renderReviewPage()

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0]!)

    const textArea = await screen.findByLabelText(/teks soal/i)
    await user.clear(textArea)
    await user.type(textArea, 'Teks baru')

    await user.click(screen.getByRole('button', { name: /simpan perubahan/i }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalled()
    })

    const [, payload] = patchSpy.mock.calls[0]!
    expect(payload).toMatchObject({ text: 'Teks baru' })
    expect(payload as Record<string, unknown>).not.toHaveProperty('status')

    patchSpy.mockRestore()
  })
})

describe('ReviewPage — Edit dialog shows fresh content after regenerate', () => {
  it('shows regenerated question text when Edit is opened after a Tolak → regenerate cycle', async () => {
    const user = userEvent.setup()
    setReviewSearch({ mode: 'slow', examId: 'exam_regen_edit' })

    const exam = makeExamWithQuestions('exam_regen_edit')
    mockApiResolvedValueOnce(mockExamsGet, exam)
    await getLoader()({ deps: { examId: 'exam_regen_edit' } })

    renderReviewPage()

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0]!)

    expect(await screen.findByLabelText(/teks soal/i)).toHaveValue('Question 1')

    await user.click(screen.getByRole('button', { name: /batal/i }))

    await waitFor(() => {
      expect(screen.queryByLabelText(/teks soal/i)).not.toBeInTheDocument()
    })

    mockApiResolvedValueOnce(mockQuestionsRegenerate, {
      ...exam.questions[0]!,
      text: 'Soal regenerasi baru',
      status: 'pending' as const,
    })

    await user.click(screen.getAllByText('Tolak')[0]!)
    await user.click(await screen.findByRole('button', { name: /^Ganti$/i }))

    await waitFor(() => {
      expect(screen.getByText('Soal regenerasi baru')).toBeInTheDocument()
    })

    const editButtonsAfter = screen.getAllByText('Edit')
    await user.click(editButtonsAfter[0]!)

    expect(await screen.findByLabelText(/teks soal/i)).toHaveValue('Soal regenerasi baru')
  })
})
