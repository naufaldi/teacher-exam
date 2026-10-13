import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GenerateProgressDialog } from "../generate-progress-dialog"

describe("GenerateProgressDialog", () => {
  it("uses the selected phase in progress copy", () => {
    render(<GenerateProgressDialog open progress={5} totalSoal={20} phaseLabel="Fase A" />)

    expect(screen.getByRole("dialog")).toHaveTextContent("CP Fase A")
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Fase C")
  })

  it("uses the requested totalSoal in the generated-question counter", () => {
    render(<GenerateProgressDialog open progress={95} totalSoal={30} />)

    expect(screen.getByRole("dialog")).toHaveTextContent(/Soal\s+30\s+\/\s+30 dibuat/)
  })

  it("shows completion state at progress=100 instead of overtime message", () => {
    render(<GenerateProgressDialog open progress={100} totalSoal={20} />)

    expect(screen.getByText("Menyiapkan halaman review...")).toBeInTheDocument()
    expect(screen.queryByText(/Menunggu AI/)).not.toBeInTheDocument()
  })

  it("shows overtime message at progress=99", () => {
    render(<GenerateProgressDialog open progress={99} totalSoal={20} />)

    expect(screen.getByText(/Menunggu AI/)).toBeInTheDocument()
    expect(screen.queryByText("Menyiapkan halaman review...")).not.toBeInTheDocument()
  })

  it("marks all steps as done at progress=100 (line-through decoration)", () => {
    render(<GenerateProgressDialog open progress={100} totalSoal={20} />)

    // All 4 steps should be rendered
    const steps = screen.getAllByRole("listitem")
    expect(steps).toHaveLength(4)
  })

  it("pdf_guru mode does not claim CP analysis (#233)", () => {
    render(
      <GenerateProgressDialog
        open
        progress={5}
        totalSoal={20}
        phaseLabel="Fase C"
        sourceMode="pdf_guru"
      />
    )

    const dialog = screen.getByRole("dialog")
    expect(dialog).not.toHaveTextContent(/Capaian Pembelajaran/i)
    expect(dialog).not.toHaveTextContent(/menganalisis.*CP/i)
    expect(dialog).toHaveTextContent(/Menganalisis materi PDF/i)
  })
})
