import { describe, expect, test } from "vitest"
import { checkFigureAnswer, drawnClockTime, renderFigureSvg } from "../diagram.js"
import type { FigureSpec } from "../schemas/figures.js"

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = state + 0x6d2b79f5 | 0
    let t = Math.imul(state ^ state >>> 15, 1 | state)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function int(next: () => number, min: number, max: number): number {
  return min + Math.floor(next() * (max - min + 1))
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left)
  let b = Math.abs(right)
  while (b !== 0) {
    const rest = a % b
    a = b
    b = rest
  }
  return a
}

function fractionText(numerator: number, denominator: number): string {
  const divisor = gcd(numerator, denominator)
  const num = numerator / divisor
  const den = denominator / divisor
  return den === 1 ? String(num) : `${num}/${den}`
}

function otherAnswer(answer: string): string {
  if (answer.includes(":")) return answer === "1:11" ? "2:22" : "1:11"
  if (answer.startsWith("(")) return answer === "(9, 9)" ? "(8, 8)" : "(9, 9)"
  if (answer.includes("π")) return "0"
  return answer === "0" ? "1" : "0"
}

function mcq(figure: FigureSpec, answer: string) {
  return {
    _tag: "mcq_single" as const,
    figure,
    correct: "a" as const,
    options: { a: answer, b: otherAnswer(answer), c: "lain", d: "bukan" }
  }
}

function expectAnswerAgrees(figure: FigureSpec, answer: string): void {
  expect(checkFigureAnswer(mcq(figure, answer))).toEqual({ _tag: "Match", derived: answer })
  const wrong = otherAnswer(answer)
  expect(
    checkFigureAnswer({
      ...mcq(figure, answer),
      correct: "b",
      options: { a: answer, b: wrong, c: "lain", d: "bukan" }
    })._tag
  ).toBe("Mismatch")
}

function scaleX(value: number, min: number, max: number): number {
  return Math.round(36 + ((value - min) / (max - min)) * 180)
}

function labelAt(svg: string, x: number): string | undefined {
  const labels = [...svg.matchAll(/<text x="(\d+)"[^>]*>([^<]*)<\/text>/g)]
  return labels.find((label) => label[1] === String(x))?.[2]
}

describe("diagram property checks", () => {
  test("random number lines label the marked value under the dot", () => {
    const next = mulberry32(11)
    for (let sample = 0; sample < 20; sample++) {
      const step = int(next, 1, 3)
      const steps = int(next, 2, 8)
      const max = step * steps
      const onTick = next() < 0.5
      const value = onTick ? step * int(next, 0, steps) : int(next, 0, max)
      const figure: FigureSpec = {
        type: "number_line",
        min: 0,
        max,
        step,
        marks: [{ value }],
        measure: { kind: "value", index: 0 }
      }
      const svg = renderFigureSvg(figure)
      expect(labelAt(svg, scaleX(value, 0, max))).toBe(String(value))
      expectAnswerAgrees(figure, String(value))
    }
  })

  test("random fraction bars and circles agree with the shaded value", () => {
    const next = mulberry32(22)
    for (const form of ["bar", "circle"] as const) {
      for (let sample = 0; sample < 12; sample++) {
        const denominator = int(next, 2, 8)
        const shaded = int(next, 0, denominator)
        const measure = (["value", "shaded_count", "unshaded_count"] as const)[int(next, 0, 2)] ?? "value"
        const figure: FigureSpec = {
          type: "fraction",
          denominator,
          shaded,
          measure,
          form
        }
        const svg = renderFigureSvg(figure)
        const painted = form === "circle"
          ? svg.match(/<path [^>]*fill="#111827"/g)?.length ?? 0
          : svg.match(/<rect [^>]*fill="#111827"/g)?.length ?? 0
        expect(painted).toBe(shaded)
        const answer = measure === "shaded_count"
          ? String(shaded)
          : measure === "unshaded_count"
          ? String(denominator - shaded)
          : fractionText(shaded, denominator)
        expectAnswerAgrees(figure, answer)
      }
    }
  })

  test("random clocks draw the structured time", () => {
    const next = mulberry32(33)
    for (let sample = 0; sample < 20; sample++) {
      const hour = int(next, 1, 12)
      const minute = int(next, 0, 59)
      const figure: FigureSpec = { type: "clock", hour, minute, measure: "time" }
      const svg = renderFigureSvg(figure)
      expect(drawnClockTime(svg)).toEqual({ hour, minute })
      expectAnswerAgrees(figure, `${hour}:${String(minute).padStart(2, "0")}`)
    }
  })

  test("random bar charts agree with the measured bar", () => {
    const next = mulberry32(44)
    for (let sample = 0; sample < 16; sample++) {
      const count = int(next, 1, 4)
      const bars = Array.from({ length: count }, (_, index) => ({
        name: `B${index + 1}`,
        value: int(next, 0, 9)
      }))
      const figure: FigureSpec = {
        type: "bar_chart",
        bars,
        measure: { kind: "value", index: 0 }
      }
      const svg = renderFigureSvg(figure)
      const max = Math.max(...bars.map((bar) => bar.value), 0)
      const heights = [...svg.matchAll(/height="(\d+)" fill="#111827"/g)].map((match) => Number(match[1]))
      const expected = bars.map((bar) => max === 0 ? 0 : Math.round((bar.value / max) * 120))
      expect(heights).toEqual(expected)
      const first = bars[0]
      expect(first).toBeDefined()
      expectAnswerAgrees(figure, String(first?.value))
    }
  })

  test("random circles, squares, rectangles, triangles, and trapezoids agree", () => {
    const next = mulberry32(55)
    for (let sample = 0; sample < 8; sample++) {
      const radius = int(next, 1, 7)
      const circle: FigureSpec = { type: "circle", radius, measure: { kind: "area" } }
      expect(renderFigureSvg(circle)).toContain(`r="${radius * 8}"`)
      const area = radius * radius
      expectAnswerAgrees(circle, area === 1 ? "π" : `${area}π`)

      const side = int(next, 1, 12)
      const square: FigureSpec = { type: "square", side, measure: "area" }
      expect(renderFigureSvg(square)).toContain(`width="${side * 8}" height="${side * 8}"`)
      expectAnswerAgrees(square, String(side * side))

      const width = int(next, 1, 10)
      const height = int(next, 1, 10)
      const rectangle: FigureSpec = { type: "rectangle", width, height, measure: "area" }
      expect(renderFigureSvg(rectangle)).toContain(`width="${width * 8}" height="${height * 8}"`)
      expectAnswerAgrees(rectangle, String(width * height))

      const base = int(next, 2, 10)
      const triangleHeight = int(next, 2, 8)
      const triangle: FigureSpec = { type: "triangle", base, height: triangleHeight, measure: "area" }
      const triangleSvg = renderFigureSvg(triangle)
      expect(triangleSvg).toContain(`points="`)
      expect(triangleSvg).not.toContain("data-figure-error")
      expectAnswerAgrees(triangle, fractionText(base * triangleHeight, 2))

      const top = int(next, 2, 8)
      const bottom = int(next, top, 12)
      const trapHeight = int(next, 2, 8)
      const trapezoid: FigureSpec = {
        type: "trapezoid",
        topBase: top,
        bottomBase: bottom,
        height: trapHeight,
        measure: "area"
      }
      expect(renderFigureSvg(trapezoid)).not.toContain("data-figure-error")
      expectAnswerAgrees(trapezoid, fractionText((top + bottom) * trapHeight, 2))
    }
  })

  test("random coordinate points agree with the plotted answer", () => {
    const next = mulberry32(66)
    for (let sample = 0; sample < 12; sample++) {
      const x = int(next, -2, 3)
      const y = int(next, -1, 4)
      const figure: FigureSpec = {
        type: "coordinate_plane",
        xMin: -3,
        xMax: 4,
        yMin: -2,
        yMax: 5,
        points: [{ x, y, label: "A" }],
        measure: { kind: "coordinates", index: 0 }
      }
      const svg = renderFigureSvg(figure)
      const cx = scaleX(x, -3, 4)
      const cy = Math.round(136 - ((y - -2) / (5 - -2)) * 120)
      expect(svg).toContain(`<circle cx="${cx}" cy="${cy}" r="4"`)
      expectAnswerAgrees(figure, `(${x}, ${y})`)
    }
  })
})
