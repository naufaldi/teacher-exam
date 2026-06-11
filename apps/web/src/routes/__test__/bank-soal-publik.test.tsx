import type * as TanStackRouter from "@tanstack/react-router"
import type { PaginatedPublicBankResponse } from "@teacher-exam/shared"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Route } from "../bank-soal-publik.js"

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
    }) => <a href={to}>{children}</a>
  }
})

const browsePublicMock = vi.fn()

vi.mock("../../lib/api.js", () => ({
  api: {
    bank: {
      browsePublic: (...args: Array<unknown>) => browsePublicMock(...args)
    }
  },
  unwrapApiEither: (result: { _tag: "Right"; right: unknown }) => result.right
}))

describe("BankSoalPublikPage", () => {
  beforeEach(() => {
    browsePublicMock.mockReset()
    browsePublicMock.mockResolvedValue({
      _tag: "Right",
      right: {
        data: [],
        total: 0,
        page: 1,
        limit: 20
      } satisfies PaginatedPublicBankResponse
    })
  })

  it("renders login CTA linking to home", async () => {
    const Page = Route.options.component as React.ComponentType
    render(<Page />)

    expect(
      await screen.findByRole("link", { name: /Login untuk simpan/i })
    ).toHaveAttribute("href", "/")
  })

  it("calls browsePublic on load", async () => {
    const Page = Route.options.component as React.ComponentType
    render(<Page />)

    await waitFor(() => {
      expect(browsePublicMock).toHaveBeenCalled()
    })
  })
})
