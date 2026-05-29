import { Schema } from "effect"

const PositiveNumber = Schema.Number.pipe(
  Schema.filter((n) => n > 0, { message: () => "dimension must be positive" })
)

const OptionalLabel = Schema.optional(Schema.String.pipe(Schema.minLength(1)))

export const FigurePointSchema = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  label: OptionalLabel
})
export type FigurePoint = typeof FigurePointSchema.Type

export const CircleFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("circle"),
  radius: PositiveNumber,
  label: OptionalLabel
})

export const SquareFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("square"),
  side: PositiveNumber,
  label: OptionalLabel
})

export const RectangleFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("rectangle"),
  width: PositiveNumber,
  height: PositiveNumber,
  label: OptionalLabel
})

export const TriangleFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("triangle"),
  base: PositiveNumber,
  height: PositiveNumber,
  label: OptionalLabel
})

export const TrapezoidFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("trapezoid"),
  topBase: PositiveNumber,
  bottomBase: PositiveNumber,
  height: PositiveNumber,
  label: OptionalLabel
})

export const CoordinatePlaneFigureSpecSchema = Schema.Struct({
  type: Schema.Literal("coordinate_plane"),
  xMin: Schema.Number,
  xMax: Schema.Number,
  yMin: Schema.Number,
  yMax: Schema.Number,
  points: Schema.Array(FigurePointSchema),
  label: OptionalLabel
})

export const FigureSpecSchema = Schema.Union(
  CircleFigureSpecSchema,
  SquareFigureSpecSchema,
  RectangleFigureSpecSchema,
  TriangleFigureSpecSchema,
  TrapezoidFigureSpecSchema,
  CoordinatePlaneFigureSpecSchema
)
export type FigureSpec = typeof FigureSpecSchema.Type
