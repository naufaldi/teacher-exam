import type { BankQuestion, PaginatedBankResponse, PaginatedPublicBankResponse } from "@teacher-exam/shared"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Route } from "../_auth.bank-soal.js"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts
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

const browseMock = vi.fn()
const browsePublicMock = vi.fn()

vi.mock("../../lib/api.js", () => ({
  api: {
    bank: {
      browse: (...args: Array<unknown>) => browseMock(...args),
      browsePublic: (...args: Array<unknown>) => browsePublicMock(...args),
      buildExam: vi.fn()
    }
  },
  unwrapApiEither: (result: { _tag: "Right"; right: unknown }) => result.right
}))

const sampleResponse: PaginatedBankResponse = {
  data: [
    {
      id: "bank-1" as BankQuestion["id"],
      questionId: "q-1" as BankQuestion["questionId"],
      userId: "user-1",
      subject: "ipas",
      grade: 5,
      topics: ["Energi"],
      difficulty: "sedang",
      type: "mcq_single",
      payload: {},
      isPublic: false,
      usageCount: 0,
      createdAt: "2024-01-01T00:00:00.000Z",
      text: "Apa itu energi?",
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      correctAnswer: "a"
    }
  ],
  total: 1,
  page: 1,
  limit: 20
}

const emptyPublic: PaginatedPublicBankResponse = {
  data: [],
  total: 0,
  page: 1,
  limit: 20
}

describe("BankSoalPage", () => {
  beforeEach(() => {
    browseMock.mockReset()
    browsePublicMock.mockReset()
    browseMock.mockResolvedValue({ _tag: "Right", right: sampleResponse })
    browsePublicMock.mockResolvedValue({ _tag: "Right", right: emptyPublic })
  })

  it("renders empty state when bank has no questions", async () => {
    browseMock.mockResolvedValue({
      _tag: "Right",
      right: { data: [], total: 0, page: 1, limit: 20 }
    })

    const BankSoalPage = Route.options.component as React.ComponentType
    render(<BankSoalPage />)

    expect(await screen.findByText(/Bank soal masih kosong/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Generate ujian/i })).toHaveAttribute("href", "/generate")
  })

  it("renders bank question cards and toolbar on Bank Saya tab", async () => {
    const BankSoalPage = Route.options.component as React.ComponentType
    render(<BankSoalPage />)

    await waitFor(() => {
      expect(screen.getByText("Apa itu energi?")).toBeInTheDocument()
    })
    expect(screen.getByText(/Pribadi/i)).toBeInTheDocument()
    expect(screen.getByText(/Menampilkan/)).toHaveTextContent("1")
    expect(screen.getByRole("button", { name: "Bank Saya" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Bank Publik" })).toBeInTheDocument()
  })

  it("loads public bank when Bank Publik tab is clicked", async () => {
    const user = userEvent.setup()
    const BankSoalPage = Route.options.component as React.ComponentType
    render(<BankSoalPage />)

    await user.click(screen.getByRole("button", { name: "Bank Publik" }))

    await waitFor(() => {
      expect(browsePublicMock).toHaveBeenCalled()
    })
  })

  it("opens preview dialog when a card is clicked", async () => {
    const user = userEvent.setup()
    const BankSoalPage = Route.options.component as React.ComponentType
    render(<BankSoalPage />)

    await waitFor(() => {
      expect(screen.getByText("Apa itu energi?")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /Pratinjau soal/i }))

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Kunci A")).toBeInTheDocument()
  })
})
