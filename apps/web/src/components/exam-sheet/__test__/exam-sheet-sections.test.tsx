import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { McqOptionsList, PaperFrame, PaperHeader, TrueFalseTable } from "../exam-sheet-sections.js"

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

describe("PaperHeader exam date", () => {
  it("prints 12 Oktober 2026 when the saved date is 2026-10-12", () => {
    render(
      <PaperHeader
        grade={4}
        subjectLabel="Matematika"
        topicsLabel=""
        metadata={{
          schoolName: "SD Negeri 1",
          academicYear: "2026/2027",
          examType: "formatif",
          examDate: "2026-10-12",
          durationMinutes: 60
        }}
      />
    )
    expect(screen.getByText("Hari/Tanggal : 12 Oktober 2026")).toBeInTheDocument()
  })
})

describe("A4 choice labels", () => {
  it("prints each PG and PG kompleks letter once", () => {
    const { container } = render(
      <McqOptionsList options={{ a: "pohon", b: "sungai", c: "gunung", d: "sekolah" }} />
    )
    expect(container.querySelector("ol")).toBeNull()
    expect(container.textContent).toBe("a.pohonb.sungaic.gunungd.sekolah")
    expect(container.textContent?.match(/a\./g)?.length).toBe(1)
    expect(container.textContent?.match(/b\./g)?.length).toBe(1)
  })

  it("prints a letter once when the choice text already includes it", () => {
    const { container } = render(
      <McqOptionsList options={{ a: "a. pohon", b: "b. sungai", c: "c. gunung", d: "d. sekolah" }} />
    )
    expect(container.textContent).toBe("a.pohonb.sungaic.gunungd.sekolah")
    expect(container.textContent).not.toMatch(/a\.\s*a\./)
    expect(container.textContent?.match(/a\./g)?.length).toBe(1)
  })

  it("prints each benar/salah statement once", () => {
    render(
      <TrueFalseTable
        statements={[
          { text: "pohon tinggi", answer: true },
          { text: "sungai mengalir", answer: false },
          { text: "gunung tinggi", answer: true }
        ]}
      />
    )
    const table = screen.getByRole("table")
    expect(table.textContent).toBe("PernyataanBSpohon tinggisungai mengalirgunung tinggi")
    expect(table.textContent?.match(/B/g)?.length).toBe(1)
    expect(table.textContent?.match(/S/g)?.length).toBe(1)
    expect(table.textContent).not.toMatch(/a\.\s*a\./)
  })
})
