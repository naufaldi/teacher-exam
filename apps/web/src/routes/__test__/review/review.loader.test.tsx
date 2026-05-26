import './setup.js'
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { examDraftStore } from '../../../lib/exam-draft-store.js'
import { getLoader, mockExamsGet, renderReviewPage,
  mockApiResolvedValueOnce} from './setup.js'
import { makeExamWithQuestions } from './fixtures.js'

describe('ReviewPage — loader', () => {
  it('calls api.exams.get and seeds examDraftStore when examId is present', async () => {
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_123'))

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
    mockApiResolvedValueOnce(mockExamsGet, makeExamWithQuestions('exam_456'))
    await getLoader()({ deps: { examId: 'exam_456' } })

    renderReviewPage()
    expect(screen.getByText('Question 1')).toBeInTheDocument()
  })
})
