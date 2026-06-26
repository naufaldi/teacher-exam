import type * as TanStackRouter from "@tanstack/react-router"
import { brandExamId, brandQuestionId, type PublicExamDetailResponse } from "@teacher-exam/shared"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentType } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockApiResolvedValueOnce } from "../../lib/api-test-utils.js"
import type * as ApiModule from "../../lib/api.js"

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
    })
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
  loader: (ctx: { params: { slug: string } }) => Promise<unknown>
}

function makePublicExam(): PublicExamDetailResponse {
  return {
    id: brandExamId("public-exam-1"),
    title: "Lembar Publik Bahasa Indonesia",
    subject: "bahasa_indonesia",
    grade: 6,
    difficulty: "sedang",
    topics: ["Teks Narasi"],
    reviewMode: "fast",
    status: "final",
    schoolName: null,
    academicYear: null,
    examType: "formatif",
    examDate: null,
    durationMinutes: null,
    instructions: null,
    classContext: null,
    discussionMd: "## Pembahasan singkat",
    publishedAt: "2026-05-08T00:00:00.000Z",
    createdAt: "2026-05-08T00:00:00.000Z",
    updatedAt: "2026-05-08T00:00:00.000Z",
    questions: [
      {
        _tag: "mcq_single",
        id: brandQuestionId("q-1"),
        examId: brandExamId("public-exam-1"),
        number: 1,
        text: "Ibu kota Indonesia adalah...",
        options: {
          a: "Jakarta",
          b: "Bandung",
          c: "Medan",
          d: "Surabaya"
        },
        correct: "a",
        topic: "Teks Narasi",
        difficulty: "sedang",
        status: "accepted",
        validationStatus: null,
        validationReason: null,
        createdAt: "2026-05-08T00:00:00.000Z"
      }
    ]
  }
}

function renderPage() {
  const PublicSharePage = (Route as unknown as { options: RouteOptions }).options.component
  return render(<PublicSharePage />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoaderData = makePublicExam()
  mockParams = { slug: "share-abc123" }
  mockPublicExamExport.mockResolvedValue(undefined)
})

describe("share/$slug route", () => {
  it("loader fetches the public exam by slug", async () => {
    mockApiResolvedValueOnce(mockPublicExamGet, makePublicExam())
    const loader = (Route as unknown as { options: RouteOptions }).options.loader

    await loader({ params: { slug: "share-abc123" } })

    expect(mockPublicExamGet).toHaveBeenCalledWith("share-abc123")
  })

  it("renders the public exam content without auth context", () => {
    renderPage()

    expect(screen.getByText("Lembar Publik Bahasa Indonesia")).toBeInTheDocument()
    expect(screen.getByText("Soal Ujian")).toBeInTheDocument()
    expect(screen.getByText("Kunci Jawaban")).toBeInTheDocument()
    expect(screen.getByText("Pembahasan")).toBeInTheDocument()
  })

  it("export dropdown offers PDF/DOCX and Cetak; Cetak calls window.print", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {})
    const user = userEvent.setup()
    renderPage()

    // Open the Unduh dropdown
    await user.click(screen.getByRole("button", { name: /unduh/i }))

    // "Cetak" menu item triggers the browser print dialog
    await user.click(screen.getByRole("button", { name: "Cetak" }))
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it("export dropdown PDF item calls api.publicExams.export with the slug", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole("button", { name: /unduh/i }))
    await user.click(screen.getByRole("button", { name: "PDF" }))

    expect(mockPublicExamExport).toHaveBeenCalledWith("share-abc123", "pdf", "soal")
  })

  it("renders LaTeX in public question text and options", () => {
    const exam = makePublicExam()
    const question = exam.questions[0]
    if (question?._tag !== "mcq_single") throw new Error("Expected mcq_single fixture")

    mockLoaderData = {
      ...exam,
      subject: "matematika",
      questions: [{
        ...question,
        text: "Hitung $\\frac{3}{4}$ dari 20.",
        options: { a: "$15$", b: "$10$", c: "$5$", d: "$20$" }
      }]
    }

    const { container } = renderPage()

    expect(container.querySelectorAll(".katex").length).toBeGreaterThan(1)
    expect(container.textContent).not.toContain("$")
  })

  it("renders LaTeX in public pembahasan markdown", () => {
    mockLoaderData = {
      ...makePublicExam(),
      subject: "matematika",
      discussionMd: "## 1. Pecahan\n**Jawaban Benar: A**\n\nGunakan $\\frac{1}{2}$ bagian."
    }

    const { container } = renderPage()

    expect(container.querySelector(".katex")).not.toBeNull()
    expect(container.textContent).not.toContain("$")
  })

  it("renders generated figure specs in public questions", () => {
    const exam = makePublicExam()
    const question = exam.questions[0]
    if (question?._tag !== "mcq_single") throw new Error("Expected mcq_single fixture")

    mockLoaderData = {
      ...exam,
      subject: "matematika",
      topics: ["Bangun Datar"],
      questions: [{
        ...question,
        topic: "Bangun Datar",
        text: "Perhatikan lingkaran berikut.",
        figure: { type: "circle", radius: 7, label: "r = 7 cm" }
      }]
    }

    const { container } = renderPage()

    expect(container.querySelector("[data-figure-svg]")).not.toBeNull()
  })
})
