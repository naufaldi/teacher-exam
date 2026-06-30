import type * as TanStackRouter from "@tanstack/react-router"
import { ToastProvider } from "@teacher-exam/ui"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Route } from "../_auth.analytics.js"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const orig = await importOriginal<typeof TanStackRouter>()
  return {
    ...orig,
    createFileRoute: () => (opts: Record<string, unknown>) => ({
      options: opts,
      useSearch: ({ select }: { select?: (s: unknown) => unknown } = {}) => {
        const state = { examId: "exam-1" }
        return select ? select(state) : state
      }
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

function renderRoute() {
  const Component = (Route as unknown as { options: { component: React.ComponentType } }).options.component
  return render(
    <ToastProvider>
      <Component />
    </ToastProvider>
  )
}

describe("Analytics route", () => {
  it("shows coming soon page with dashboard link", () => {
    renderRoute()
    expect(screen.getByRole("heading", { level: 1, name: "Analitik" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: /segera hadir/i })).toBeInTheDocument()
    expect(screen.getByText(/sedang dalam pengembangan/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /kembali ke dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    )
  })
})
