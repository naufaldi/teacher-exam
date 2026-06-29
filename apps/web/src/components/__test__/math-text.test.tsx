import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MathText } from "../math-text.js"

describe("MathText", () => {
  it("renders inline LaTeX without showing delimiters", () => {
    const { container } = render(<MathText text="Nilai $\\frac{3}{4}$ bagian" />)

    expect(container.querySelector(".katex")).not.toBeNull()
    expect(container.textContent).toContain("Nilai")
    expect(container.textContent).toContain("bagian")
    expect(container.textContent).not.toContain("$")
  })

  it("renders display LaTeX in display mode", () => {
    const { container } = render(<MathText text="$$x^2 + y^2$$" />)

    expect(container.querySelector(".katex-display")).not.toBeNull()
    expect(container.textContent).not.toContain("$")
  })

  it("falls back without dollar signs for malformed LaTeX", () => {
    const { container } = render(<MathText text="Rumus $\\frac{3}{4" />)

    expect(container.textContent).not.toContain("$")
    expect(container.textContent).toContain("3/4")
  })

  it("renders ribuan-style inline math without visible delimiters", () => {
    const { container } = render(<MathText text="Hasil dari $5.678 + 3.421$ adalah ...." />)

    expect(container.textContent).not.toContain("$")
    expect(container.textContent).not.toContain("\\div")
  })

  it("renders delimited division without dollar signs", () => {
    const { container } = render(<MathText text="Hasil dari $1824 \\div 12$ adalah ...." />)

    expect(container.textContent).not.toContain("$")
    expect(container.querySelector(".katex")).not.toBeNull()
  })

  it("repairs tab-corrupted times and renders multiplication sign", () => {
    const { container } = render(<MathText text={"Hasil dari $124\times 36$"} />)

    expect(container.querySelector(".katex")).not.toBeNull()
    expect(container.textContent).toMatch(/124\s*×\s*36/)
  })

  it("renders bare corrupted fraction rac{3}{5}", () => {
    const { container } = render(<MathText text="rac{3}{5}" />)

    expect(container.querySelector(".katex")).not.toBeNull()
    expect(container.textContent).not.toMatch(/(?<![\\f])rac\{/)
    expect(container.textContent).not.toContain("$")
  })
})
