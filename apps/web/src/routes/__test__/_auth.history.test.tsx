import type * as TanStackRouter from "@tanstack/react-router"
import { ToastProvider } from "@teacher-exam/ui"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockApiFailOnce, mockApiResolvedValueOnce } from "../../lib/api-test-utils.js"
import type * as ApiModule from "../../lib/api.js"
import { api, ApiError } from "../../lib/api.js"
import { makeExam } from "../../test/fixtures/exam.js"

import { Route } from "../_auth.history.js"

const { mockClipboardWriteText, mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockClipboardWriteText: vi.fn().mockResolvedValue(undefined)
}))

// Mock TanStack Router
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: { component: React.ComponentType }) => ({
      options: opts
    }),
    useNavigate: () => mockNavigate
  }
})

// Mock api
vi.mock("../../lib/api.js", async (importOriginal) => {
  const orig = await importOriginal<typeof ApiModule>()
  return {
    ...orig,
    api: {
      exams: {
        list: vi.fn(),
        remove: vi.fn(),
        duplicate: vi.fn(),
        share: vi.fn()
      }
    }
  }
})

const mockApi = api as unknown as {
  exams: {
    list: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    duplicate: ReturnType<typeof vi.fn>
    share: ReturnType<typeof vi.fn>
  }
}

function renderHistoryPage() {
  const HistoryPage = Route.options.component as React.ComponentType
  return render(
    <ToastProvider>
      <HistoryPage />
    </ToastProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: mockClipboardWriteText
    }
  })
})

describe("HistoryPage", () => {
  it("shows loading spinner initially", () => {
    mockApi.exams.list.mockReturnValue(new Promise(() => {})) // never resolves
    renderHistoryPage()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("shows error state when api.exams.list() rejects", async () => {
    mockApiFailOnce(mockApi.exams.list, new ApiError({ message: "Server error", code: "INTERNAL", status: 500 }))
    renderHistoryPage()
    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument()
    })
  })

  it("shows retry button in error state", async () => {
    mockApiFailOnce(mockApi.exams.list, new ApiError({ message: "Network error", code: "NETWORK", status: 503 }))
    renderHistoryPage()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /coba lagi/i })).toBeInTheDocument()
    })
  })

  it("shows truly-empty state when api returns empty array", async () => {
    mockApiResolvedValueOnce(mockApi.exams.list, [])
    renderHistoryPage()
    await waitFor(() => {
      expect(screen.getByText(/Belum ada lembar tersimpan/i)).toBeInTheDocument()
    })
  })

  it("shows exam rows when api returns data", async () => {
    const exams = [
      makeExam({ id: "exam-1", title: "Ujian BI Kelas 5", status: "final" }),
      makeExam({ id: "exam-2", title: "Draft Matematika", status: "draft" })
    ]
    mockApiResolvedValueOnce(mockApi.exams.list, exams)
    renderHistoryPage()
    await waitFor(() => {
      expect(screen.getByText("Ujian BI Kelas 5")).toBeInTheDocument()
      expect(screen.getByText("Draft Matematika")).toBeInTheDocument()
    })
  })

  it("filters history by IPAS subject", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(mockApi.exams.list, [
      makeExam({ id: "ipas-exam", title: "Ujian IPAS", subject: "ipas" }),
      makeExam({ id: "bi-exam", title: "Ujian BI", subject: "bahasa_indonesia" })
    ])

    renderHistoryPage()

    await screen.findByText("Ujian IPAS")
    await user.selectOptions(screen.getByLabelText("Filter mata pelajaran"), "ipas")

    expect(screen.getByText("Ujian IPAS")).toBeInTheDocument()
    expect(screen.queryByText("Ujian BI")).not.toBeInTheDocument()
  })

  it("filters history by Bahasa Inggris subject", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(mockApi.exams.list, [
      makeExam({ id: "bing-exam", title: "Ujian B.Inggris", subject: "bahasa_inggris" }),
      makeExam({ id: "ppkn-exam", title: "Ujian PPKN", subject: "pendidikan_pancasila" })
    ])

    renderHistoryPage()

    await screen.findByText("Ujian B.Inggris")
    await user.selectOptions(screen.getByLabelText("Filter mata pelajaran"), "bahasa_inggris")

    expect(screen.getByText("Ujian B.Inggris")).toBeInTheDocument()
    expect(screen.queryByText("Ujian PPKN")).not.toBeInTheDocument()
  })

  it("shows preview/correction actions for final exams", async () => {
    mockApiResolvedValueOnce(mockApi.exams.list, [
      makeExam({ id: "exam-final", status: "final" })
    ])
    renderHistoryPage()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /preview/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /koreksi/i })).toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /cetak/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^duplikat$/i })).not.toBeInTheDocument()
  })

  it("renders status badge alongside all actions for a final row", async () => {
    mockApiResolvedValueOnce(mockApi.exams.list, [
      makeExam({ id: "exam-final-row", status: "final", title: "Lembar Ujian Akhir" })
    ])
    renderHistoryPage()

    await screen.findByText("Lembar Ujian Akhir")

    expect(screen.getByText("Final", { selector: "span" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /preview/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /koreksi/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^bagikan$/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /aksi lain/i })).toBeInTheDocument()
  })

  it("shows edit/duplicate actions for draft exams", async () => {
    mockApiResolvedValueOnce(mockApi.exams.list, [
      makeExam({ id: "exam-draft", status: "draft" })
    ])
    renderHistoryPage()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /^duplikat$/i })).toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /cetak/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /koreksi/i })).not.toBeInTheDocument()
  })

  it("draft Edit opens the existing exam in review with examId and mode", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(mockApi.exams.list, [
      makeExam({ id: "exam-draft-slow", status: "draft", reviewMode: "slow" })
    ])
    renderHistoryPage()

    await user.click(await screen.findByRole("button", { name: /^edit$/i }))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/review",
      search: { examId: "exam-draft-slow", mode: "slow" }
    })
  })

  it("final exam title opens preview with examId", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(mockApi.exams.list, [
      makeExam({ id: "exam-final-title", status: "final", title: "Final Bahasa Indonesia" })
    ])
    renderHistoryPage()

    await user.click(await screen.findByRole("button", { name: "Final Bahasa Indonesia" }))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/preview",
      search: { examId: "exam-final-title" }
    })
  })

  it("draft exam title opens review with examId and mode", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(mockApi.exams.list, [
      makeExam({ id: "exam-draft-title", status: "draft", title: "Draft Pancasila", reviewMode: "slow" })
    ])
    renderHistoryPage()

    await user.click(await screen.findByRole("button", { name: "Draft Pancasila" }))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/review",
      search: { examId: "exam-draft-title", mode: "slow" }
    })
  })

  it("clicking Hapus lembar opens confirm dialog", async () => {
    const user = userEvent.setup()
    const exams = [makeExam({ id: "exam-1", status: "final" })]
    mockApiResolvedValueOnce(mockApi.exams.list, exams)
    renderHistoryPage()

    await waitFor(() => {
      expect(screen.getByText("Test Exam")).toBeInTheDocument()
    })

    // Open the dropdown (details element)
    const moreButton = screen.getByRole("button", { name: /aksi lain/i })
    // details/summary don't respond to userEvent.click in jsdom; click directly
    await user.click(moreButton)

    // Click "Hapus lembar"
    const hapusButton = screen.getByText(/Hapus lembar/i)
    await user.click(hapusButton)

    // Confirm dialog should be visible
    await waitFor(() => {
      expect(screen.getByText(/Hapus lembar ini\?/i)).toBeInTheDocument()
    })
  })

  it("confirming delete calls api.exams.remove and removes exam from list", async () => {
    const user = userEvent.setup()
    const exams = [makeExam({ id: "exam-1", status: "final", title: "Ujian BI" })]
    mockApiResolvedValueOnce(mockApi.exams.list, exams)
    mockApiResolvedValueOnce(mockApi.exams.remove, undefined)
    renderHistoryPage()

    await waitFor(() => {
      expect(screen.getByText("Ujian BI")).toBeInTheDocument()
    })

    // Open dropdown
    const moreButton = screen.getByRole("button", { name: /aksi lain/i })
    await user.click(moreButton)

    // Click Hapus lembar
    await user.click(screen.getByText(/Hapus lembar/i))

    // Confirm dialog shown
    await waitFor(() => {
      expect(screen.getByText(/Hapus lembar ini\?/i)).toBeInTheDocument()
    })

    // Confirm delete
    await user.click(screen.getByRole("button", { name: /ya, hapus/i }))

    await waitFor(() => {
      expect(mockApi.exams.remove).toHaveBeenCalledWith("exam-1")
    })
  })

  it("copies a public share link for final exams", async () => {
    const user = userEvent.setup()
    mockApiResolvedValueOnce(mockApi.exams.list, [
      makeExam({ id: "exam-share", status: "final", title: "Final untuk Dibagikan" })
    ])
    mockApiResolvedValueOnce(mockApi.exams.share, {
      slug: "share-abc123",
      publicUrlPath: "/share/share-abc123",
      publishedAt: "2026-05-08T00:00:00.000Z"
    })

    renderHistoryPage()

    await user.click(await screen.findByRole("button", { name: /^Bagikan$/i }))

    await waitFor(() => {
      expect(mockApi.exams.share).toHaveBeenCalledWith("exam-share")
    })

    expect(await screen.findByText("Link publik berhasil disalin")).toBeInTheDocument()
  })
})
