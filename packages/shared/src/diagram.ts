import { Either, Match, Option, pipe, Schema } from "effect"

const WIDTH = 240
const HEIGHT = 160
const LEFT = 36
const RIGHT = 216
const TOP = 16
const BOTTOM = 136
const INNER_W = RIGHT - LEFT
const INNER_H = BOTTOM - TOP
const CX = (LEFT + RIGHT) / 2
const CY = (TOP + BOTTOM) / 2
// 8 px per unit keeps radius 3 and radius 7 distinct inside the 120 px plot.
const UNIT = 8
const LINE_Y = 96
const HOUR_HAND = 26
const MINUTE_HAND = 40

type Exact = {
  readonly num: bigint
  readonly den: bigint
  readonly pi: 0 | 1
}

type Derived =
  | { readonly _tag: "Unchecked" }
  | { readonly _tag: "NotOrderable" }
  | { readonly _tag: "Inexact" }
  | { readonly _tag: "Quantity"; readonly value: Exact }
  | { readonly _tag: "Time"; readonly hour: number; readonly minute: number }
  | { readonly _tag: "Coordinates"; readonly x: Exact; readonly y: Exact }

function inexact(): Derived {
  return { _tag: "Inexact" }
}

export type FigureCheck =
  | { readonly _tag: "Unchecked" }
  | { readonly _tag: "Match"; readonly derived: string }
  | { readonly _tag: "Mismatch"; readonly derived: string; readonly keyedText: string }
  | { readonly _tag: "Unparsed"; readonly text: string }
  | { readonly _tag: "Inexact" }
  | { readonly _tag: "NotOrderable" }

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    const next = x % y
    x = y
    y = next
  }
  return x
}

function reduce(num: bigint, den: bigint, pi: 0 | 1): Exact {
  if (den < 0n) {
    return reduce(-num, -den, pi)
  }
  const divisor = gcd(num, den)
  return { num: num / divisor, den: den / divisor, pi }
}

function toExact(value: number): Option.Option<Exact> {
  if (!Number.isFinite(value)) return Option.none()
  const text = Object.is(value, -0) ? "0" : String(value)
  if (text.includes("e") || text.includes("E")) return Option.none()
  const negative = text.startsWith("-")
  const body = negative ? text.slice(1) : text
  const parts = body.split(".")
  const whole = parts[0]
  const frac = parts[1] ?? ""
  if (whole === undefined || !/^\d+$/.test(whole)) return Option.none()
  if (frac.length > 4 || (frac !== "" && !/^\d+$/.test(frac))) return Option.none()
  const digits = `${negative ? "-" : ""}${whole}${frac}`
  return Option.some(reduce(BigInt(digits), 10n ** BigInt(frac.length), 0))
}

function fromInt(value: number): Exact {
  return reduce(BigInt(value), 1n, 0)
}

function mul(left: Exact, right: Exact): Option.Option<Exact> {
  if (left.pi + right.pi > 1) return Option.none()
  const pi = (left.pi + right.pi) as 0 | 1
  return Option.some(reduce(left.num * right.num, left.den * right.den, pi))
}

function add(left: Exact, right: Exact): Option.Option<Exact> {
  if (left.pi !== right.pi) return Option.none()
  return Option.some(reduce(left.num * right.den + right.num * left.den, left.den * right.den, left.pi))
}

function div(left: Exact, right: Exact): Option.Option<Exact> {
  if (right.num === 0n || right.pi !== 0) return Option.none()
  return Option.some(reduce(left.num * right.den, left.den * right.num, left.pi))
}

function exactEqual(left: Exact, right: Exact): boolean {
  return left.num === right.num && left.den === right.den && left.pi === right.pi
}

function compare(left: Exact, right: Exact): number {
  const delta = left.num * right.den - right.num * left.den
  if (delta < 0n) return -1
  if (delta > 0n) return 1
  return 0
}

function formatExact(value: Exact): string {
  const core = value.den === 1n ? String(value.num) : `${value.num}/${value.den}`
  if (value.pi === 0) return core
  if (value.num === 1n && value.den === 1n) return "π"
  if (value.den === 1n) return `${value.num}π`
  return `(${core})π`
}

const PositiveNumber = Schema.Number.pipe(
  Schema.filter((n) => Number.isFinite(n) && n > 0, { message: () => "dimension must be positive" })
)

const ExactNumber = Schema.Number.pipe(
  Schema.filter((n) => Option.isSome(toExact(n)), { message: () => "number must be an exact decimal" })
)

const PositiveExact = ExactNumber.pipe(
  Schema.filter((n) => n > 0, { message: () => "dimension must be positive" })
)

const NonNegativeInt = Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))

const OptionalLabel = Schema.optional(Schema.String.pipe(Schema.minLength(1)))

const PiConventionSchema = Schema.Literal("symbol", "22/7")

const CircleMeasureSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("radius") }),
  Schema.Struct({ kind: Schema.Literal("diameter") }),
  Schema.Struct({
    kind: Schema.Literal("circumference", "area"),
    pi: Schema.optional(PiConventionSchema)
  })
)

export const FigurePointSchema = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  label: OptionalLabel
})
export type FigurePoint = typeof FigurePointSchema.Type

export const CircleFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("circle"),
  radius: PositiveNumber,
  label: OptionalLabel,
  measure: Schema.optional(CircleMeasureSchema)
})

export const SquareFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("square"),
  side: PositiveNumber,
  label: OptionalLabel,
  measure: Schema.optional(Schema.Literal("side", "perimeter", "area"))
})

export const RectangleFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("rectangle"),
  width: PositiveNumber,
  height: PositiveNumber,
  label: OptionalLabel,
  measure: Schema.optional(Schema.Literal("width", "height", "perimeter", "area"))
})

export const TriangleFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("triangle"),
  base: PositiveNumber,
  height: PositiveNumber,
  label: OptionalLabel,
  measure: Schema.optional(Schema.Literal("base", "height", "area"))
})

export const TrapezoidFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("trapezoid"),
  topBase: PositiveNumber,
  bottomBase: PositiveNumber,
  height: PositiveNumber,
  label: OptionalLabel,
  measure: Schema.optional(Schema.Literal("topBase", "bottomBase", "height", "area"))
})

const PlaneMeasureSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("coordinates"), index: NonNegativeInt }),
  Schema.Struct({
    kind: Schema.Literal("distance"),
    from: NonNegativeInt,
    to: NonNegativeInt
  })
)

export const CoordinatePlaneFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("coordinate_plane"),
  xMin: Schema.Number,
  xMax: Schema.Number,
  yMin: Schema.Number,
  yMax: Schema.Number,
  points: Schema.Array(FigurePointSchema),
  label: OptionalLabel,
  measure: Schema.optional(PlaneMeasureSchema)
}).pipe(Schema.filter((spec) => {
  if (spec.measure === undefined) return true
  if (spec.measure.kind === "coordinates") return spec.measure.index < spec.points.length
  return spec.measure.from < spec.points.length &&
    spec.measure.to < spec.points.length &&
    spec.measure.from !== spec.measure.to
}, { message: () => "coordinate measure is outside the points" }))

const NumberLineMarkSchema = Schema.Struct({
  value: ExactNumber,
  label: OptionalLabel
})

const NumberLineMeasureSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("value"), index: NonNegativeInt }),
  Schema.Struct({ kind: Schema.Literal("span") }),
  Schema.Struct({ kind: Schema.Literal("step") }),
  Schema.Struct({ kind: Schema.Literal("count") })
)

export const NumberLineFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("number_line"),
  min: ExactNumber,
  max: ExactNumber,
  step: PositiveExact,
  marks: Schema.Array(NumberLineMarkSchema).pipe(Schema.minItems(1), Schema.maxItems(12)),
  measure: NumberLineMeasureSchema,
  label: OptionalLabel
}).pipe(Schema.filter((spec) => {
  const min = toExact(spec.min)
  const max = toExact(spec.max)
  const step = toExact(spec.step)
  if (Option.isNone(min) || Option.isNone(max) || Option.isNone(step)) return false
  if (compare(max.value, min.value) <= 0) return false
  const span = add(max.value, { ...min.value, num: -min.value.num })
  if (Option.isNone(span)) return false
  const steps = div(span.value, step.value)
  if (Option.isNone(steps) || steps.value.den !== 1n || steps.value.num < 1n || steps.value.num > 20n) {
    return false
  }
  const marksFit = spec.marks.every((mark) => {
    const value = toExact(mark.value)
    if (Option.isNone(value)) return false
    return compare(value.value, min.value) >= 0 && compare(value.value, max.value) <= 0
  })
  if (!marksFit) return false
  if (spec.measure.kind === "value") return spec.measure.index < spec.marks.length
  return true
}, { message: () => "number line is not drawable" }))

export const FractionFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("fraction"),
  denominator: Schema.Int.pipe(Schema.between(2, 12)),
  shaded: Schema.Int.pipe(Schema.between(0, 12)),
  measure: Schema.Literal("shaded_count", "unshaded_count", "value"),
  form: Schema.optional(Schema.Literal("bar", "circle")),
  label: OptionalLabel
}).pipe(Schema.filter((spec) => spec.shaded <= spec.denominator, {
  message: () => "shaded cells exceed the denominator"
}))

export const ClockFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("clock"),
  hour: Schema.Int.pipe(Schema.between(1, 12)),
  minute: Schema.Int.pipe(Schema.between(0, 59)),
  measure: Schema.Literal("time", "hour_angle", "minute_angle"),
  label: OptionalLabel
})

const BarSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(24)),
  value: ExactNumber.pipe(Schema.filter((n) => n >= 0, { message: () => "bar value must be non-negative" }))
})

const BarMeasureSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("value"), index: NonNegativeInt }),
  Schema.Struct({ kind: Schema.Literal("sum") }),
  Schema.Struct({ kind: Schema.Literal("max") }),
  Schema.Struct({
    kind: Schema.Literal("difference"),
    from: NonNegativeInt,
    to: NonNegativeInt
  })
)

export const BarChartFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("bar_chart"),
  bars: Schema.Array(BarSchema).pipe(Schema.minItems(1), Schema.maxItems(6)),
  measure: BarMeasureSchema,
  label: OptionalLabel
}).pipe(Schema.filter((spec) => {
  const names = spec.bars.map((bar) => bar.name)
  if (new Set(names).size !== names.length) return false
  if (spec.measure.kind === "value") return spec.measure.index < spec.bars.length
  if (spec.measure.kind === "difference") {
    return spec.measure.from < spec.bars.length && spec.measure.to < spec.bars.length
  }
  return true
}, { message: () => "bar chart measure is outside the bars" }))

export const FigureSpecSchema = Schema.Union(
  CircleFigureSpecSchema,
  SquareFigureSpecSchema,
  RectangleFigureSpecSchema,
  TriangleFigureSpecSchema,
  TrapezoidFigureSpecSchema,
  CoordinatePlaneFigureSpecSchema,
  NumberLineFigureSpecSchema,
  FractionFigureSpecSchema,
  ClockFigureSpecSchema,
  BarChartFigureSpecSchema
)
export type FigureSpec = typeof FigureSpecSchema.Type

export type DiagramQuestion =
  | {
    readonly _tag: "mcq_single"
    readonly figure?: FigureSpec | null | undefined
    readonly options: { readonly a: string; readonly b: string; readonly c: string; readonly d: string }
    readonly correct: "a" | "b" | "c" | "d"
  }
  | {
    readonly _tag: "mcq_multi"
    readonly figure?: FigureSpec | null | undefined
    readonly options: { readonly a: string; readonly b: string; readonly c: string; readonly d: string }
    readonly correct: ReadonlyArray<"a" | "b" | "c" | "d">
  }
  | {
    readonly _tag: "true_false"
    readonly figure?: FigureSpec | null | undefined
    readonly statements: ReadonlyArray<{ readonly text: string; readonly answer: boolean }>
  }

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
}

function text(x: number, y: number, label: string, anchor = "middle"): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="12" font-family="Plus Jakarta Sans, Arial, sans-serif" fill="#111827">${
    escapeSvgText(label)
  }</text>`
}

function frame(inner: string, label = "Diagram geometri", error = false): string {
  const marker = error ? " data-figure-error=\"1\"" : ""
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${label}"${marker}>${inner}</svg>`
}

function errorFrame(): string {
  return frame(text(120, 84, "Diagram tidak valid"), "Diagram tidak valid", true)
}

function fit(mathW: number, mathH: number): number {
  return Math.min(UNIT, INNER_W / mathW, INNER_H / mathH)
}

function scaleX(value: number, min: number, max: number): number {
  return Math.round(LEFT + ((value - min) / (max - min)) * INNER_W)
}

function scaleY(value: number, min: number, max: number): number {
  return Math.round(BOTTOM - ((value - min) / (max - min)) * INNER_H)
}

function numbersInText(value: string): ReadonlyArray<Exact> {
  const tokens = value.match(/\d+(?:[.,]\d+)?/g) ?? []
  const parsed: Array<Exact> = []
  for (const token of tokens) {
    const decimal = parseDecimal(token)
    if (decimal) parsed.push(decimal)
  }
  return parsed
}

function labelIsSafe(label: string, inputs: ReadonlyArray<Exact>): boolean {
  return numbersInText(label).every((found) => inputs.some((input) => exactEqual(found, input)))
}

function storedNumbers(spec: FigureSpec): ReadonlyArray<Exact> {
  const values = pipe(
    Match.type<FigureSpec>(),
    Match.discriminatorsExhaustive("type")({
      circle: (row) => [row.radius],
      square: (row) => [row.side],
      rectangle: (row) => [row.width, row.height],
      triangle: (row) => [row.base, row.height],
      trapezoid: (row) => [row.topBase, row.bottomBase, row.height],
      coordinate_plane: (row) => [
        row.xMin,
        row.xMax,
        row.yMin,
        row.yMax,
        ...row.points.flatMap((point) => [point.x, point.y])
      ],
      number_line: (row) => [row.min, row.max, row.step, ...row.marks.map((mark) => mark.value)],
      fraction: (row) => [row.denominator, row.shaded],
      clock: (row) => [row.hour, row.minute],
      bar_chart: (row) => row.bars.map((bar) => bar.value)
    })
  )(spec)
  const exact: Array<Exact> = []
  for (const value of values) {
    const parsed = toExact(value)
    if (Option.isSome(parsed)) exact.push(parsed.value)
  }
  return exact
}

function autoCaption(spec: FigureSpec): string | null {
  if (spec.type === "circle") {
    if (spec.measure?.kind === "radius") return null
    const radius = toExact(spec.radius)
    return Option.isSome(radius) ? `r = ${formatExact(radius.value)}` : null
  }
  if (spec.type === "square") {
    if (spec.measure === "side") return null
    const side = toExact(spec.side)
    return Option.isSome(side) ? `s = ${formatExact(side.value)}` : null
  }
  if (spec.type === "rectangle") {
    if (spec.measure === "width" || spec.measure === "height") return null
    return `${spec.width} × ${spec.height}`
  }
  if (spec.type === "triangle") {
    if (spec.measure === "base" || spec.measure === "height") return null
    return `a = ${spec.base}, t = ${spec.height}`
  }
  if (spec.type === "trapezoid") {
    if (spec.measure === "topBase" || spec.measure === "bottomBase" || spec.measure === "height") return null
    return `t = ${spec.height}`
  }
  return null
}

function caption(spec: FigureSpec): string | null {
  if (spec.label !== undefined && labelIsSafe(spec.label, storedNumbers(spec))) return spec.label
  return autoCaption(spec)
}

function drawCircle(spec: Extract<FigureSpec, { type: "circle" }>): string {
  const scale = fit(spec.radius * 2, spec.radius * 2)
  const radius = Math.round(spec.radius * scale)
  const cap = caption(spec)
  return frame([
    `<circle cx="${CX}" cy="${CY}" r="${radius}" fill="none" stroke="#111827" stroke-width="2"/>`,
    `<line x1="${CX}" y1="${CY}" x2="${CX + radius}" y2="${CY}" stroke="#111827" stroke-width="2"/>`,
    cap ? text(CX, 148, cap) : ""
  ].join(""))
}

function drawSquare(spec: Extract<FigureSpec, { type: "square" }>): string {
  const scale = fit(spec.side, spec.side)
  const side = Math.round(spec.side * scale)
  const cap = caption(spec)
  return frame([
    `<rect x="${Math.round(CX - side / 2)}" y="${
      Math.round(CY - side / 2)
    }" width="${side}" height="${side}" fill="none" stroke="#111827" stroke-width="2"/>`,
    cap ? text(CX, 148, cap) : ""
  ].join(""))
}

function drawRectangle(spec: Extract<FigureSpec, { type: "rectangle" }>): string {
  const scale = fit(spec.width, spec.height)
  const width = Math.round(spec.width * scale)
  const height = Math.round(spec.height * scale)
  const cap = caption(spec)
  return frame([
    `<rect x="${Math.round(CX - width / 2)}" y="${
      Math.round(CY - height / 2)
    }" width="${width}" height="${height}" fill="none" stroke="#111827" stroke-width="2"/>`,
    cap ? text(CX, 148, cap) : ""
  ].join(""))
}

function drawTriangle(spec: Extract<FigureSpec, { type: "triangle" }>): string {
  const scale = fit(spec.base, spec.height)
  const base = Math.round(spec.base * scale)
  const height = Math.round(spec.height * scale)
  const apexY = Math.round(CY - height / 2)
  const baseY = Math.round(CY + height / 2)
  const left = Math.round(CX - base / 2)
  const right = Math.round(CX + base / 2)
  const cap = caption(spec)
  return frame([
    `<polygon points="${CX},${apexY} ${left},${baseY} ${right},${baseY}" fill="none" stroke="#111827" stroke-width="2"/>`,
    cap ? text(CX, 152, cap) : ""
  ].join(""))
}

function drawTrapezoid(spec: Extract<FigureSpec, { type: "trapezoid" }>): string {
  const scale = fit(Math.max(spec.topBase, spec.bottomBase), spec.height)
  const top = Math.round(spec.topBase * scale)
  const bottom = Math.round(spec.bottomBase * scale)
  const height = Math.round(spec.height * scale)
  const topY = Math.round(CY - height / 2)
  const bottomY = Math.round(CY + height / 2)
  const cap = caption(spec)
  return frame([
    `<polygon points="${Math.round(CX - top / 2)},${topY} ${Math.round(CX + top / 2)},${topY} ${
      Math.round(CX + bottom / 2)
    },${bottomY} ${Math.round(CX - bottom / 2)},${bottomY}" fill="none" stroke="#111827" stroke-width="2"/>`,
    cap ? text(CX, 152, cap) : ""
  ].join(""))
}

function drawPlane(spec: Extract<FigureSpec, { type: "coordinate_plane" }>): string {
  if (!(spec.xMin < spec.xMax) || !(spec.yMin < spec.yMax)) return errorFrame()
  const xAxis = spec.yMin <= 0 && spec.yMax >= 0 ? scaleY(0, spec.yMin, spec.yMax) : BOTTOM
  const yAxis = spec.xMin <= 0 && spec.xMax >= 0 ? scaleX(0, spec.xMin, spec.xMax) : LEFT
  const points = spec.points.map((point) => {
    const x = scaleX(point.x, spec.xMin, spec.xMax)
    const y = scaleY(point.y, spec.yMin, spec.yMax)
    return [
      `<circle cx="${x}" cy="${y}" r="4" fill="#111827"/>`,
      point.label ? text(x + 8, y - 8, point.label, "start") : ""
    ].join("")
  }).join("")
  const cap = caption(spec)
  return frame([
    `<line x1="${LEFT}" y1="${xAxis}" x2="${RIGHT}" y2="${xAxis}" stroke="#111827" stroke-width="2"/>`,
    `<line x1="${yAxis}" y1="${TOP}" x2="${yAxis}" y2="${BOTTOM}" stroke="#111827" stroke-width="2"/>`,
    text(RIGHT, xAxis - 4, String(spec.xMax), "end"),
    text(LEFT, BOTTOM + 14, String(spec.xMin), "start"),
    points,
    cap ? text(CX, 154, cap) : ""
  ].join(""))
}

function drawNumberLine(spec: Extract<FigureSpec, { type: "number_line" }>): string {
  if (!(spec.min < spec.max) || !(spec.step > 0)) return errorFrame()
  const steps = Math.round((spec.max - spec.min) / spec.step)
  const ticks: Array<string> = []
  const tickX = new Set<number>()
  for (let index = 0; index <= steps; index++) {
    const value = spec.min + index * spec.step
    const x = scaleX(value, spec.min, spec.max)
    tickX.add(x)
    ticks.push(
      `<line x1="${x}" y1="${LINE_Y - 6}" x2="${x}" y2="${LINE_Y + 6}" stroke="#111827" stroke-width="1.5"/>`
    )
    ticks.push(text(x, LINE_Y + 20, formatQuantity(value)))
  }
  const marks = spec.marks.map((mark) => {
    const x = scaleX(mark.value, spec.min, spec.max)
    const labeled = tickX.has(x)
      ? ""
      : [
        `<line x1="${x}" y1="${LINE_Y - 6}" x2="${x}" y2="${LINE_Y + 6}" stroke="#111827" stroke-width="1.5"/>`,
        text(x, LINE_Y + 20, formatQuantity(mark.value))
      ].join("")
    return `${labeled}<circle cx="${x}" cy="${LINE_Y}" r="5" fill="#111827"/>`
  }).join("")
  return frame([
    `<line x1="${LEFT}" y1="${LINE_Y}" x2="${RIGHT}" y2="${LINE_Y}" stroke="#111827" stroke-width="2"/>`,
    ...ticks,
    marks
  ].join(""))
}

function formatQuantity(value: number): string {
  const exact = toExact(value)
  return Option.isSome(exact) ? formatExact(exact.value) : String(value)
}

function drawFraction(spec: Extract<FigureSpec, { type: "fraction" }>): string {
  if (spec.form === "circle") return drawFractionCircle(spec)
  const cell = Math.floor(INNER_W / spec.denominator)
  const cells: Array<string> = []
  for (let index = 0; index < spec.denominator; index++) {
    const fill = index < spec.shaded ? "#111827" : "#ffffff"
    cells.push(
      `<rect x="${LEFT + index * cell}" y="${
        CY - 24
      }" width="${cell}" height="48" fill="${fill}" stroke="#111827" stroke-width="2"/>`
    )
  }
  return frame(cells.join(""))
}

function drawFractionCircle(spec: Extract<FigureSpec, { type: "fraction" }>): string {
  const radius = 48
  const slices: Array<string> = []
  for (let index = 0; index < spec.denominator; index++) {
    const start = (index / spec.denominator) * Math.PI * 2 - Math.PI / 2
    const end = ((index + 1) / spec.denominator) * Math.PI * 2 - Math.PI / 2
    const x1 = Math.round(CX + Math.cos(start) * radius)
    const y1 = Math.round(CY + Math.sin(start) * radius)
    const x2 = Math.round(CX + Math.cos(end) * radius)
    const y2 = Math.round(CY + Math.sin(end) * radius)
    const large = end - start > Math.PI ? 1 : 0
    const fill = index < spec.shaded ? "#111827" : "#ffffff"
    slices.push(
      `<path d="M ${CX} ${CY} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z" fill="${fill}" stroke="#111827" stroke-width="2"/>`
    )
  }
  return frame(slices.join(""))
}

function hand(degreesFrom12: number, length: number, width: number): string {
  const radians = (degreesFrom12 * Math.PI) / 180
  const x = Math.round(CX + Math.sin(radians) * length)
  const y = Math.round(CY - Math.cos(radians) * length)
  return `<line x1="${CX}" y1="${CY}" x2="${x}" y2="${y}" stroke="#111827" stroke-width="${width}" stroke-linecap="round"/>`
}

function clockTicks(): string {
  const ticks: Array<string> = []
  for (let index = 0; index < 12; index++) {
    const radians = (index * 30 * Math.PI) / 180
    const inner = index % 3 === 0 ? 38 : 43
    const x1 = Math.round(CX + Math.sin(radians) * inner)
    const y1 = Math.round(CY - Math.cos(radians) * inner)
    const x2 = Math.round(CX + Math.sin(radians) * 48)
    const y2 = Math.round(CY - Math.cos(radians) * 48)
    ticks.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111827" stroke-width="2"/>`
    )
  }
  return ticks.join("")
}

function hourWedge(degreesFrom12: number, length: number): string {
  const radians = (degreesFrom12 * Math.PI) / 180
  const tipX = CX + Math.sin(radians) * length
  const tipY = CY - Math.cos(radians) * length
  const back = 4
  const width = 5
  const baseX = CX - Math.sin(radians) * back
  const baseY = CY + Math.cos(radians) * back
  const px = Math.cos(radians) * width
  const py = Math.sin(radians) * width
  return `<polygon points="${Math.round(tipX)},${Math.round(tipY)} ${Math.round(baseX + px)},${
    Math.round(baseY + py)
  } ${Math.round(baseX - px)},${Math.round(baseY - py)}" fill="#111827"/>`
}

function drawClock(spec: Extract<FigureSpec, { type: "clock" }>): string {
  const minuteAngle = spec.minute * 6
  const hourAngle = (spec.hour % 12) * 30 + spec.minute * 0.5
  return frame([
    `<circle cx="${CX}" cy="${CY}" r="48" fill="#ffffff" stroke="#111827" stroke-width="2"/>`,
    clockTicks(),
    hand(hourAngle, HOUR_HAND, 6),
    hourWedge(hourAngle, HOUR_HAND),
    hand(minuteAngle, MINUTE_HAND, 2),
    `<circle cx="${CX}" cy="${CY}" r="4" fill="#111827"/>`
  ].join(""))
}

function drawBars(spec: Extract<FigureSpec, { type: "bar_chart" }>): string {
  const max = Math.max(...spec.bars.map((bar) => bar.value), 0)
  const gap = 8
  const barW = Math.floor((INNER_W - gap * (spec.bars.length + 1)) / spec.bars.length)
  const bars = spec.bars.map((bar, index) => {
    const height = max === 0 ? 0 : Math.round((bar.value / max) * INNER_H)
    const x = LEFT + gap + index * (barW + gap)
    const y = BOTTOM - height
    return [
      `<rect x="${x}" y="${y}" width="${barW}" height="${height}" fill="#111827"/>`,
      text(x + barW / 2, BOTTOM + 16, bar.name)
    ].join("")
  }).join("")
  return frame([
    `<line x1="${LEFT}" y1="${TOP}" x2="${LEFT}" y2="${BOTTOM}" stroke="#111827" stroke-width="2"/>`,
    `<line x1="${LEFT}" y1="${BOTTOM}" x2="${RIGHT}" y2="${BOTTOM}" stroke="#111827" stroke-width="2"/>`,
    text(LEFT - 4, BOTTOM, "0", "end"),
    text(LEFT - 4, TOP + 4, formatQuantity(max), "end"),
    bars
  ].join(""))
}

const draw = pipe(
  Match.type<FigureSpec>(),
  Match.discriminatorsExhaustive("type")({
    circle: (spec) => drawCircle(spec),
    square: (spec) => drawSquare(spec),
    rectangle: (spec) => drawRectangle(spec),
    triangle: (spec) => drawTriangle(spec),
    trapezoid: (spec) => drawTrapezoid(spec),
    coordinate_plane: (spec) => drawPlane(spec),
    number_line: (spec) => drawNumberLine(spec),
    fraction: (spec) => drawFraction(spec),
    clock: (spec) => drawClock(spec),
    bar_chart: (spec) => drawBars(spec)
  })
)

export function renderFigureSvg(spec: FigureSpec): string {
  return draw(spec)
}

function quantity(value: Option.Option<Exact>): Derived {
  if (Option.isNone(value)) return inexact()
  return { _tag: "Quantity", value: value.value }
}

function piFactor(pi: "symbol" | "22/7" | undefined): Exact {
  if (pi === "22/7") return reduce(22n, 7n, 0)
  return reduce(1n, 1n, 1)
}

function circleDerived(
  measure: Extract<FigureSpec, { type: "circle" }>["measure"],
  radius: number
): Derived {
  if (measure === undefined) return { _tag: "Unchecked" }
  const r = toExact(radius)
  if (Option.isNone(r)) return inexact()
  if (measure.kind === "radius") return quantity(r)
  if (measure.kind === "diameter") return quantity(mul(fromInt(2), r.value))
  const rr = measure.kind === "area" ? mul(r.value, r.value) : mul(fromInt(2), r.value)
  if (Option.isNone(rr)) return inexact()
  return quantity(mul(piFactor(measure.pi), rr.value))
}

function fieldDerived(
  name: string | undefined,
  fields: Readonly<Record<string, number>>,
  area: Option.Option<Exact>
): Derived {
  if (name === undefined) return { _tag: "Unchecked" }
  if (name === "area") return quantity(area)
  const raw = fields[name]
  if (raw === undefined) return inexact()
  return quantity(toExact(raw))
}

function lengthProduct(left: number, right: number): Option.Option<Exact> {
  const a = toExact(left)
  const b = toExact(right)
  if (Option.isNone(a) || Option.isNone(b)) return Option.none()
  return mul(a.value, b.value)
}

function perfectSqrt(value: Exact): Option.Option<Exact> {
  if (value.pi !== 0 || value.num < 0n) return Option.none()
  const numRoot = intSqrt(value.num)
  const denRoot = intSqrt(value.den)
  if (numRoot === null || denRoot === null) return Option.none()
  return Option.some(reduce(numRoot, denRoot, 0))
}

function intSqrt(value: bigint): bigint | null {
  if (value < 0n) return null
  let root = 0n
  let bit = 1n << 62n
  while (bit > value) bit >>= 2n
  let rest = value
  while (bit !== 0n) {
    if (rest >= root + bit) {
      rest -= root + bit
      root = (root >> 1n) + bit
    } else {
      root >>= 1n
    }
    bit >>= 2n
  }
  return root * root === value ? root : null
}

function measureOf(spec: FigureSpec): Derived {
  return pipe(
    Match.type<FigureSpec>(),
    Match.discriminatorsExhaustive("type")({
      circle: (row) => circleDerived(row.measure, row.radius),
      square: (row) => {
        const area = lengthProduct(row.side, row.side)
        if (row.measure === "perimeter") {
          const side = toExact(row.side)
          return Option.isNone(side) ? inexact() : quantity(mul(fromInt(4), side.value))
        }
        return fieldDerived(row.measure, { side: row.side, area: row.side }, area)
      },
      rectangle: (row) => {
        const area = lengthProduct(row.width, row.height)
        if (row.measure === "perimeter") {
          const width = toExact(row.width)
          const height = toExact(row.height)
          if (Option.isNone(width) || Option.isNone(height)) return inexact()
          const sum = add(width.value, height.value)
          return Option.isNone(sum) ? inexact() : quantity(mul(fromInt(2), sum.value))
        }
        return fieldDerived(row.measure, { width: row.width, height: row.height }, area)
      },
      triangle: (row) => {
        const product = lengthProduct(row.base, row.height)
        const area = Option.isNone(product) ? Option.none() : div(product.value, fromInt(2))
        return fieldDerived(row.measure, { base: row.base, height: row.height }, area)
      },
      trapezoid: (row) => {
        const top = toExact(row.topBase)
        const bottom = toExact(row.bottomBase)
        const height = toExact(row.height)
        if (Option.isNone(top) || Option.isNone(bottom) || Option.isNone(height)) return inexact()
        const span = add(top.value, bottom.value)
        if (Option.isNone(span)) return inexact()
        const mid = div(span.value, fromInt(2))
        const area = Option.isNone(mid) ? Option.none() : mul(mid.value, height.value)
        return fieldDerived(
          row.measure,
          { topBase: row.topBase, bottomBase: row.bottomBase, height: row.height },
          area
        )
      },
      coordinate_plane: (row) => planeDerived(row),
      number_line: (row) => numberLineDerived(row),
      fraction: (row) => fractionDerived(row),
      clock: (row) => clockDerived(row),
      bar_chart: (row) => barDerived(row)
    })
  )(spec)
}

function planeDerived(spec: Extract<FigureSpec, { type: "coordinate_plane" }>): Derived {
  if (!(spec.xMin < spec.xMax) || !(spec.yMin < spec.yMax)) return { _tag: "NotOrderable" }
  if (spec.measure === undefined) return { _tag: "Unchecked" }
  if (spec.measure.kind === "coordinates") {
    const point = spec.points[spec.measure.index]
    if (point === undefined) return inexact()
    const x = toExact(point.x)
    const y = toExact(point.y)
    if (Option.isNone(x) || Option.isNone(y)) return inexact()
    return { _tag: "Coordinates", x: x.value, y: y.value }
  }
  const from = spec.points[spec.measure.from]
  const to = spec.points[spec.measure.to]
  if (from === undefined || to === undefined) return inexact()
  const dx = toExact(from.x - to.x)
  const dy = toExact(from.y - to.y)
  if (Option.isNone(dx) || Option.isNone(dy)) return inexact()
  const dx2 = mul(dx.value, dx.value)
  const dy2 = mul(dy.value, dy.value)
  if (Option.isNone(dx2) || Option.isNone(dy2)) return inexact()
  const sum = add(dx2.value, dy2.value)
  if (Option.isNone(sum)) return inexact()
  return quantity(perfectSqrt(sum.value))
}

function numberLineDerived(spec: Extract<FigureSpec, { type: "number_line" }>): Derived {
  if (!(spec.min < spec.max)) return { _tag: "NotOrderable" }
  if (spec.measure.kind === "value") {
    const mark = spec.marks[spec.measure.index]
    return mark === undefined ? inexact() : quantity(toExact(mark.value))
  }
  if (spec.measure.kind === "span") {
    const min = toExact(spec.min)
    const max = toExact(spec.max)
    if (Option.isNone(min) || Option.isNone(max)) return inexact()
    return quantity(add(max.value, { ...min.value, num: -min.value.num }))
  }
  if (spec.measure.kind === "step") return quantity(toExact(spec.step))
  return { _tag: "Quantity", value: fromInt(spec.marks.length) }
}

function fractionDerived(spec: Extract<FigureSpec, { type: "fraction" }>): Derived {
  if (spec.measure === "shaded_count") return { _tag: "Quantity", value: fromInt(spec.shaded) }
  if (spec.measure === "unshaded_count") {
    return { _tag: "Quantity", value: fromInt(spec.denominator - spec.shaded) }
  }
  return { _tag: "Quantity", value: reduce(BigInt(spec.shaded), BigInt(spec.denominator), 0) }
}

function clockDerived(spec: Extract<FigureSpec, { type: "clock" }>): Derived {
  if (spec.measure === "time") return { _tag: "Time", hour: spec.hour, minute: spec.minute }
  if (spec.measure === "minute_angle") return { _tag: "Quantity", value: fromInt(spec.minute * 6) }
  const hour = toExact((spec.hour % 12) * 30)
  const extra = div(fromInt(spec.minute), fromInt(2))
  if (Option.isNone(hour) || Option.isNone(extra)) return inexact()
  return quantity(add(hour.value, extra.value))
}

function barDerived(spec: Extract<FigureSpec, { type: "bar_chart" }>): Derived {
  const values = spec.bars.map((bar) => toExact(bar.value))
  if (values.some((value) => Option.isNone(value))) return inexact()
  const exact = values.flatMap((value) => Option.isSome(value) ? [value.value] : [])
  if (spec.measure.kind === "value") {
    const picked = exact[spec.measure.index]
    return picked === undefined ? inexact() : { _tag: "Quantity", value: picked }
  }
  if (spec.measure.kind === "max") {
    const top = exact.reduce((best, value) => compare(value, best) > 0 ? value : best, exact[0] ?? fromInt(0))
    return { _tag: "Quantity", value: top }
  }
  if (spec.measure.kind === "difference") {
    const from = exact[spec.measure.from]
    const to = exact[spec.measure.to]
    if (from === undefined || to === undefined) return inexact()
    return quantity(add(from, { ...to, num: -to.num }))
  }
  const sum = exact.reduce<Option.Option<Exact>>((total, value) => {
    if (Option.isNone(total)) return Option.none()
    return add(total.value, value)
  }, Option.some(fromInt(0)))
  return quantity(sum)
}

function formatDerived(derived: Extract<Derived, { _tag: "Quantity" | "Time" | "Coordinates" }>): string {
  if (derived._tag === "Quantity") return formatExact(derived.value)
  if (derived._tag === "Time") return `${derived.hour}:${String(derived.minute).padStart(2, "0")}`
  return `(${formatExact(derived.x)}, ${formatExact(derived.y)})`
}

function parseDecimal(token: string): Exact | null {
  let body = token.trim()
  let negative = false
  if (body.startsWith("-")) {
    negative = true
    body = body.slice(1)
  } else if (body.startsWith("+")) {
    body = body.slice(1)
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(body)) {
    const digits = body.replaceAll(".", "")
    return reduce(BigInt(`${negative ? "-" : ""}${digits}`), 1n, 0)
  }
  const separator = body.includes(",") ? "," : "."
  const parts = body.split(separator)
  const whole = parts[0]
  const frac = parts[1] ?? ""
  if (whole === undefined || !/^\d+$/.test(whole)) return null
  if (parts.length > 2 || (frac !== "" && !/^\d+$/.test(frac)) || frac.length > 4) return null
  const digits = `${negative ? "-" : ""}${whole}${frac}`
  return reduce(BigInt(digits), 10n ** BigInt(frac.length), 0)
}

function unwrapLatexFraction(raw: string): string {
  return raw
    .trim()
    .replaceAll("$", "")
    .replace(/\\+[dt]?frac\s*\{([+-]?\d+)\}\s*\{(\d+)\}/g, "$1/$2")
    .trim()
}

function parseQuantity(raw: string): Exact | null {
  const normalized = unwrapLatexFraction(raw)
    .replace(/\\pi/gi, "π")
    .replace(/\bpi\b/gi, "π")
    .replace(/\s*(cm²|cm2|m²|m2|cm|mm|kg|g|°|derajat)$/i, "")
    .trim()
  const fraction = normalized.match(/^([+-]?\d+)\s*\/\s*(\d+)$/)
  if (fraction?.[1] && fraction[2]) {
    if (fraction[2] === "0") return null
    return reduce(BigInt(fraction[1]), BigInt(fraction[2]), 0)
  }
  const withPi = normalized.match(/^([+-]?\d+(?:[.,]\d+)?)?\s*π$/)
  if (withPi) {
    const coefficient = withPi[1] ? parseDecimal(withPi[1]) : reduce(1n, 1n, 0)
    if (!coefficient) return null
    return { ...coefficient, pi: 1 }
  }
  const tokens = normalized.match(/\d+(?:[.,]\d+)?/g) ?? []
  if (tokens.length !== 1) return null
  if (!/^[-+]?\d+(?:[.,]\d+)?$/.test(normalized)) return null
  return parseDecimal(normalized)
}

function parseTime(raw: string): { hour: number; minute: number } | null {
  const match = raw.trim().match(/^(?:pukul\s+)?(\d{1,2})[:.](\d{2})$/i)
  if (!match?.[1] || !match[2]) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 1 || hour > 12 || minute > 59) return null
  return { hour, minute }
}

function parseCoordinates(raw: string): { x: Exact; y: Exact } | null {
  const match = raw.trim().match(/^\(?\s*([+-]?\d+(?:[.,]\d+)?)\s*,\s*([+-]?\d+(?:[.,]\d+)?)\s*\)?$/)
  if (!match?.[1] || !match[2]) return null
  const x = parseDecimal(match[1])
  const y = parseDecimal(match[2])
  if (!x || !y) return null
  return { x, y }
}

function sameDerived(
  derived: Extract<Derived, { _tag: "Quantity" | "Time" | "Coordinates" }>,
  text: string
): boolean | null {
  if (derived._tag === "Time") {
    const parsed = parseTime(text)
    if (!parsed) return null
    return parsed.hour === derived.hour && parsed.minute === derived.minute
  }
  if (derived._tag === "Coordinates") {
    const parsed = parseCoordinates(text)
    if (!parsed) return null
    return exactEqual(parsed.x, derived.x) && exactEqual(parsed.y, derived.y)
  }
  const parsed = parseQuantity(text)
  if (!parsed) return null
  return exactEqual(parsed, derived.value)
}

function checkChoices(
  options: { readonly a: string; readonly b: string; readonly c: string; readonly d: string },
  correct: ReadonlyArray<"a" | "b" | "c" | "d">,
  derived: Extract<Derived, { _tag: "Quantity" | "Time" | "Coordinates" }>
): FigureCheck {
  const letters = ["a", "b", "c", "d"] as const
  const matching: Array<(typeof letters)[number]> = []
  for (const letter of letters) {
    const text = options[letter]
    const equal = sameDerived(derived, text)
    if (equal === null && correct.includes(letter)) return { _tag: "Unparsed", text }
    if (equal === true) matching.push(letter)
  }
  const wanted = [...correct].sort().join(",")
  const found = [...matching].sort().join(",")
  if (wanted === found) return { _tag: "Match", derived: formatDerived(derived) }
  return {
    _tag: "Mismatch",
    derived: formatDerived(derived),
    keyedText: correct.map((letter) => options[letter]).join(", ")
  }
}

function checkStatements(
  statements: ReadonlyArray<{ readonly text: string; readonly answer: boolean }>,
  derived: Extract<Derived, { _tag: "Quantity" | "Time" | "Coordinates" }>
): FigureCheck {
  let sawQuantity = false
  for (const statement of statements) {
    const equal = sameDerived(derived, statement.text)
    if (equal === null) continue
    sawQuantity = true
    if (equal !== statement.answer) {
      return { _tag: "Mismatch", derived: formatDerived(derived), keyedText: statement.text }
    }
  }
  if (!sawQuantity) {
    return { _tag: "Unparsed", text: statements.map((statement) => statement.text).join("; ") }
  }
  return { _tag: "Match", derived: formatDerived(derived) }
}

function finishCheck(question: DiagramQuestion, derived: Derived): FigureCheck {
  if (derived._tag === "Unchecked") return { _tag: "Unchecked" }
  if (derived._tag === "NotOrderable") return { _tag: "NotOrderable" }
  if (derived._tag === "Inexact") return { _tag: "Inexact" }
  return pipe(
    Match.type<DiagramQuestion>(),
    Match.discriminatorsExhaustive("_tag")({
      mcq_single: (row) => checkChoices(row.options, [row.correct], derived),
      mcq_multi: (row) => checkChoices(row.options, row.correct, derived),
      true_false: (row) => checkStatements(row.statements, derived)
    })
  )(question)
}

function svgAttr(tag: string, name: string): number | null {
  const match = tag.match(new RegExp(`${name}="(-?\\d+(?:\\.\\d+)?)"`))
  if (!match?.[1]) return null
  return Number(match[1])
}

function faceCenter(svg: string): { cx: number; cy: number } | null {
  let best: { cx: number; cy: number; r: number } | null = null
  for (const circle of svg.matchAll(/<circle\b[^>]*>/g)) {
    const tag = circle[0]
    const cx = svgAttr(tag, "cx")
    const cy = svgAttr(tag, "cy")
    const r = svgAttr(tag, "r")
    if (cx === null || cy === null || r === null) continue
    if (best === null || r > best.r) best = { cx, cy, r }
  }
  return best === null ? null : { cx: best.cx, cy: best.cy }
}

export function drawnClockTime(svg: string): { hour: number; minute: number } | null {
  const center = faceCenter(svg)
  if (center === null) return null
  const hands: Array<{ angle: number; length: number }> = []
  for (const line of svg.matchAll(/<line\b[^>]*>/g)) {
    const tag = line[0]
    const x1 = svgAttr(tag, "x1")
    const y1 = svgAttr(tag, "y1")
    const x2 = svgAttr(tag, "x2")
    const y2 = svgAttr(tag, "y2")
    if (x1 === null || y1 === null || x2 === null || y2 === null) continue
    const startAtCenter = Math.hypot(x1 - center.cx, y1 - center.cy) <= 2
    const endAtCenter = Math.hypot(x2 - center.cx, y2 - center.cy) <= 2
    if (!startAtCenter && !endAtCenter) continue
    const endX = startAtCenter ? x2 : x1
    const endY = startAtCenter ? y2 : y1
    const length = Math.hypot(endX - center.cx, endY - center.cy)
    if (length < 8) continue
    const degrees = (Math.atan2(endX - center.cx, center.cy - endY) * 180) / Math.PI
    hands.push({ angle: (degrees + 360) % 360, length })
  }
  if (hands.length < 2) return null
  hands.sort((left, right) => right.length - left.length)
  const minuteHand = hands[0]
  const hourHand = hands[1]
  if (minuteHand === undefined || hourHand === undefined) return null
  if (minuteHand.length - hourHand.length < 4) return null
  const minute = Math.round(minuteHand.angle / 6) % 60
  const hourAngle = (hourHand.angle - minute * 0.5 + 360) % 360
  const hourIndex = Math.round(hourAngle / 30) % 12
  return { hour: hourIndex === 0 ? 12 : hourIndex, minute }
}

export function checkClockDrawing(svg: string, keyedText: string): FigureCheck {
  const drawn = drawnClockTime(svg)
  if (drawn === null) return { _tag: "Mismatch", derived: "no hands", keyedText }
  const derived = { _tag: "Time" as const, hour: drawn.hour, minute: drawn.minute }
  const formatted = formatDerived(derived)
  const parsed = parseTime(keyedText)
  if (parsed !== null && parsed.hour === drawn.hour && parsed.minute === drawn.minute) {
    return { _tag: "Match", derived: formatted }
  }
  return { _tag: "Mismatch", derived: formatted, keyedText }
}

function keyedText(question: DiagramQuestion): string {
  return pipe(
    Match.type<DiagramQuestion>(),
    Match.discriminatorsExhaustive("_tag")({
      mcq_single: (row) => row.options[row.correct],
      mcq_multi: (row) => row.correct.map((letter) => row.options[letter]).join(", "),
      true_false: (row) => row.statements.map((statement) => statement.text).join("; ")
    })
  )(question)
}

function labelTextAt(svg: string, x: number): string | null {
  for (const match of svg.matchAll(/<text x="(-?\d+(?:\.\d+)?)"[^>]*>([^<]*)<\/text>/g)) {
    if (match[1] !== undefined && Number(match[1]) === x) return match[2] ?? null
  }
  return null
}

function shadedPaint(svg: string, form: "bar" | "circle" | undefined): number {
  const pattern = form === "circle" ? /<path\b[^>]*fill="#111827"/g : /<rect\b[^>]*fill="#111827"/g
  return svg.match(pattern)?.length ?? 0
}

function barHeightsAgree(svg: string, spec: Extract<FigureSpec, { type: "bar_chart" }>): boolean {
  const max = Math.max(...spec.bars.map((bar) => bar.value), 0)
  const expected = spec.bars.map((bar) => max === 0 ? 0 : Math.round((bar.value / max) * INNER_H))
  const heights = [...svg.matchAll(/<rect x="[^"]*" y="[^"]*" width="[^"]*" height="(\d+)" fill="#111827"/g)]
  return heights.length === expected.length &&
    heights.every((height, index) => Number(height[1]) === expected[index])
}

function drawingAgrees(spec: FigureSpec): boolean {
  const svg = renderFigureSvg(spec)
  return pipe(
    Match.type<FigureSpec>(),
    Match.discriminatorsExhaustive("type")({
      circle: (row) => svg.includes(`r="${Math.round(row.radius * fit(row.radius * 2, row.radius * 2))}"`),
      square: (row) => {
        const side = Math.round(row.side * fit(row.side, row.side))
        return svg.includes(`width="${side}" height="${side}"`)
      },
      rectangle: (row) => {
        const width = Math.round(row.width * fit(row.width, row.height))
        const height = Math.round(row.height * fit(row.width, row.height))
        return svg.includes(`width="${width}" height="${height}"`)
      },
      triangle: () => svg.includes("<polygon ") && !svg.includes("data-figure-error"),
      trapezoid: () => svg.includes("<polygon ") && !svg.includes("data-figure-error"),
      coordinate_plane: (row) => {
        if (!(row.xMin < row.xMax) || !(row.yMin < row.yMax)) return false
        return row.points.every((point) => {
          const x = scaleX(point.x, row.xMin, row.xMax)
          const y = scaleY(point.y, row.yMin, row.yMax)
          return svg.includes(`<circle cx="${x}" cy="${y}" r="4"`)
        })
      },
      number_line: (row) => {
        if (!(row.min < row.max) || !(row.step > 0)) return false
        return row.marks.every((mark) =>
          labelTextAt(svg, scaleX(mark.value, row.min, row.max)) === formatQuantity(mark.value)
        )
      },
      fraction: (row) => shadedPaint(svg, row.form) === row.shaded,
      clock: (row) => {
        const drawn = drawnClockTime(svg)
        return drawn !== null && drawn.hour === row.hour && drawn.minute === row.minute
      },
      bar_chart: (row) => barHeightsAgree(svg, row)
    })
  )(spec)
}

export function checkNumberLineDrawing(svg: string, keyedText: string): FigureCheck {
  let label: string | null = null
  for (const circle of svg.matchAll(/<circle\b[^>]*>/g)) {
    const tag = circle[0]
    if (svgAttr(tag, "r") !== 5) continue
    const cx = svgAttr(tag, "cx")
    if (cx === null) continue
    label = labelTextAt(svg, cx)
    break
  }
  if (label === null) return { _tag: "Mismatch", derived: "no mark", keyedText }
  const drawn = parseQuantity(label)
  const keyed = parseQuantity(keyedText)
  if (drawn && keyed && exactEqual(drawn, keyed)) return { _tag: "Match", derived: label }
  return { _tag: "Mismatch", derived: label, keyedText }
}

export function checkFigureAnswer(question: DiagramQuestion): FigureCheck {
  if (question.figure == null) return { _tag: "Unchecked" }
  const derived = measureOf(question.figure)
  if (derived._tag === "NotOrderable" || derived._tag === "Inexact") {
    return finishCheck(question, derived)
  }
  if (!drawingAgrees(question.figure)) {
    return { _tag: "Mismatch", derived: "drawing", keyedText: keyedText(question) }
  }
  if (question.figure.type === "clock" && question.figure.measure === "time") {
    const drawn = drawnClockTime(renderFigureSvg(question.figure))
    if (drawn === null) {
      return { _tag: "Mismatch", derived: "no hands", keyedText: keyedText(question) }
    }
    return finishCheck(question, { _tag: "Time", hour: drawn.hour, minute: drawn.minute })
  }
  return finishCheck(question, derived)
}

export type TopicDiagramKind = "fraction" | "number_line" | "clock" | "bar_chart"

function answerText(question: DiagramQuestion): string | null {
  return Match.value(question).pipe(
    Match.tag("mcq_single", (row) => row.options[row.correct]),
    Match.tag("mcq_multi", () => null),
    Match.tag("true_false", () => null),
    Match.exhaustive
  )
}

function writtenFraction(raw: string): { numerator: number; denominator: number } | null {
  const match = unwrapLatexFraction(raw).match(/^(\d+)\s*\/\s*(\d+)$/)
  const numeratorText = match?.[1]
  const denominatorText = match?.[2]
  if (numeratorText === undefined || denominatorText === undefined) return null
  const numerator = Number(numeratorText)
  const denominator = Number(denominatorText)
  if (denominator < 2 || denominator > 12) return null
  if (numerator > denominator) return null
  return { numerator, denominator }
}

function integerQuantity(text: string): number | null {
  const exact = parseQuantity(text)
  if (exact === null || exact.pi !== 0 || exact.den !== 1n) return null
  const value = Number(exact.num)
  if (!Number.isSafeInteger(value)) return null
  return value
}

function fractionCandidate(text: string, form: "bar" | "circle"): FigureSpec | null {
  const written = writtenFraction(text)
  if (written === null) return null
  return {
    type: "fraction",
    denominator: written.denominator,
    shaded: written.numerator,
    measure: "value",
    form
  }
}

function numberLineWindow(value: number): { min: number; max: number } {
  const min = value >= 0 && value <= 10 ? 0 : value - 5
  return { min, max: min + 10 }
}

function numberLineCandidate(text: string): FigureSpec | null {
  const value = integerQuantity(text)
  if (value === null) return null
  const { max, min } = numberLineWindow(value)
  return {
    type: "number_line",
    min,
    max,
    step: 1,
    marks: [{ value }],
    measure: { kind: "value", index: 0 }
  }
}

function clockCandidate(text: string): FigureSpec | null {
  const time = parseTime(text)
  if (time === null) return null
  return { type: "clock", hour: time.hour, minute: time.minute, measure: "time" }
}

function barCandidate(text: string): FigureSpec | null {
  const exact = parseQuantity(text)
  if (exact === null || exact.pi !== 0 || exact.num < 0n) return null
  const value = Number(exact.num) / Number(exact.den)
  if (!Number.isFinite(value)) return null
  return {
    type: "bar_chart",
    bars: [{ name: "A", value }],
    measure: { kind: "value", index: 0 }
  }
}

function candidateFigure(
  kind: TopicDiagramKind,
  text: string,
  fractionForm: "bar" | "circle"
): FigureSpec | null {
  return Match.value(kind).pipe(
    Match.when("fraction", () => fractionCandidate(text, fractionForm)),
    Match.when("number_line", () => numberLineCandidate(text)),
    Match.when("clock", () => clockCandidate(text)),
    Match.when("bar_chart", () => barCandidate(text)),
    Match.exhaustive
  )
}

export function figureForAnswer(
  kind: TopicDiagramKind,
  question: DiagramQuestion,
  fractionForm: "bar" | "circle" = "bar"
): FigureSpec | null {
  const text = answerText(question)
  if (text === null) return null
  const candidate = candidateFigure(kind, text, fractionForm)
  if (candidate === null) return null
  const decoded = Schema.decodeUnknownEither(FigureSpecSchema)(candidate)
  if (Either.isLeft(decoded)) return null
  const check = checkFigureAnswer({ ...question, figure: decoded.right })
  if (check._tag !== "Match") return null
  return decoded.right
}
