import type * as TanStackRouter from "@tanstack/react-router"
import { brandExamId, type PublicExamDetailResponse } from "@teacher-exam/shared"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Either } from "effect"
import type { ComponentType } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiClientError } from "../../lib/api-errors.js"
import { mockApiResolvedValueOnce } from "../../lib/api-test-utils.js"
import type * as ApiModule from "../../lib/api.js"
import { makeMcqSingle, makeTrueFalse } from "../../test/fixtures/exam.js"

import { Route } from "../share.$slug.js"

const { mockPublicExamExport, mockPublicExamGet } = vi.hoisted(() => ({
  mockPublicExamGet: vi.fn(),
  mockPublicExamExport: vi.fn()
}))

let mockLoaderData: PublicExamDetailResponse | undefined
let mockParams: { slug: string } = { slug: "share-abc123" }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useLoaderData: () => mockLoaderData,
      useParams: () => mockParams
    }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>
  }
})

vi.mock("../../lib/api.js", async (importOriginal) => {
  const orig = await importOriginal<typeof ApiModule>()
  return {
    ...orig,
    api: {
      ...orig.api,
      publicExams: {
        get: mockPublicExamGet,
        export: mockPublicExamExport
      }
    }
  }
})

type RouteOptions = {
  component: ComponentType
  errorComponent: ComponentType<{ error: Error }>
  loader: (ctx: { params: { slug: string } }) => Promise<unknown>
}

function makePublicExam(overrides: Partial<PublicExamDetailResponse> = {}): PublicExamDetailResponse {
  return {
    id: brandExamId("public-exam-1"),
    title: "Lembar Publik Bahasa Indonesia",
    subject: "bahasa_indonesia",
    grade: 6,
    difficulty: "sedang",
    topics: ["Teks Narasi"],
    reviewMode: "fast",
    status: "final",
    schoolName: "SD Negeri Contoh",
    academicYear: "2025/2026",
    examType: "formatif",
    examDate: "29 Juni 2026",
    durationMinutes: 60,
    instructions: "Pilih jawaban terbaik.",
    classContext: null,
    discussionMd: "## Pembahasan singkat",
    publishedAt: "2026-05-08T00:00:00.000Z",
    createdAt: "2026-05-08T00:00:00.000Z",
    updatedAt: "2026-05-08T00:00:00.000Z",
    questions: [makeMcqSingle(1, "a", { examId: "public-exam-1", now: "2026-05-08T00:00:00.000Z" })],
    ...overrides
  }
}

function renderPage() {
  const PublicSharePage = (Route as unknown as { options: RouteOptions }).options.component
  return render(<PublicSharePage />)
}

function renderError(error: Error) {
  const ErrorPage = (Route as unknown as { options: RouteOptions }).options.errorComponent
  return render(<ErrorPage error={error} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoaderData = makePublicExam()
  mockParams = { slug: "share-abc123" }
  mockPublicExamExport.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("share/$slug route", () => {
  it("loader fetches the public exam by slug", async () => {
    mockApiResolvedValueOnce(mockPublicExamGet, makePublicExam())
    const loader = (Route as unknown as { options: RouteOptions }).options.loader

    await loader({ params: { slug: "share-abc123" } })

    expect(mockPublicExamGet).toHaveBeenCalledWith("share-abc123")
  })

  it("loader throws PublicShareNotFoundError on API 404", async () => {
    mockPublicExamGet.mockResolvedValueOnce(
      Either.left(new ApiClientError({ message: "Not found", code: "NOT_FOUND", status: 404 }))
    )
    const loader = (Route as unknown as { options: RouteOptions }).options.loader

    await expect(loader({ params: { slug: "missing" } })).rejects.toMatchObject({
      name: "PublicShareNotFoundError"
    })
  })

  it("error page shows friendly not-found copy with login CTA", () => {
    renderError(Object.assign(new Error("Public exam not found"), { name: "PublicShareNotFoundError" }))

    expect(screen.getByText("Lembar tidak ditemukan")).toBeInTheDocument()
    expect(screen.getByText(/tidak lagi publik/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /halaman login/i })).toHaveAttribute("href", "/")
  })

  it("renders exam sheet sections without auth context", () => {
    renderPage()

    expect(screen.getByText("Lembar Publik Bahasa Indonesia")).toBeInTheDocument()
    expect(screen.getByText("LEMBAR JAWABAN")).toBeInTheDocument()
    expect(screen.getByText("KUNCI JAWABAN")).toBeInTheDocument()
    expect(screen.getByText("PEMBAHASAN")).toBeInTheDocument()
  })

  it("mcq_single shows a. b. c. d. option labels", () => {
    renderPage()

    const soalSection = document.querySelector("[data-print-section=\"soal\"]")
    expect(soalSection).not.toBeNull()
    expect(within(soalSection as HTMLElement).getByText("a.")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("b.")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("c.")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("d.")).toBeInTheDocument()
  })

  it("true_false renders Pernyataan/B/S table", () => {
    mockLoaderData = makePublicExam({
      questions: [makeTrueFalse(1, [true, false], { examId: "public-exam-1", now: "2026-05-08T00:00:00.000Z" })]
    })
    renderPage()

    const soalSection = document.querySelector("[data-print-section=\"soal\"]")
    expect(soalSection).not.toBeNull()
    expect(within(soalSection as HTMLElement).getByText("Pernyataan")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("B")).toBeInTheDocument()
    expect(within(soalSection as HTMLElement).getByText("S")).toBeInTheDocument()
  })

  it("lembar jawaban section renders MCQ bubble rows", () => {
    renderPage()

    const ljSection = document.querySelector("[data-print-section=\"lj\"]")
    expect(ljSection).not.toBeNull()
    expect(within(ljSection as HTMLElement).getByText("A")).toBeInTheDocument()
    expect(within(ljSection as HTMLElement).getByText("D")).toBeInTheDocument()
  })

  it("hides pembahasan when discussionMd is null", () => {
    mockLoaderData = makePublicExam({ discussionMd: null })
    renderPage()

    expect(screen.queryByText("PEMBAHASAN")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /PDF Pembahasan/i })).not.toBeInTheDocument()
  })

  it("export dropdown Cetak calls window.print", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {})
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: /unduh soal/i }))
    await user.click(screen.getByRole("button", { name: "Cetak" }))
    await waitFor(() => {
      expect(printSpy).toHaveBeenCalledTimes(1)
    })
  })

  it("export dropdown PDF item calls api.publicExams.export with soal variant", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: /unduh soal/i }))
    await user.click(screen.getByRole("button", { name: "PDF" }))

    expect(mockPublicExamExport).toHaveBeenCalledWith("share-abc123", "pdf", "soal")
  })

  it("PDF Kunci button exports kunci variant", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: "PDF Kunci" }))
    expect(mockPublicExamExport).toHaveBeenCalledWith("share-abc123", "pdf", "kunci")
  })

  it("renders LaTeX in public question text and options", () => {
    const question = makeMcqSingle(1, "a", { examId: "public-exam-1", now: "2026-05-08T00:00:00.000Z" })

    mockLoaderData = makePublicExam({
      subject: "matematika",
      questions: [{
        ...question,
        text: "Hitung $\\frac{3}{4}$ dari 20.",
        options: { a: "$15$", b: "$10$", c: "$5$", d: "$20$" }
      }]
    })

    const { container } = renderPage()

    expect(container.querySelectorAll(".katex").length).toBeGreaterThan(1)
    expect(container.textContent).not.toContain("$")
  })

  it("renders LaTeX in public pembahasan markdown", () => {
    mockLoaderData = makePublicExam({
      subject: "matematika",
      discussionMd: "## 1. Pecahan\n**Jawaban Benar: A**\n\nGunakan $\\frac{1}{2}$ bagian."
    })

    const { container } = renderPage()

    expect(container.querySelector(".katex")).not.toBeNull()
    expect(container.textContent).not.toContain("$")
  })

  it("renders generated figure specs in public questions", () => {
    const question = makeMcqSingle(1, "a", { examId: "public-exam-1", now: "2026-05-08T00:00:00.000Z" })

    mockLoaderData = makePublicExam({
      subject: "matematika",
      topics: ["Bangun Datar"],
      questions: [{
        ...question,
        topic: "Bangun Datar",
        text: "Perhatikan lingkaran berikut.",
        figure: { type: "circle", radius: 7, label: "r = 7 cm" }
      }]
    })

    const { container } = renderPage()

    expect(container.querySelector("[data-figure-svg]")).not.toBeNull()
  })

  it("does not render pending questions in the sheet", () => {
    mockLoaderData = makePublicExam({
      questions: [
        makeMcqSingle(1, "a", { examId: "public-exam-1", now: "2026-05-08T00:00:00.000Z", status: "accepted" }),
        makeMcqSingle(2, "b", { examId: "public-exam-1", now: "2026-05-08T00:00:00.000Z", status: "pending" })
      ]
    })
    renderPage()

    const soalSection = document.querySelector("[data-print-section=\"soal\"]")
    expect(soalSection?.textContent).toContain("Soal nomor 1")
    expect(soalSection?.textContent).not.toContain("Soal nomor 2")
  })
})
