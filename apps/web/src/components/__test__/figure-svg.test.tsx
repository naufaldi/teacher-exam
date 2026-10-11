import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FigureSvg } from "../figure-svg.js"

describe("FigureSvg", () => {
  it("draws a circle from the shared radius", () => {
    const { container } = render(<FigureSvg figure={{ type: "circle", radius: 7 }} />)
    expect(container.querySelector("[data-figure-svg]")?.innerHTML).toContain("r=\"56\"")
  })
})
