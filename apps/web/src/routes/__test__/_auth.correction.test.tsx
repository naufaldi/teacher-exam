import type * as TanStackRouter from "@tanstack/react-router"
import type { ExamWithQuestions } from "@teacher-exam/shared"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { makeExamWithQuestions } from "../../test/fixtures/exam.js"

import type * as ApiModule from "../../lib/api.js"
import { Route } from "../_auth.correction.$examId.js"

const { mockRouteState } = vi.hoisted(() => ({
  mockRouteState: {
    loaderData: null as ExamWithQuestions | null,
    params: { examId: "exam-real" }
  }
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
      exams: { ...orig.api.exams, get: vi.fn() }
    }
  }
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

    renderCorrectionPage()

    expect(screen.queryByText(/Memuat kunci jawaban/i)).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /Koreksi Cepat/i })).toBeInTheDocument()
    expect(screen.getByText(/Ulangan Harian Bahasa Indonesia .* 20 soal/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Jawaban A untuk soal 1$/i })).toBeInTheDocument()
  })
})
