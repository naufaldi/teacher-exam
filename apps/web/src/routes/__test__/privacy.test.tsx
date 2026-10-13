import type * as TanStackRouter from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement, ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Route as AkunRoute } from "../_auth.akun"
import { Route as PolicyRoute } from "../kebijakan-privasi"
import { Route as PrivacyRoute } from "../privacy"

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
const PrivacyPage = PrivacyRoute.options.component
const AkunPage = AkunRoute.options.component

if (PolicyPage === undefined || PrivacyPage === undefined || AkunPage === undefined) {
  throw new Error("privacy route component missing")
}

const NOTICE_HEADINGS = [
  "Data yang dikumpulkan",
  "Tujuan pemrosesan",
  "Jangka waktu penyimpanan",
  "Permintaan penghapusan",
  "Kontak",
  "Pihak ketiga"
] as const

function expectPrivacyNotice() {
  for (const heading of NOTICE_HEADINGS) {
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument()
  }
  expect(screen.getByText("Menghapus akun menghapus data tersebut.")).toBeInTheDocument()
  expect(
    screen.getByText("[PLACEHOLDER] jangka waktu penyimpanan akun dan profil guru belum ditetapkan.")
  ).toBeInTheDocument()
  expect(
    screen.getByText("[PLACEHOLDER] jangka waktu penyimpanan ujian, soal, dan berkas PDF belum ditetapkan.")
  ).toBeInTheDocument()
  expect(
    screen.getByText("[PLACEHOLDER] jangka waktu penyimpanan laporan kesalahan di Sentry belum ditetapkan.")
  ).toBeInTheDocument()
  expect(
    screen.getByText("[PLACEHOLDER] alamat email kontak privasi belum ditetapkan.")
  ).toBeInTheDocument()
  expect(
    screen.getByText(
      "Masuk memakai Google. Google menerima permintaan masuk dan mengirim nama, email, dan foto profil."
    )
  ).toBeInTheDocument()
  expect(
    screen.getByText(
      "Ujian Sekolah mengirim teks soal dan berkas PDF ke penyedia AI yang sedang dipakai. Penyedia itu adalah Anthropic, OpenAI, atau MiniMax."
    )
  ).toBeInTheDocument()
  expect(
    screen.getByText(
      "Sentry menerima laporan kesalahan dan nama tahap pemakaian ketika pemantauan kesalahan dinyalakan."
    )
  ).toBeInTheDocument()
  expect(screen.queryByText("Halaman tidak ditemukan")).not.toBeInTheDocument()
}

describe("kebijakan privasi", () => {
  it("shows the sentence that deleting the account removes the stored data", () => {
    render(<PolicyPage />)

    expect(
      screen.getByText("Menghapus akun menghapus data tersebut.")
    ).toBeInTheDocument()
  })

  it("shows the same UU PDP notice as /privacy", () => {
    render(<PolicyPage />)
    expectPrivacyNotice()
  })
})

describe("/privacy", () => {
  it("shows the UU PDP notice instead of the unknown-page shell", () => {
    render(<PrivacyPage />)
    expectPrivacyNotice()
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
