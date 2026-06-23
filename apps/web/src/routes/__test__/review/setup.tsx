import type * as TanStackRouter from "@tanstack/react-router"
import type { ExamWithQuestions } from "@teacher-exam/shared"
import type * as UiModule from "@teacher-exam/ui"
import { render } from "@testing-library/react"
import React from "react"
import { beforeEach, vi } from "vitest"
import {
  type ApiMock,
  mockApiImplementationOnce as mockApiImplementationOnceHelper,
  mockApiResolvedValueOnce as mockApiResolvedValueOnceHelper
} from "../../../lib/api-test-utils.js"
import type * as ApiModule from "../../../lib/api.js"
import { examDraftStore } from "../../../lib/exam-draft-store.js"
import { makeExamWithQuestions } from "../../../test/fixtures/exam.js"

import { Route as ReviewRoute } from "../../_auth.review.js"

export type ReviewSearchParams = {
  mode: "fast" | "slow"
  from?: "generate"
  examId?: string
}

const { apiMocks, getSearchParams, mockNavigate, mockToast, reviewTestCtx, setSearchParams } = vi.hoisted(() => {
  let mockSearchParams: ReviewSearchParams = { mode: "fast" }
  return {
    apiMocks: {
      examsGet: vi.fn(),
      examsPatch: vi.fn(),
      examsFinalize: vi.fn(),
      examsValidateCurriculum: vi.fn(),
      questionsPatch: vi.fn(),
      questionsRegenerate: vi.fn()
    },
    mockNavigate: vi.fn<(opts: unknown) => Promise<void>>(),
    mockToast: vi.fn(),
    getSearchParams: () => mockSearchParams,
    setSearchParams: (params: ReviewSearchParams) => {
      mockSearchParams = params
    },
    reviewTestCtx: { mockLoaderData: undefined as ExamWithQuestions | undefined }
  }
})

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useSearch: () => getSearchParams(),
      useLoaderData: () => reviewTestCtx.mockLoaderData
    }),
    useNavigate: () => mockNavigate,
    useSearch: () => getSearchParams(),
    redirect: ({ to }: { to: string }) => Object.assign(new Error(`Redirect to ${to}`), { isRedirect: true, to })
  }
})

vi.mock("../../../lib/api.js", async (importOriginal) => {
  const orig = await importOriginal<typeof ApiModule>()
  return {
    ...orig,
    api: {
      ...orig.api,
      exams: {
        ...orig.api.exams,
        get: apiMocks.examsGet,
        patch: apiMocks.examsPatch,
        finalize: apiMocks.examsFinalize,
        validateCurriculum: apiMocks.examsValidateCurriculum
      },
      questions: {
        ...orig.api.questions,
        patch: apiMocks.questionsPatch,
        regenerate: apiMocks.questionsRegenerate
      }
    }
  }
})

vi.mock("@teacher-exam/ui", async (importOriginal) => {
  const orig = await importOriginal<typeof UiModule>()
  return {
    ...orig,
    useToast: () => ({ toast: mockToast })
  }
})

type RouteOptions = {
  component: React.ComponentType
  loader?: (ctx: { deps: Record<string, unknown> }) => Promise<unknown>
  pendingComponent?: React.ComponentType
}

export const mockExamsGet = apiMocks.examsGet
export const mockExamsPatch = apiMocks.examsPatch
export const mockExamsFinalize = apiMocks.examsFinalize
export const mockQuestionsPatch = apiMocks.questionsPatch
export const mockQuestionsRegenerate = apiMocks.questionsRegenerate
export const mockExamsValidateCurriculum = apiMocks.examsValidateCurriculum

export function getReviewRouteOptions(): RouteOptions {
  return (ReviewRoute as unknown as { options: RouteOptions }).options
}

export { mockNavigate, mockToast }

export function setReviewSearch(params: ReviewSearchParams) {
  setSearchParams(params)
}

export function getReviewSearch(): ReviewSearchParams {
  return getSearchParams()
}

export function getLoader() {
  const loader = (ReviewRoute as unknown as { options: RouteOptions }).options.loader!
  return async (ctx: { deps: Record<string, unknown> }) => {
    reviewTestCtx.mockLoaderData = (await loader(ctx)) as ExamWithQuestions
    return reviewTestCtx.mockLoaderData
  }
}

export function renderReviewPage() {
  const ReviewPage = (ReviewRoute as unknown as { options: RouteOptions }).options.component
  return render(<ReviewPage />)
}

export async function seedReviewLoader(examId: string, exam?: ExamWithQuestions) {
  mockApiResolvedValueOnce(mockExamsGet, exam ?? makeExamWithQuestions(examId))
  await getLoader()({ deps: { examId } })
}

export function mockApiResolvedValueOnce(mock: ApiMock, value: unknown) {
  mockApiResolvedValueOnceHelper(mock, value)
}

export function mockApiImplementationOnce<T, Args extends Array<unknown>>(
  mock: ApiMock,
  fn: (...args: Args) => Promise<T> | T
) {
  mockApiImplementationOnceHelper(mock, fn)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockNavigate.mockResolvedValue(undefined)
  examDraftStore.reset()
  reviewTestCtx.mockLoaderData = undefined
  setSearchParams({ mode: "fast" })
})
