import type { FigureSpec } from "@teacher-exam/shared"

const WIDTH = 240
const HEIGHT = 160

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
}

function svgText(x: number, y: number, label: string, anchor = "middle"): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="12" font-family="Arial, sans-serif" fill="#111827">${
    escapeSvgText(
      label
    )
  }</text>`
}

function frame(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Diagram geometri">${inner}</svg>`
}

/** Server-side mirror of apps/web/src/lib/figure-renderer.ts for headless PDF/DOCX export. */
export function renderFigureSvg(spec: FigureSpec): string {
  switch (spec.type) {
    case "circle":
      return frame([
        "<circle cx=\"120\" cy=\"76\" r=\"48\" fill=\"none\" stroke=\"#111827\" stroke-width=\"2\"/>",
        "<line x1=\"120\" y1=\"76\" x2=\"168\" y2=\"76\" stroke=\"#111827\" stroke-width=\"2\"/>",
        spec.label ? svgText(144, 68, spec.label) : ""
      ].join(""))
    case "square":
      return frame([
        "<rect x=\"76\" y=\"36\" width=\"88\" height=\"88\" fill=\"none\" stroke=\"#111827\" stroke-width=\"2\"/>",
        spec.label ? svgText(120, 144, spec.label) : ""
      ].join(""))
    case "rectangle":
      return frame([
        "<rect x=\"52\" y=\"48\" width=\"136\" height=\"72\" fill=\"none\" stroke=\"#111827\" stroke-width=\"2\"/>",
        spec.label ? svgText(120, 144, spec.label) : ""
      ].join(""))
    case "triangle":
      return frame([
        "<polygon points=\"120,32 52,124 188,124\" fill=\"none\" stroke=\"#111827\" stroke-width=\"2\"/>",
        "<line x1=\"120\" y1=\"32\" x2=\"120\" y2=\"124\" stroke=\"#6b7280\" stroke-width=\"1.5\" stroke-dasharray=\"4 4\"/>",
        spec.label ? svgText(120, 148, spec.label) : ""
      ].join(""))
    case "trapezoid":
      return frame([
        "<polygon points=\"88,40 152,40 192,124 48,124\" fill=\"none\" stroke=\"#111827\" stroke-width=\"2\"/>",
        "<line x1=\"120\" y1=\"40\" x2=\"120\" y2=\"124\" stroke=\"#6b7280\" stroke-width=\"1.5\" stroke-dasharray=\"4 4\"/>",
        spec.label ? svgText(120, 148, spec.label) : ""
      ].join(""))
    case "coordinate_plane":
      return renderCoordinatePlane(spec)
  }
}

function renderCoordinatePlane(
  spec: Extract<FigureSpec, { type: "coordinate_plane" }>
): string {
  const left = 36
  const right = 216
  const top = 16
  const bottom = 136
  const xSpan = spec.xMax - spec.xMin || 1
  const ySpan = spec.yMax - spec.yMin || 1
  const sx = (x: number) => Math.round(left + ((x - spec.xMin) / xSpan) * (right - left))
  const sy = (y: number) => Math.round(bottom - ((y - spec.yMin) / ySpan) * (bottom - top))
  const xAxis = spec.yMin <= 0 && spec.yMax >= 0 ? sy(0) : bottom
  const yAxis = spec.xMin <= 0 && spec.xMax >= 0 ? sx(0) : left
  const points = spec.points
    .map((p) => {
      const x = sx(p.x)
      const y = sy(p.y)
      return [
        `<circle cx="${x}" cy="${y}" r="4" fill="#111827"/>`,
        p.label ? svgText(x + 8, y - 8, p.label, "start") : ""
      ].join("")
    })
    .join("")

  return frame([
    `<line x1="${left}" y1="${xAxis}" x2="${right}" y2="${xAxis}" stroke="#111827" stroke-width="2"/>`,
    `<line x1="${yAxis}" y1="${top}" x2="${yAxis}" y2="${bottom}" stroke="#111827" stroke-width="2"/>`,
    points,
    spec.label ? svgText(120, 154, spec.label) : ""
  ].join(""))
}
