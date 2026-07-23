import type * as TanStackRouter from "@tanstack/react-router"
import type { ExamWithQuestions, Question } from "@teacher-exam/shared"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import type { ComponentType } from "react"
import { afterEach, beforeEach, vi } from "vitest"
import { makeMcqSingle } from "../../../test/fixtures/exam.js"

import type * as ApiModule from "../../../lib/api.js"
import { api } from "../../../lib/api.js"
import { examDraftStore } from "../../../lib/exam-draft-store.js"
import { Route } from "../../_auth.preview.js"

const {
  mockExamsExport,
  mockFeedbackSetExamOutcome,
  mockGenerateDiscussion,
  mockNavigate,
  mockStreamDiscussion,
  previewTestCtx
} = vi.hoisted(() => ({
  mockNavigate: vi.fn<(opts: unknown) => Promise<void>>(),
  mockExamsExport: vi.fn(),
  mockFeedbackSetExamOutcome: vi.fn(),
  mockGenerateDiscussion: vi.fn(),
  mockStreamDiscussion: vi.fn(),
  previewTestCtx: { mockLoaderData: undefined as ExamWithQuestions | undefined }
}))

vi.mock("../../../lib/teacher-feedback-config.js", () => ({
  teacherFeedbackConfig: {
    enabled: true,
    formUrl: "https://forms.gle/example"
  }
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useLoaderData: () => previewTestCtx.mockLoaderData
    }),
    redirect: ({ to }: { to: string }) => Object.assign(new Error(`Redirect to ${to}`), { isRedirect: true, to }),
    useNavigate: () => mockNavigate,
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

vi.mock("../../../lib/api.js", async (importOriginal) => {
  const orig = await importOriginal<typeof ApiModule>()
  return {
    ...orig,
    api: {
      ...orig.api,
      exams: {
        ...orig.api.exams,
        get: vi.fn(),
        export: mockExamsExport,
        generateDiscussion: mockGenerateDiscussion,
        streamDiscussion: mockStreamDiscussion
      },
      feedback: {
        setExamOutcome: mockFeedbackSetExamOutcome
      }
    }
  }
})

type RouteOptions = {
  component: ComponentType
  loader?: (ctx: { deps: { examId?: string } }) => Promise<unknown>
}

const mockExamsGet = (api as unknown as { exams: { get: ReturnType<typeof vi.fn> } }).exams.get

function getLoader() {
  return (Route as unknown as { options: RouteOptions }).options.loader!
}

function seedPreviewDraft(questions?: Array<Question>) {
  examDraftStore.setQuestions(questions ?? [makeMcqSingle(1), makeMcqSingle(2)])
  examDraftStore.setReviewMode("fast")
  examDraftStore.setConfig({
    subject: "bahasa_indonesia",
    grade: 6,
    topic: "Teks Narasi",
    examType: "formatif"
  })
  examDraftStore.setMetadata({
    schoolName: "SD Nusantara",
    academicYear: "2025/2026",
    examDate: "23 April 2026",
    durationMinutes: 60,
    instructions: "Pilih jawaban yang benar."
  })
}

function renderPreviewPage() {
  const PreviewPage = (Route as unknown as { options: RouteOptions }).options.component
  return render(<PreviewPage />)
}

function closestByAttr(node: HTMLElement, attr: string): HTMLElement | null {
  return node.closest(`[${attr}]`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockNavigate.mockResolvedValue(undefined)
  previewTestCtx.mockLoaderData = undefined
  examDraftStore.reset()
  seedPreviewDraft()
  delete document.body.dataset["printScope"]
})

afterEach(() => {
  delete document.body.dataset["printScope"]
  vi.useRealTimers()
  vi.restoreAllMocks()
})

export {
  act,
  closestByAttr,
  fireEvent,
  getLoader,
  mockExamsExport,
  mockExamsGet,
  mockFeedbackSetExamOutcome,
  mockGenerateDiscussion,
  mockNavigate,
  mockStreamDiscussion,
  previewTestCtx,
  renderPreviewPage,
  screen,
  seedPreviewDraft,
  within
}
