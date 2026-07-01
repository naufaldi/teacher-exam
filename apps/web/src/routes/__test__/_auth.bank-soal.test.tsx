import type * as TanStackRouter from "@tanstack/react-router"
import type { BankSheet, PaginatedBankSheetsResponse, PaginatedPublicBankSheetsResponse } from "@teacher-exam/shared"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Route } from "../_auth.bank-soal.js"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
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

const browseSheetsMock = vi.fn()
const browsePublicSheetsMock = vi.fn()
const useSheetMock = vi.fn()

vi.mock("../../lib/api.js", () => ({
  api: {
    bank: {
      browseSheets: (...args: Array<unknown>) => browseSheetsMock(...args),
      browsePublicSheets: (...args: Array<unknown>) => browsePublicSheetsMock(...args),
      useSheet: (...args: Array<unknown>) => useSheetMock(...args),
      updateSheet: vi.fn()
    },
    exams: {
      get: vi.fn()
    }
  },
  unwrapApiEither: (result: { _tag: "Right"; right: unknown }) => result.right
}))

const sampleSheetResponse: PaginatedBankSheetsResponse = {
  data: [
    {
      id: "exam-1" as BankSheet["id"],
      userId: "user-1" as BankSheet["userId"],
      title: "IPAS / Kelas 5 / formatif",
      subject: "ipas",
      subjectLabel: null,
      grade: 5,
      topics: ["Energi"],
      difficulty: "sedang",
      examType: "formatif",
      status: "final",
      isPublic: true,
      questionCount: 18,
      bankedAt: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z"
    }
  ],
  total: 1,
  page: 1,
  limit: 20
}

const emptyPublic: PaginatedPublicBankSheetsResponse = {
  data: [],
  total: 0,
  page: 1,
  limit: 20
}

describe("BankSoalPage", () => {
  beforeEach(() => {
    browseSheetsMock.mockReset()
    browsePublicSheetsMock.mockReset()
    browseSheetsMock.mockResolvedValue({ _tag: "Right", right: sampleSheetResponse })
    browsePublicSheetsMock.mockResolvedValue({ _tag: "Right", right: emptyPublic })
  })

  it("renders lembar rows in Bank Saya tab", async () => {
    const Page = Route.options.component as React.ComponentType
    render(<Page />)

    await waitFor(() => {
      expect(screen.getByText("IPAS / Kelas 5 / formatif")).toBeInTheDocument()
    })
    expect(screen.getByText("18")).toBeInTheDocument()
    expect(screen.getByText(/lembar tersimpan/i)).toBeInTheDocument()
  })

  it("switches to Bank Publik tab", async () => {
    const user = userEvent.setup()
    const Page = Route.options.component as React.ComponentType
    render(<Page />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Bank Publik" })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Bank Publik" }))

    await waitFor(() => {
      expect(browsePublicSheetsMock).toHaveBeenCalled()
    })
  })
})
