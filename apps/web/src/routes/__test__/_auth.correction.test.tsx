import type * as TanStackRouter from "@tanstack/react-router"
import type { ExamWithQuestions, SessionResultsResponse } from "@teacher-exam/shared"
import { render, screen, waitFor } from "@testing-library/react"
import { Either } from "effect"
import { describe, expect, it, vi } from "vitest"
import { makeExamWithQuestions } from "../../test/fixtures/exam.js"

import type * as ApiModule from "../../lib/api.js"
import { Route } from "../_auth.correction.$examId.js"

const { mockResults, mockRouteState } = vi.hoisted(() => ({
  mockRouteState: {
    loaderData: null as ExamWithQuestions | null,
    params: { examId: "exam-real" }
  },
  mockResults: vi.fn()
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useLoaderData: () => mockRouteState.loaderData,
      useParams: () => mockRouteState.params
    }),
    Link: ({
      children,
      className,
      to
    }: {
      children: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    )
  }
})

vi.mock("../../lib/api.js", async (importOriginal) => {
  const orig = await importOriginal<typeof ApiModule>()
  return {
    ...orig,
    api: {
      ...orig.api,
      exams: { ...orig.api.exams, get: vi.fn() },
      results: {
        ...orig.api.results,
        listByExam: (...args: Array<unknown>) => mockResults(...args)
      }
    }
  }
})

vi.mock("../lib/feature-flags.js", async (importOriginal) => {
  const orig = await importOriginal<{ DELIVERY_ENABLED: boolean }>()
  return { ...orig, DELIVERY_ENABLED: true }
})

function makeCorrectionExam() {
  return makeExamWithQuestions("exam-real", {
    questionCount: 20,
    overrides: {
      title: "Ulangan Harian Bahasa Indonesia",
      difficulty: "campuran",
      topics: ["Pemahaman Bacaan"],
      status: "final",
      schoolName: "SD Codex",
      academicYear: "2025/2026",
      examDate: "2026-04-25",
      durationMinutes: 60,
      instructions: "Pilih jawaban yang benar.",
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z",
      questions: makeExamWithQuestions("exam-real", { questionCount: 20 }).questions.map((q, i) => ({
        ...q,
        text: `Soal ${i + 1}`,
        topic: "Pemahaman Bacaan",
        status: "accepted" as const
      }))
    }
  })
}

function renderCorrectionPage() {
  const CorrectionPage = Route.options.component as React.ComponentType
  return render(<CorrectionPage />)
}

describe("CorrectionPage", () => {
  it("renders the real exam answer key from loader data", () => {
    mockRouteState.loaderData = makeCorrectionExam()
    mockResults.mockResolvedValue(
      Either.right(
        makeResultsResponse({
          results: [],
          stats: {
            participantCount: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            passingCount: 0,
            passingThreshold: 70
          }
        })
      )
    )

    renderCorrectionPage()

    expect(screen.queryByText(/Memuat kunci jawaban/i)).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /Koreksi Cepat/i })).toBeInTheDocument()
    expect(screen.getByText(/Ulangan Harian Bahasa Indonesia .* 20 soal/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Jawaban A untuk soal 1$/i })).toBeInTheDocument()
  })
})

function makeResultsResponse(overrides: Partial<SessionResultsResponse> = {}): SessionResultsResponse {
  const base = {
    sessionId: "ses-1",
    examId: "exam-real",
    examTitle: "Ulangan Harian Bahasa Indonesia",
    results: [
      {
        id: "res-1",
        sessionId: "ses-1",
        sessionStudentId: "ss-1",
        studentName: "Ani Wijaya",
        examId: "exam-real",
        score: 80,
        correctCount: 16,
        totalCount: 20,
        gradedStatus: "auto",
        answers: [],
        gradedAt: "2026-04-25T08:00:00.000Z",
        createdAt: "2026-04-25T07:00:00.000Z",
        updatedAt: "2026-04-25T08:00:00.000Z"
      }
    ],
    stats: {
      participantCount: 1,
      averageScore: 80,
      highestScore: 80,
      lowestScore: 80,
      passingCount: 1,
      passingThreshold: 70
    },
    ...overrides
  }
  return base as unknown as SessionResultsResponse
}

describe("CorrectionPage — real session results (DELIVERY_ENABLED)", () => {
  it("loads real graded results and shows them in the rekap panel", async () => {
    mockRouteState.loaderData = makeCorrectionExam()
    mockResults.mockResolvedValue(Either.right(makeResultsResponse()))

    renderCorrectionPage()

    await waitFor(() => expect(mockResults).toHaveBeenCalledWith("exam-real"))
    expect(await screen.findByText("Ani Wijaya")).toBeInTheDocument()
  })

  it("shows the class average from real results stats", async () => {
    mockRouteState.loaderData = makeCorrectionExam()
    mockResults.mockResolvedValue(Either.right(makeResultsResponse()))

    renderCorrectionPage()

    await waitFor(() => expect(mockResults).toHaveBeenCalled())
    expect(await screen.findByText(/Rata-rata:/i)).toBeInTheDocument()
    expect(screen.getByText(/Rata-rata:/i).textContent).toMatch(/80/)
  })

  it("does not use MOCK_STUDENTS suggested names", async () => {
    mockRouteState.loaderData = makeCorrectionExam()
    mockResults.mockResolvedValue(
      Either.right(
        makeResultsResponse({
          results: [],
          stats: {
            participantCount: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            passingCount: 0,
            passingThreshold: 70
          }
        })
      )
    )

    renderCorrectionPage()

    await waitFor(() => expect(mockResults).toHaveBeenCalled())
    expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument()
  })
})
