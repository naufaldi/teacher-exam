import type * as TanStackRouter from "@tanstack/react-router"
import { ToastProvider } from "@teacher-exam/ui"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Route } from "../_auth.templates.js"

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

function renderRoute() {
  const Component = (Route as unknown as { options: { component: React.ComponentType } }).options.component
  return render(
    <ToastProvider>
      <Component />
    </ToastProvider>
  )
}

describe("Templates route", () => {
  it("shows coming soon page with dashboard link", () => {
    renderRoute()
    expect(screen.getByRole("heading", { level: 1, name: "Template" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: /segera hadir/i })).toBeInTheDocument()
    expect(screen.getByText(/sedang dalam pengembangan/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /kembali ke dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    )
  })
})
