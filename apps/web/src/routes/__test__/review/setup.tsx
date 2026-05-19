import { beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import type { ExamWithQuestions } from '@teacher-exam/shared'
import { examDraftStore } from '../../../lib/exam-draft-store.js'
import { makeExamWithQuestions } from '../../../test/fixtures/exam.js'

export type ReviewSearchParams = {
  mode: 'fast' | 'slow'
  from?: 'generate'
  examId?: string
}

const { mockNavigate, mockToast, getSearchParams, setSearchParams } = vi.hoisted(() => {
  let mockSearchParams: ReviewSearchParams = { mode: 'fast' }
  return {
    mockNavigate: vi.fn<(opts: unknown) => Promise<void>>(),
    mockToast: vi.fn(),
    getSearchParams: () => mockSearchParams,
    setSearchParams: (params: ReviewSearchParams) => {
      mockSearchParams = params
    },
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useSearch: () => getSearchParams(),
      useLoaderData: () => undefined,
    }),
    useNavigate: () => mockNavigate,
    useSearch: () => getSearchParams(),
    redirect: ({ to }: { to: string }) =>
      Object.assign(new Error(`Redirect to ${to}`), { isRedirect: true, to }),
  }
})

vi.mock('../../../lib/api.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../lib/api.js')>()
  return {
    ...orig,
    api: {
      ...orig.api,
      exams: { ...orig.api.exams, get: vi.fn(), validateCurriculum: vi.fn() },
      questions: { patch: vi.fn(), regenerate: vi.fn() },
    },
  }
})

vi.mock('@teacher-exam/ui', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@teacher-exam/ui')>()
  return {
    ...orig,
    useToast: () => ({ toast: mockToast }),
  }
})

import { api } from '../../../lib/api.js'
import { Route } from '../../_auth.review.js'

type RouteOptions = {
  component: React.ComponentType
  loader?: (ctx: { deps: Record<string, unknown> }) => Promise<unknown>
  pendingComponent?: React.ComponentType
}

export const mockExamsGet = (api as unknown as { exams: { get: ReturnType<typeof vi.fn> } }).exams
  .get
export const mockQuestionsPatch = (
  api as unknown as { questions: { patch: ReturnType<typeof vi.fn> } }
).questions.patch
export const mockQuestionsRegenerate = (
  api as unknown as { questions: { regenerate: ReturnType<typeof vi.fn> } }
).questions.regenerate
export const mockExamsValidateCurriculum = (
  api as unknown as { exams: { validateCurriculum: ReturnType<typeof vi.fn> } }
).exams.validateCurriculum

export { mockNavigate, mockToast }

export function setReviewSearch(params: ReviewSearchParams) {
  setSearchParams(params)
}

export function getReviewSearch(): ReviewSearchParams {
  return getSearchParams()
}

export function getLoader() {
  return (Route as unknown as { options: RouteOptions }).options.loader!
}

export function renderReviewPage() {
  const ReviewPage = (Route as unknown as { options: RouteOptions }).options.component
  return render(<ReviewPage />)
}

export async function seedReviewLoader(examId: string, exam?: ExamWithQuestions) {
  mockExamsGet.mockResolvedValueOnce(exam ?? makeExamWithQuestions(examId))
  await getLoader()({ deps: { examId } })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockNavigate.mockResolvedValue(undefined)
  examDraftStore.reset()
  setSearchParams({ mode: 'fast' })
})
