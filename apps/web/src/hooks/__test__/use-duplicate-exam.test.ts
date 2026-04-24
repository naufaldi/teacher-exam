import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Exam } from '@teacher-exam/shared'

const mockNavigate = vi.fn()
const mockInvalidate = vi.fn()
const mockToast = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({ invalidate: mockInvalidate }),
}))

vi.mock('@teacher-exam/ui', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@teacher-exam/ui')>()
  return { ...orig, useToast: () => ({ toast: mockToast }) }
})

const mockDuplicate = vi.fn()

vi.mock('../../lib/api', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../lib/api.js')>()
  return {
    ...orig,
    api: {
      ...orig.api,
      exams: {
        ...orig.api.exams,
        duplicate: (id: string) => mockDuplicate(id),
      },
    },
  }
})

import { useDuplicateExam } from '../use-duplicate-exam.js'

const makeExam = (overrides: Partial<Exam> = {}): Exam => ({
  id: 'exam-1',
  userId: 'user-1',
  title: 'Test Exam',
  subject: 'bahasa_indonesia',
  grade: 5,
  difficulty: 'sedang',
  topics: ['Ide Pokok'],
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('useDuplicateExam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with no confirming exam and dialog closed', () => {
    const { result } = renderHook(() => useDuplicateExam())
    expect(result.current.confirmingExam).toBeNull()
    expect(result.current.isPending).toBe(false)
  })

  it('openFor sets the confirming exam', () => {
    const { result } = renderHook(() => useDuplicateExam())
    const exam = makeExam()
    act(() => { result.current.openFor(exam) })
    expect(result.current.confirmingExam).toEqual(exam)
  })

  it('close clears the confirming exam', () => {
    const { result } = renderHook(() => useDuplicateExam())
    act(() => { result.current.openFor(makeExam()) })
    act(() => { result.current.close() })
    expect(result.current.confirmingExam).toBeNull()
  })

  it('confirm calls api.exams.duplicate and navigates to /review on success', async () => {
    const newExam = makeExam({ id: 'new-exam-1', reviewMode: 'fast' })
    mockDuplicate.mockResolvedValue(newExam)

    const { result } = renderHook(() => useDuplicateExam())
    act(() => { result.current.openFor(makeExam({ id: 'exam-1' })) })

    await act(async () => { await result.current.confirm() })

    expect(mockDuplicate).toHaveBeenCalledWith('exam-1')
    expect(mockInvalidate).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/review',
      search: { examId: 'new-exam-1', mode: 'fast' },
    })
    expect(result.current.confirmingExam).toBeNull()
  })

  it('confirm shows error toast and does NOT navigate on failure', async () => {
    mockDuplicate.mockRejectedValue(new Error('Network failure'))

    const { result } = renderHook(() => useDuplicateExam())
    act(() => { result.current.openFor(makeExam()) })

    await act(async () => { await result.current.confirm() })

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' }),
    )
    expect(result.current.confirmingExam).not.toBeNull()
  })
})
