import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { ReactElement, ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Route } from "../index"

const { mockGetSession, mockSearch, mockSignInSocial } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignInSocial: vi.fn(),
  mockSearch: { reason: undefined as "session_expired" | undefined }
}))

vi.mock("../../lib/auth-client", () => ({
  getSession: mockGetSession,
  signIn: { social: mockSignInSocial }
}))

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: Record<string, unknown>) => ({
    options: config,
    useSearch: () => mockSearch
  }),
  useNavigate: () => mockNavigate,
  Link: ({
    children,
    className,
    to
  }: {
    children: ReactNode
    to?: unknown
    className?: string
  }) => (
    <a href={typeof to === "string" ? to : "#"} className={className}>
      {children}
    </a>
  ),
  redirect: (opts: Record<string, unknown>) => {
    const err = new Error("redirect") as Error & Record<string, unknown>
    err.isRedirect = true
    Object.assign(err, opts)
    throw err
  },
  isRedirect: (value: unknown) =>
    Boolean(value && typeof value === "object" && (value as { isRedirect?: unknown }).isRedirect)
}))

type BeforeLoadFn = () => Promise<unknown>
type LoginComponent = () => ReactElement

const beforeLoad = (Route as unknown as { options: { beforeLoad: BeforeLoadFn } })
  .options.beforeLoad
const LoginPage = (Route as unknown as { options: { component: LoginComponent } })
  .options.component

beforeEach(() => {
  vi.clearAllMocks()
  mockSearch.reason = undefined
})

describe("index.beforeLoad", () => {
  it("redirects authenticated users to the dashboard", async () => {
    mockGetSession.mockResolvedValue({ data: { user: { id: "u1" } } })

    let caught: (Error & Record<string, unknown>) | undefined
    try {
      await beforeLoad()
    } catch (e) {
      caught = e as Error & Record<string, unknown>
    }

    expect(caught).toBeDefined()
    expect(caught?.["to"]).toBe("/dashboard")
  })

  it("renders the login page when session lookup fails without a redirect", async () => {
    mockGetSession.mockRejectedValue(new Error("Failed to fetch"))

    await expect(beforeLoad()).resolves.toBeUndefined()
    render(<LoginPage />)

    expect(screen.getByRole("button", { name: "Masuk dengan akun Google" })).toBeInTheDocument()
  })
})

describe("LoginPage", () => {
  it("shows the sample sheet before the login control on a phone", () => {
    render(<LoginPage />)

    const sample = screen.getByRole("article", { name: "Contoh lembar ujian" })
    const aside = sample.closest("aside")
    expect(aside).not.toBeNull()
    expect(aside?.className ?? "").not.toMatch(/(?:^|\s)hidden(?:\s|$)/)
    expect(aside?.className ?? "").toMatch(/(?:^|\s)order-first(?:\s|$)/)
    expect(aside?.className ?? "").toMatch(/lg:order-none/)
    expect(aside?.className ?? "").toMatch(/(?:^|\s)items-start(?:\s|$)/)
    expect(aside?.className ?? "").toMatch(/lg:items-center/)
    expect(aside?.className ?? "").not.toMatch(/(?:^|\s)overflow-hidden(?:\s|$)/)
    expect(aside?.className ?? "").toMatch(/lg:overflow-hidden/)
  })

  it("says the landing covers kelas 1 to 6", () => {
    render(<LoginPage />)

    expect(screen.getByText("Kurikulum Merdeka · Kelas 1–6")).toBeInTheDocument()
    expect(screen.getByText(/Kelas 1–6 · Sesuai Kurikulum Merdeka/)).toBeInTheDocument()
    expect(screen.queryByText("Kurikulum Merdeka · Kelas 5 & 6")).not.toBeInTheDocument()
    expect(screen.queryByText(/SD Kelas 5 & 6/)).not.toBeInTheDocument()
  })

  it("names the product Ujian Sekolah on the landing", () => {
    render(<LoginPage />)

    expect(screen.getByText("Ujian Sekolah")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /Buat Soal Ujian Sekolah/i })).toBeInTheDocument()
    expect(screen.queryByText("Ujian SD")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: /Buat Soal Ujian SD/i })).not.toBeInTheDocument()
  })

  it("sets the document title to Ujian Sekolah", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8")
    expect(html).toContain("<title>Ujian Sekolah — Generator Soal</title>")
  })

  it("has one main landmark on the landing page", () => {
    render(<LoginPage />)

    expect(screen.getAllByRole("main")).toHaveLength(1)
  })

  it("starts Google sign-in with an absolute dashboard callback URL", async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole("button", { name: "Masuk dengan akun Google" }))

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: `${window.location.origin}/dashboard`
    })
  })
})
