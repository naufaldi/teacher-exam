import { Either, Schema } from "effect"
import { describe, expect, test } from "vitest"
import { checkClockDrawing, checkFigureAnswer, drawnClockTime, renderFigureSvg } from "../diagram.js"
import { type FigureSpec, FigureSpecSchema } from "../schemas/figures.js"

const decode = Schema.decodeUnknownEither(FigureSpecSchema)

function mcq(
  figure: FigureSpec,
  correct: "a" | "b" | "c" | "d",
  options: { a: string; b: string; c: string; d: string }
) {
  return {
    _tag: "mcq_single" as const,
    figure,
    correct,
    options
  }
}

describe("FigureSpecSchema diagrams", () => {
  test("decodes a stored circle that has no measure", () => {
    const result = decode({ type: "circle", radius: 7, label: "r = 7 cm" })
    expect(result).toEqual(Either.right({ type: "circle", radius: 7, label: "r = 7 cm" }))
  })

  test("rejects a fraction whose shaded cells exceed the denominator", () => {
    const result = decode({
      type: "fraction",
      denominator: 4,
      shaded: 5,
      measure: "value"
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  test("rejects a number line whose min is not below max", () => {
    const result = decode({
      type: "number_line",
      min: 10,
      max: 0,
      step: 2,
      marks: [{ value: 4 }],
      measure: { kind: "value", index: 0 }
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("renderFigureSvg", () => {
  test("scales a circle from its radius", () => {
    const small = renderFigureSvg({ type: "circle", radius: 3 })
    const large = renderFigureSvg({ type: "circle", radius: 7 })
    expect(small).toContain("<circle cx=\"126\" cy=\"76\" r=\"24\"")
    expect(large).toContain("<circle cx=\"126\" cy=\"76\" r=\"56\"")
  })

  test("scales a rectangle from width and height", () => {
    const wide = renderFigureSvg({ type: "rectangle", width: 12, height: 5 })
    const tall = renderFigureSvg({ type: "rectangle", width: 5, height: 12 })
    expect(wide).toContain("width=\"96\" height=\"40\"")
    expect(tall).toContain("width=\"40\" height=\"96\"")
  })

  test("draws a triangle from base and height", () => {
    const svg = renderFigureSvg({ type: "triangle", base: 10, height: 6 })
    expect(svg).toContain("points=\"126,52 86,100 166,100\"")
  })

  test("places a coordinate point from the declared window", () => {
    const svg = renderFigureSvg({
      type: "coordinate_plane",
      xMin: -2,
      xMax: 4,
      yMin: -1,
      yMax: 5,
      points: [{ x: 1, y: 2, label: "A" }]
    })
    expect(svg).toContain("<circle cx=\"126\" cy=\"76\" r=\"4\"")
  })

  test("draws an error frame for a reversed axis and no point", () => {
    const svg = renderFigureSvg({
      type: "coordinate_plane",
      xMin: 5,
      xMax: 1,
      yMin: 0,
      yMax: 4,
      points: [{ x: 2, y: 2 }]
    })
    expect(svg).toContain("data-figure-error=\"1\"")
    expect(svg).not.toContain("<circle")
  })

  test("draws a number line mark at the scaled value", () => {
    const svg = renderFigureSvg({
      type: "number_line",
      min: 0,
      max: 10,
      step: 2,
      marks: [{ value: 5 }],
      measure: { kind: "value", index: 0 }
    })
    expect(svg).toContain("<circle cx=\"126\" cy=\"96\" r=\"5\"")
  })

  test("draws a fraction circle with one shaded slice", () => {
    const svg = renderFigureSvg({
      type: "fraction",
      denominator: 4,
      shaded: 1,
      measure: "value",
      form: "circle"
    })
    expect(svg.match(/<path /g)?.length).toBe(4)
    expect(svg.match(/fill="#111827"/g)?.length).toBe(1)
    expect(svg).not.toContain("<rect")
  })

  test("fills the first shaded fraction cells", () => {
    const svg = renderFigureSvg({
      type: "fraction",
      denominator: 4,
      shaded: 3,
      measure: "value"
    })
    expect(svg.match(/fill="#111827"/g)?.length).toBe(3)
    expect(svg.match(/fill="#ffffff"/g)?.length).toBe(1)
    expect(svg).not.toContain("3/4")
  })

  test("a 07:30 clock answer matches the drawn hands", () => {
    const figure: FigureSpec = {
      type: "clock",
      hour: 7,
      minute: 30,
      measure: "time"
    }
    const svg = renderFigureSvg(figure)
    expect(drawnClockTime(svg)).toEqual({ hour: 7, minute: 30 })
    expect(svg).not.toContain(">1<")
    const result = checkFigureAnswer(mcq(figure, "d", {
      a: "7.00",
      b: "3:30",
      c: "8:30",
      d: "07.30"
    }))
    expect(result).toEqual({ _tag: "Match", derived: "7:30" })
  })

  test("a face that only contains a digit fails the clock check", () => {
    const face = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">`,
      `<circle cx="126" cy="76" r="48" fill="none" stroke="#111827" stroke-width="2"/>`,
      `<text x="126" y="82" text-anchor="middle">1</text>`,
      `</svg>`
    ].join("")
    expect(checkClockDrawing(face, "07.30")).toEqual({
      _tag: "Mismatch",
      derived: "no hands",
      keyedText: "07.30"
    })
  })

  test("points clock hands at 3:00", () => {
    const svg = renderFigureSvg({
      type: "clock",
      hour: 3,
      minute: 0,
      measure: "time"
    })
    expect(svg).toContain("<line x1=\"126\" y1=\"76\" x2=\"152\" y2=\"76\"")
    expect(svg).toContain("<line x1=\"126\" y1=\"76\" x2=\"126\" y2=\"36\"")
    expect(svg).not.toContain("3:00")
  })

  test("scales bar heights from the values", () => {
    const svg = renderFigureSvg({
      type: "bar_chart",
      bars: [
        { name: "A", value: 2 },
        { name: "B", value: 5 },
        { name: "C", value: 3 }
      ],
      measure: { kind: "sum" }
    })
    expect(svg).toContain("height=\"48\"")
    expect(svg).toContain("height=\"120\"")
    expect(svg).toContain("height=\"72\"")
  })

  test("escapes a safe label and keeps the radius text", () => {
    const svg = renderFigureSvg({
      type: "circle",
      radius: 7,
      label: "r < 7 & cm",
      measure: { kind: "area" }
    })
    expect(svg).toContain("r &lt; 7 &amp; cm")
    expect(svg).not.toContain("r < 7 & cm")
  })

  test("drops a label that states a number the fields do not contain", () => {
    const svg = renderFigureSvg({
      type: "circle",
      radius: 7,
      label: "luas 154",
      measure: { kind: "area" }
    })
    expect(svg).not.toContain("154")
    expect(svg).toContain("r = 7")
    expect(svg).not.toContain("49")
  })
})

describe("checkFigureAnswer", () => {
  test("matches circle area as 49π and rejects 154", () => {
    const figure: FigureSpec = {
      type: "circle",
      radius: 7,
      label: "luas 100",
      measure: { kind: "area" }
    }
    const match = checkFigureAnswer(mcq(figure, "a", {
      a: "49π",
      b: "14",
      c: "7",
      d: "21"
    }))
    const miss = checkFigureAnswer(mcq(figure, "a", {
      a: "154",
      b: "14",
      c: "7",
      d: "21"
    }))
    expect(match).toEqual({ _tag: "Match", derived: "49π" })
    expect(miss).toEqual({ _tag: "Mismatch", derived: "49π", keyedText: "154" })
  })

  test("matches 154 only when the circle declares pi 22/7", () => {
    const figure: FigureSpec = {
      type: "circle",
      radius: 7,
      measure: { kind: "area", pi: "22/7" }
    }
    const result = checkFigureAnswer(mcq(figure, "b", {
      a: "49π",
      b: "154",
      c: "44",
      d: "7"
    }))
    expect(result).toEqual({ _tag: "Match", derived: "154" })
  })

  test("leaves a legacy circle with no measure unchecked", () => {
    const result = checkFigureAnswer(mcq(
      { type: "circle", radius: 7, label: "r = 7 cm" },
      "a",
      { a: "49π", b: "14", c: "7", d: "154" }
    ))
    expect(result).toEqual({ _tag: "Unchecked" })
  })

  test("rejects a distractor that repeats the derived value", () => {
    const result = checkFigureAnswer(mcq(
      { type: "circle", radius: 7, measure: { kind: "area" } },
      "a",
      { a: "49π", b: "49π", c: "14", d: "7" }
    ))
    expect(result).toEqual({ _tag: "Mismatch", derived: "49π", keyedText: "49π" })
  })

  test("matches a number-line mark, a fraction, a clock, and a bar sum", () => {
    const line = checkFigureAnswer(mcq(
      {
        type: "number_line",
        min: 0,
        max: 10,
        step: 2,
        marks: [{ value: 5 }],
        measure: { kind: "value", index: 0 }
      },
      "c",
      { a: "2", b: "4", c: "5", d: "10" }
    ))
    const fraction = checkFigureAnswer(mcq(
      {
        type: "fraction",
        denominator: 4,
        shaded: 3,
        measure: "value"
      },
      "a",
      { a: "3/4", b: "1/4", c: "3", d: "4" }
    ))
    const clock = checkFigureAnswer(mcq(
      {
        type: "clock",
        hour: 7,
        minute: 30,
        measure: "time"
      },
      "d",
      { a: "7.00", b: "3:30", c: "8:30", d: "07.30" }
    ))
    const bars = checkFigureAnswer(mcq(
      {
        type: "bar_chart",
        bars: [
          { name: "A", value: 2 },
          { name: "B", value: 5 },
          { name: "C", value: 3 }
        ],
        measure: { kind: "sum" }
      },
      "b",
      { a: "5", b: "10", c: "3", d: "2" }
    ))
    expect(line).toEqual({ _tag: "Match", derived: "5" })
    expect(fraction).toEqual({ _tag: "Match", derived: "3/4" })
    expect(clock).toEqual({ _tag: "Match", derived: "7:30" })
    expect(bars).toEqual({ _tag: "Match", derived: "10" })
  })

  test("reports an unordered plane as not orderable", () => {
    const result = checkFigureAnswer(mcq(
      {
        type: "coordinate_plane",
        xMin: 5,
        xMax: 1,
        yMin: 0,
        yMax: 4,
        points: [{ x: 2, y: 2, label: "A" }],
        measure: { kind: "coordinates", index: 0 }
      },
      "a",
      { a: "(2, 2)", b: "(0, 0)", c: "(1, 1)", d: "(5, 1)" }
    ))
    expect(result).toEqual({ _tag: "NotOrderable" })
  })
})

describe("diagram snapshots", () => {
  test("circle", () => {
    expect(renderFigureSvg({ type: "circle", radius: 7, measure: { kind: "area" } })).toMatchSnapshot()
  })

  test("number line", () => {
    expect(renderFigureSvg({
      type: "number_line",
      min: 0,
      max: 10,
      step: 2,
      marks: [{ value: 4 }],
      measure: { kind: "value", index: 0 }
    })).toMatchSnapshot()
  })

  test("fraction bar", () => {
    expect(renderFigureSvg({
      type: "fraction",
      denominator: 4,
      shaded: 3,
      measure: "value",
      form: "bar"
    })).toMatchSnapshot()
  })

  test("fraction circle", () => {
    expect(renderFigureSvg({
      type: "fraction",
      denominator: 4,
      shaded: 1,
      measure: "value",
      form: "circle"
    })).toMatchSnapshot()
  })

  test("clock", () => {
    expect(renderFigureSvg({ type: "clock", hour: 3, minute: 0, measure: "time" })).toMatchSnapshot()
  })

  test("bar chart", () => {
    expect(renderFigureSvg({
      type: "bar_chart",
      bars: [
        { name: "A", value: 2 },
        { name: "B", value: 5 }
      ],
      measure: { kind: "sum" }
    })).toMatchSnapshot()
  })
})
