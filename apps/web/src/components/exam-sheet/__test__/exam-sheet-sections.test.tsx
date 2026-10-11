import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PaperFrame } from "../exam-sheet-sections.js"

const CREDIT_SENTENCE = "Dibuat dengan Ujian Sekolah"
const CREDIT_URL = "https://ujian-sekolah.naufaldi.com"

describe("PaperFrame sheet credit", () => {
  it("shows the product credit as the last line of the paper", () => {
    render(
      <PaperFrame>
        <p>Isi soal</p>
      </PaperFrame>
    )
    const link = screen.getByRole("link", { name: CREDIT_SENTENCE })
    expect(link.getAttribute("href")).toBe(CREDIT_URL)
    const frame = document.querySelector("[data-preview-frame]")
    expect(frame?.lastElementChild?.contains(link)).toBe(true)
    expect(frame?.textContent?.indexOf("Isi soal")).toBeLessThan(
      frame?.textContent?.indexOf(CREDIT_SENTENCE) ?? -1
    )
  })
})
