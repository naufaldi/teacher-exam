import { describe, expect, test } from "vitest"
import { renderFigureSvg } from "../figure-renderer"

describe("renderFigureSvg", () => {
  test.each([
    [{ type: "circle" as const, radius: 7, label: "r = 7 cm" }, "<circle"],
    [{ type: "square" as const, side: 8, label: "s = 8 cm" }, "<rect"],
    [{ type: "rectangle" as const, width: 12, height: 5, label: "12 cm x 5 cm" }, "<rect"],
    [{ type: "triangle" as const, base: 10, height: 6, label: "a = 10 cm, t = 6 cm" }, "<polygon"],
    [{ type: "trapezoid" as const, topBase: 6, bottomBase: 12, height: 4, label: "t = 4 cm" }, "<polygon"],
    [{
      type: "coordinate_plane" as const,
      xMin: -2,
      xMax: 4,
      yMin: -1,
      yMax: 5,
      points: [{ x: 1, y: 2, label: "A" }]
    }, "<line"]
  ])("renders deterministic SVG for %#", (figure, expectedFragment) => {
    const first = renderFigureSvg(figure)
    const second = renderFigureSvg(figure)
    expect(first).toBe(second)
    expect(first).toContain("<svg")
    expect(first).toContain("viewBox=\"0 0 240 160\"")
    expect(first).toContain(expectedFragment)
  })

  test("escapes labels before embedding them in SVG text nodes", () => {
    const svg = renderFigureSvg({ type: "circle", radius: 7, label: "r < 7 & cm" })
    expect(svg).toContain("r &lt; 7 &amp; cm")
    expect(svg).not.toContain("r < 7 & cm")
  })
})
