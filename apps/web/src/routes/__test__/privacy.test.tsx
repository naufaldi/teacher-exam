import type * as TanStackRouter from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement, ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Route as AkunRoute } from "../_auth.akun"
import { Route as PolicyRoute } from "../kebijakan-privasi"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: { component?: () => ReactElement }) => ({
      options: opts
    }),
    Link: ({
      children,
      to
    }: {
      children: ReactNode
      to: string
    }) => <a href={to}>{children}</a>
  }
})

const PolicyPage = PolicyRoute.options.component
const AkunPage = AkunRoute.options.component

if (PolicyPage === undefined || AkunPage === undefined) {
  throw new Error("privacy route component missing")
}

describe("kebijakan privasi", () => {
  it("shows the sentence that deleting the account removes the stored data", () => {
    render(<PolicyPage />)

    expect(
      screen.getByText("Menghapus akun menghapus data tersebut.")
    ).toBeInTheDocument()
  })
})

describe("akun", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it("does not submit until the field equals HAPUS", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()
    render(<AkunPage />)

    const field = screen.getByLabelText("Ketik HAPUS untuk menghapus akun")
    const submit = screen.getByRole("button", { name: "Hapus akun" })

    expect(submit).toBeDisabled()
    await user.type(field, "SALAH")
    expect(submit).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()

    await user.clear(field)
    await user.type(field, "HAPUS")
    expect(submit).toBeEnabled()

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ deleted: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    )
    await user.click(submit)

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ confirm: "HAPUS" })
      })
    )
  })
})
