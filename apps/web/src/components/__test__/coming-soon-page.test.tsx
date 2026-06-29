import { render, screen } from "@testing-library/react"
import { Users } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import { ComingSoonPage } from "../coming-soon-page.js"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  )
}))

describe("ComingSoonPage", () => {
  it("renders page header, coming soon copy, and dashboard link", () => {
    render(
      <ComingSoonPage
        title="Kelas"
        subtitle="Kelola kelas dan daftar siswa untuk pengiriman ujian."
        icon={<Users size={24} data-testid="kelas-icon" />}
      />
    )

    expect(screen.getByRole("heading", { level: 1, name: "Kelas" })).toBeInTheDocument()
    expect(screen.getByText(/kelola kelas dan daftar siswa/i)).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: /segera hadir/i })).toBeInTheDocument()
    expect(screen.getByText(/sedang dalam pengembangan/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /kembali ke dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    )
    expect(screen.getByTestId("kelas-icon")).toBeInTheDocument()
  })
})
