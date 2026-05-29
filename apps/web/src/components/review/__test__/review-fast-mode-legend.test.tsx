import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ReviewFastModeLegend } from "../review-fast-mode-legend.js"

describe("ReviewFastModeLegend", () => {
  it("renders all three legend entries with explanations", () => {
    render(<ReviewFastModeLegend />)

    expect(screen.getByTestId("fast-mode-legend")).toBeInTheDocument()
    expect(screen.getByText(/Hasil cek kurikulum otomatis/i)).toBeInTheDocument()
    expect(screen.getByText(/Jawaban benar soal ini/i)).toBeInTheDocument()
    expect(screen.getByText(/Materi\/kompetensi yang diuji/i)).toBeInTheDocument()
  })
})
