import type * as TanStackRouter from "@tanstack/react-router"
import type { ExamAnalyticsResponse } from "@teacher-exam/shared"
import { ToastProvider } from "@teacher-exam/ui"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Either } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Route } from "../_auth.analytics.js"

const { mockExamAnalytics, mockExamList, mockExport, mockRouteState } = vi.hoisted(() => ({
  mockRouteState: {
    examId: "exam-1" as string | undefined
  },
  mockExamAnalytics: vi.fn(),
  mockExamList: vi.fn(),
  mockExport: vi.fn()
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useSearch: ({ select }: { select?: (s: unknown) => unknown } = {}) => {
        const state = { examId: mockRouteState.examId }
        return select ? select(state) : state
      }
    }),
    Link: ({
      children,
      to
    }: {
      children: React.ReactNode
      to: string
    }) => <a href={to}>{children}</a>,
    useNavigate: () => vi.fn()
  }
})

vi.mock("../../lib/api.js", () => ({
  api: {
    exams: {
      list: (...args: Array<unknown>) => mockExamList(...args),
      export: (...args: Array<unknown>) => mockExport(...args)
    },
    analytics: {
      getByExam: (...args: Array<unknown>) => mockExamAnalytics(...args)
    }
  },
  unwrapApiEither: (result: { _tag: "Right"; right: unknown }) => result.right
}))

function makeAnalytics(overrides: Partial<ExamAnalyticsResponse> = {}): ExamAnalyticsResponse {
  const base = {
    examId: "exam-1",
    examTitle: "Latihan IPAS",
    sessionCount: 1,
    participantCount: 4,
    averageScore: 75,
    completionRate: 90,
    scoreDistribution: [
      { range: "0-59", count: 1 },
      { range: "60-69", count: 0 },
      { range: "70-79", count: 1 },
      { range: "80-100", count: 2 }
    ],
    perQuestion: [
      { questionId: "q-1", number: 1, type: "mcq_single", correctRate: 75, answeredCount: 4 }
    ],
    ...overrides
  }
  return base as unknown as ExamAnalyticsResponse
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRouteState.examId = "exam-1"
})

function renderRoute() {
  const Component = (Route as unknown as { options: { component: React.ComponentType } }).options.component
  return render(
    <ToastProvider>
      <Component />
    </ToastProvider>
  )
}

describe("Analytics route", () => {
  it("renders the exam title and average score", async () => {
    mockExamAnalytics.mockResolvedValue(Either.right(makeAnalytics()))
    renderRoute()
    expect(await screen.findByText(/Latihan IPAS/)).toBeInTheDocument()
    expect(await screen.findByText(/nilai rata-rata/i)).toBeInTheDocument()
  })

  it("renders the score distribution bands", async () => {
    mockExamAnalytics.mockResolvedValue(Either.right(makeAnalytics()))
    renderRoute()
    expect(await screen.findByText("80-100")).toBeInTheDocument()
    expect(await screen.findByText("0-59")).toBeInTheDocument()
  })

  it("renders per-question correctness rates", async () => {
    mockExamAnalytics.mockResolvedValue(Either.right(makeAnalytics()))
    renderRoute()
    expect(await screen.findByText(/75%/)).toBeInTheDocument()
  })

  it("shows empty state when no participants", async () => {
    mockExamAnalytics.mockResolvedValue(
      Either.right(
        makeAnalytics({
          participantCount: 0,
          averageScore: 0,
          completionRate: 0,
          scoreDistribution: [],
          perQuestion: []
        })
      )
    )
    renderRoute()
    expect(await screen.findByText(/belum ada peserta/i)).toBeInTheDocument()
  })

  it("triggers rekap export on export menu", async () => {
    const user = userEvent.setup()
    mockExamAnalytics.mockResolvedValue(Either.right(makeAnalytics()))
    mockExport.mockResolvedValue(undefined)
    renderRoute()
    const exportButton = await screen.findByRole("button", { name: /unduh rekap/i })
    await user.click(exportButton)
    const pdfItem = await screen.findByRole("button", { name: /^pdf$/i })
    await user.click(pdfItem)
    await waitFor(() => expect(mockExport).toHaveBeenCalled())
  })
})
