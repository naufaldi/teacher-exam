import type * as TanStackRouter from "@tanstack/react-router"
import type { CurriculumCatalogResponse, CurriculumTipsResponse, Exam } from "@teacher-exam/shared"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { makeExam } from "../../test/fixtures/exam.js"

import { Route } from "../_auth.dashboard.js"

const {
  MOCK_BI_TIPS,
  MOCK_CATALOG,
  MOCK_MTK_TIPS,
  mockInvalidate,
  mockLoaderData,
  mockNavigate,
  mockRouteContext,
  mockToast
} = vi.hoisted(() => {
  const catalog: CurriculumCatalogResponse = [
    {
      key: "bahasa_indonesia",
      label: "Bahasa Indonesia",
      family: "bahasa",
      optional: false,
      grades: [
        { grade: 5, phase: "C", availability: "ready" },
        { grade: 6, phase: "C", availability: "ready" }
      ]
    },
    {
      key: "matematika",
      label: "Matematika",
      family: "matematika",
      optional: false,
      grades: [
        { grade: 5, phase: "C", availability: "ready" },
        { grade: 6, phase: "C", availability: "ready" }
      ]
    },
    {
      key: "pendidikan_pancasila",
      label: "Pendidikan Pancasila",
      family: "pancasila",
      optional: false,
      grades: [{ grade: 5, phase: "C", availability: "ready" }]
    },
    {
      key: "ipas",
      label: "IPAS",
      family: "ipas",
      optional: false,
      grades: [{ grade: 5, phase: "C", availability: "ready" }]
    },
    {
      key: "bahasa_inggris",
      label: "Bahasa Inggris",
      family: "bahasa",
      optional: false,
      grades: [{ grade: 5, phase: "C", availability: "ready" }]
    }
  ]

  const biTips: CurriculumTipsResponse = {
    subject: "bahasa_indonesia",
    grade: 5,
    phase: "C",
    subjectLabel: "Bahasa Indonesia",
    title: "Capaian Pembelajaran Bahasa Indonesia",
    intro: "Sistem memakai Capaian Pembelajaran berikut secara otomatis saat Anda memilih mapel Bahasa Indonesia.",
    elements: [
      { label: "Menyimak.", description: "Menganalisis informasi dari teks lisan." },
      { label: "Membaca.", description: "Memahami ide pokok teks." },
      { label: "Berbicara.", description: "Menyampaikan gagasan secara logis." },
      { label: "Menulis.", description: "Menulis teks kompleks." }
    ],
    footer: "CP identik untuk Kelas 5 dan 6 — tidak perlu input manual.",
    source: "corpus"
  }

  const mtkTips: CurriculumTipsResponse = {
    ...biTips,
    subject: "matematika",
    subjectLabel: "Matematika",
    title: "Capaian Pembelajaran Matematika",
    intro: "Sistem memakai Capaian Pembelajaran berikut secara otomatis saat Anda memilih mapel Matematika.",
    elements: [
      { label: "Bilangan.", description: "Memahami bilangan cacah dan operasi hitung." },
      { label: "Aljabar.", description: "Mengenali pola dan kalimat matematika." },
      { label: "Pengukuran.", description: "Menggunakan satuan baku." },
      { label: "Analisis data.", description: "Membaca tabel dan diagram." }
    ]
  }

  return {
    mockNavigate: vi.fn(),
    mockInvalidate: vi.fn(),
    mockToast: vi.fn(),
    mockLoaderData: {
      exams: [] as Array<Exam>,
      catalog,
      tips: biTips
    },
    mockRouteContext: { user: { name: "Naufaldi Rafii", id: "user-1", email: "test@test.com" } },
    MOCK_CATALOG: catalog,
    MOCK_BI_TIPS: biTips,
    MOCK_MTK_TIPS: mtkTips
  }
})

vi.mock("@teacher-exam/ui", async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...(orig as object),
    useToast: () => ({ toast: mockToast })
  }
})

vi.mock("../../hooks/use-duplicate-exam.js", () => ({
  useDuplicateExam: () => ({
    confirmingExam: null,
    isPending: false,
    openFor: vi.fn(),
    close: vi.fn(),
    confirm: vi.fn()
  })
}))

vi.mock("../../lib/feature-flags.js", () => ({
  DELIVERY_ENABLED: true,
  DELIVERY_DISABLED_TITLE: "Fitur dalam pengembangan",
  KOREKSI_ENABLED: true,
  KOREKSI_DISABLED_TITLE: "Fitur dalam pengembangan"
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useLoaderData: () => mockLoaderData,
      useRouteContext: () => mockRouteContext
    }),
    useNavigate: () => mockNavigate,
    useRouter: () => ({ invalidate: mockInvalidate }),
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

function renderDashboard() {
  const DashboardPage = Route.options.component as React.ComponentType
  return render(<DashboardPage />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoaderData.exams = []
  mockLoaderData.catalog = MOCK_CATALOG
  mockLoaderData.tips = MOCK_BI_TIPS
})

describe("DashboardPage", () => {
  it("shows greeting with first name from route context", () => {
    renderDashboard()
    // name = 'Naufaldi Rafii' → firstName = 'Naufaldi'; h1 renders "Bu Naufaldi"
    expect(screen.getByText(/Bu Naufaldi/)).toBeInTheDocument()
  })

  it("shows 0/0/0 stats for empty exams list", () => {
    renderDashboard()
    // Stats: 0 total, 0 final, 0 draft
    const zeros = screen.getAllByText("0")
    expect(zeros.length).toBeGreaterThanOrEqual(3)
  })

  it("shows correct stats counts for mixed exams", () => {
    mockLoaderData.exams = [
      makeExam({ id: "1", status: "final" }),
      makeExam({ id: "2", status: "final" }),
      makeExam({ id: "3", status: "draft" })
    ]
    renderDashboard()
    // Stats section shows total/final/draft as h1-sized numbers; use getAllByText since
    // the same numbers may appear elsewhere (bar chart, footer counts).
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1) // total
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1) // final count
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1) // draft count
  })

  it("shows empty state when no last exam", () => {
    renderDashboard()
    expect(screen.getByText(/Belum ada lembar ujian/i)).toBeInTheDocument()
  })

  it("shows last exam title in LEMBAR TERAKHIR DIBUAT section", () => {
    mockLoaderData.exams = [
      makeExam({ id: "1", title: "TKA Bahasa Indonesia Kelas 6" }),
      makeExam({ id: "2", title: "Older Exam" })
    ]
    renderDashboard()
    // Title appears in both the preview card (h4) and the history row — at least once is fine
    expect(screen.getAllByText("TKA Bahasa Indonesia Kelas 6").length).toBeGreaterThanOrEqual(1)
  })

  it("shows Riwayat terbaru section heading", () => {
    renderDashboard()
    expect(screen.getByText("Riwayat terbaru")).toBeInTheDocument()
  })

  it("links to Bank Soal from the primary action cards", () => {
    renderDashboard()

    const bankLink = screen.getByRole("link", { name: /Bank Soal/i })

    expect(bankLink).toHaveAttribute("href", "/bank-soal")
  })

  it("shows empty state in Riwayat terbaru when no exams", () => {
    renderDashboard()
    expect(screen.getByText(/Belum ada riwayat ujian/i)).toBeInTheDocument()
  })

  it("shows exam rows in Riwayat terbaru for each recent exam", () => {
    mockLoaderData.exams = [
      makeExam({ id: "1", title: "Ujian Pancasila Kelas 5" }),
      makeExam({ id: "2", title: "Ujian Bahasa Indonesia Kelas 6" })
    ]
    renderDashboard()
    // Each title appears in both the LEMBAR TERAKHIR card (first exam) and the history rows
    expect(screen.getAllByText("Ujian Pancasila Kelas 5").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Ujian Bahasa Indonesia Kelas 6").length).toBeGreaterThanOrEqual(1)
  })

  it("shows correct exam count in Riwayat terbaru header", () => {
    mockLoaderData.exams = [
      makeExam({ id: "1" }),
      makeExam({ id: "2" }),
      makeExam({ id: "3" })
    ]
    renderDashboard()
    // Header + footer both show "3 dari 3"; getAllByText is fine
    expect(screen.getAllByText(/3 dari 3/).length).toBeGreaterThanOrEqual(1)
  })

  it("shows Matematika in hero badges when catalog includes it", () => {
    renderDashboard()
    expect(screen.getByText("Matematika")).toBeInTheDocument()
    expect(screen.getByText(/5 mapel siap generate/i)).toBeInTheDocument()
  })

  it("shows Matematika CP tips when tips payload is Matematika", () => {
    mockLoaderData.tips = MOCK_MTK_TIPS
    mockLoaderData.exams = [makeExam({ id: "1", subject: "matematika", grade: 5, title: "Ujian MTK" })]

    renderDashboard()

    expect(screen.getByText("Capaian Pembelajaran Matematika")).toBeInTheDocument()
    expect(screen.getByText(/Bilangan\./)).toBeInTheDocument()
    expect(screen.queryByText(/Empat elemen Bahasa Indonesia/i)).not.toBeInTheDocument()
  })

  it("shows latest final exam Koreksi as enabled and routes to correction", () => {
    mockLoaderData.exams = [
      makeExam({ id: "final-latest", status: "final", title: "Final Latest Exam" })
    ]

    renderDashboard()

    const koreksiButtons = screen.getAllByRole("button", { name: "Koreksi" })
    expect(koreksiButtons[0]).not.toBeDisabled()

    fireEvent.click(koreksiButtons[0]!)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/correction/$examId",
      params: { examId: expect.stringContaining("final-latest") }
    })
  })

  it("does not offer Koreksi on latest draft exam and routes Edit back to review", () => {
    mockLoaderData.exams = [
      makeExam({ id: "draft-latest", status: "draft", title: "Draft Latest Exam" })
    ]

    renderDashboard()

    expect(screen.queryByRole("button", { name: "Koreksi" })).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/review",
      search: { examId: "draft-latest", mode: "fast" }
    })
  })

  it("shows dashboard recent final row Koreksi as enabled and routes to correction", () => {
    mockLoaderData.exams = [
      makeExam({ id: "draft-latest", status: "draft", title: "Draft Latest Exam" }),
      makeExam({ id: "final-row", status: "final", title: "Final Row Exam" })
    ]

    renderDashboard()

    const koreksiButtons = screen.getAllByRole("button", { name: "Koreksi" })
    const historyKoreksi = koreksiButtons.find((btn) => !btn.closest("[class*='Lembar Terakhir']"))
      ?? koreksiButtons[koreksiButtons.length - 1]
    expect(historyKoreksi).toBeDefined()
    expect(historyKoreksi).not.toBeDisabled()

    fireEvent.click(historyKoreksi!)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/correction/$examId",
      params: { examId: expect.stringContaining("final-row") }
    })
  })
})
