import { Schema } from "effect"

export const GPT_IMAGE_MODEL_ID = "gpt-image-2.5-sunburst"

const SvgMarkup = Schema.String.pipe(Schema.minLength(1), Schema.maxLength(20_000))
const RasterBytes = Schema.String.pipe(Schema.minLength(1), Schema.maxLength(4_000_000))

export const SoalImageMediaTypeSchema = Schema.Literal("image/png", "image/jpeg", "image/webp")
export type SoalImageMediaType = typeof SoalImageMediaTypeSchema.Type

export const SoalImageSvgSchema = Schema.Struct({
  source: Schema.Literal("svg"),
  svg: SvgMarkup
})
export type SoalImageSvg = typeof SoalImageSvgSchema.Type

export const SoalImageRasterSchema = Schema.Struct({
  source: Schema.Literal("generated", "upload"),
  mediaType: SoalImageMediaTypeSchema,
  dataBase64: RasterBytes
})
export type SoalImageRaster = typeof SoalImageRasterSchema.Type

export const SoalImageSchema = Schema.Union(SoalImageSvgSchema, SoalImageRasterSchema)
export type SoalImage = typeof SoalImageSchema.Type

export const SetSoalImageInputSchema = Schema.Struct({
  route: Schema.Literal("svg", "model")
})
export type SetSoalImageInput = typeof SetSoalImageInputSchema.Type

export const UploadSoalImageInputSchema = Schema.Struct({
  mediaType: SoalImageMediaTypeSchema,
  dataBase64: RasterBytes
})
export type UploadSoalImageInput = typeof UploadSoalImageInputSchema.Type

const SVG_NAMESPACE = "http://www.w3.org/2000/svg"

const DRAWING_ELEMENTS: ReadonlySet<string> = new Set([
  "svg",
  "g",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "tspan",
  "title",
  "desc"
])

const PRESENTATION_ATTRS: ReadonlySet<string> = new Set([
  "id",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "transform",
  "font-size",
  "font-family",
  "text-anchor"
])

const SHAPE_ATTRS: Readonly<Record<string, ReadonlySet<string>>> = {
  svg: new Set(["xmlns", "viewBox", "width", "height"]),
  g: new Set<string>(),
  rect: new Set(["x", "y", "width", "height", "rx", "ry"]),
  circle: new Set(["cx", "cy", "r"]),
  ellipse: new Set(["cx", "cy", "rx", "ry"]),
  line: new Set(["x1", "y1", "x2", "y2"]),
  polyline: new Set(["points"]),
  polygon: new Set(["points"]),
  path: new Set(["d"]),
  text: new Set(["x", "y", "dx", "dy"]),
  tspan: new Set(["x", "y", "dx", "dy"]),
  title: new Set<string>(),
  desc: new Set<string>()
}

function isNameStart(char: string): boolean {
  return char >= "A" && char <= "Z" || char >= "a" && char <= "z"
}

function isNameChar(char: string): boolean {
  return isNameStart(char) || char >= "0" && char <= "9" || char === "-" || char === ":"
}

function skipSpace(svg: string, index: number): number {
  let next = index
  while (next < svg.length && /\s/.test(svg[next] ?? "")) next += 1
  return next
}

function readName(svg: string, index: number): { name: string; index: number } | null {
  if (!isNameStart(svg[index] ?? "")) return null
  let next = index + 1
  while (next < svg.length && isNameChar(svg[next] ?? "")) next += 1
  return { name: svg.slice(index, next), index: next }
}

function readValue(svg: string, index: number): { value: string; index: number } | null {
  const quote = svg[index] ?? ""
  if (quote === "\"" || quote === "'") {
    const end = svg.indexOf(quote, index + 1)
    if (end < 0) return null
    return { value: svg.slice(index + 1, end), index: end + 1 }
  }
  let next = index
  while (next < svg.length && !/[\s/>]/.test(svg[next] ?? "")) next += 1
  if (next === index) return null
  return { value: svg.slice(index, next), index: next }
}

function codePointChar(code: number): string | null {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return null
  if (code >= 0xd800 && code <= 0xdfff) return null
  return String.fromCodePoint(code)
}

function decodeNumericEntities(value: string): string | null {
  let failed = false
  const decoded = value.replace(/&#x([0-9a-f]{1,6});?/gi, (match, hex: string) => {
    const char = codePointChar(Number.parseInt(hex, 16))
    if (char === null) {
      failed = true
      return match
    }
    return char
  }).replace(/&#([0-9]{1,7});?/g, (match, num: string) => {
    const char = codePointChar(Number.parseInt(num, 10))
    if (char === null) {
      failed = true
      return match
    }
    return char
  })
  return failed ? null : decoded
}

function stripControls(value: string): string {
  let out = ""
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (code > 0x20) out += char
  }
  return out
}

function attributeValueIsSafe(name: string, value: string): boolean {
  if (name === "xmlns") return value === SVG_NAMESPACE
  if (value.length > 4000) return false
  const decoded = decodeNumericEntities(value)
  if (decoded === null) return false
  const expanded = decoded
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
  if (expanded.includes("&") || expanded.includes("<") || expanded.includes(">")) return false
  const flat = stripControls(expanded).toLowerCase()
  if (flat.includes("javascript:")) return false
  if (flat.includes("data:")) return false
  if (flat.includes("http:") || flat.includes("https:")) return false
  if (flat.includes("url(")) return false
  if (flat.includes("expression(")) return false
  return true
}

function attributeOk(element: string, name: string, value: string): boolean {
  const shape = SHAPE_ATTRS[element]
  if (shape === undefined) return false
  if (!PRESENTATION_ATTRS.has(name) && !shape.has(name)) return false
  return attributeValueIsSafe(name, value)
}

function parseDrawingSvg(svg: string): { xmlns: boolean } | null {
  const stack: Array<string> = []
  let index = 0
  let sawRoot = false
  let xmlns = false
  while (index < svg.length) {
    if ((svg[index] ?? "") !== "<") {
      index += 1
      continue
    }
    if (svg.startsWith("<!", index) || svg.startsWith("<?", index)) return null
    if (svg.startsWith("</", index)) {
      const name = readName(svg, index + 2)
      if (name === null) return null
      const end = skipSpace(svg, name.index)
      if ((svg[end] ?? "") !== ">") return null
      if (stack.pop() !== name.name) return null
      index = end + 1
      continue
    }
    const name = readName(svg, index + 1)
    if (name === null || !DRAWING_ELEMENTS.has(name.name)) return null
    if (!sawRoot && (name.name !== "svg" || index !== 0)) return null
    sawRoot = true
    let cursor = name.index
    let selfClosing = false
    let closed = false
    while (cursor < svg.length) {
      cursor = skipSpace(svg, cursor)
      const char = svg[cursor] ?? ""
      if (char === ">") {
        closed = true
        cursor += 1
        break
      }
      if (char === "/") {
        if ((svg[cursor + 1] ?? "") !== ">") return null
        selfClosing = true
        closed = true
        cursor += 2
        break
      }
      const attr = readName(svg, cursor)
      if (attr === null) return null
      cursor = skipSpace(svg, attr.index)
      if ((svg[cursor] ?? "") !== "=") return null
      cursor = skipSpace(svg, cursor + 1)
      const read = readValue(svg, cursor)
      if (read === null || !attributeOk(name.name, attr.name, read.value)) return null
      if (name.name === "svg" && attr.name === "xmlns") xmlns = true
      cursor = read.index
    }
    if (!closed) return null
    if (!selfClosing) stack.push(name.name)
    index = cursor
  }
  if (!sawRoot || stack.length !== 0) return null
  return { xmlns }
}

export function sanitizeStimulusSvg(raw: string): string | null {
  const start = raw.indexOf("<svg")
  const end = raw.lastIndexOf("</svg>")
  if (start < 0 || end < start) return null
  let svg = raw.slice(start, end + "</svg>".length).trim()
  if (svg.length === 0 || svg.length > 20_000) return null
  const parsed = parseDrawingSvg(svg)
  if (parsed === null) return null
  if (!parsed.xmlns) {
    svg = svg.replace("<svg", `<svg xmlns="${SVG_NAMESPACE}"`)
  }
  return svg
}

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

function decodeBase64(alphabet: string): Uint8Array | null {
  const cleaned = alphabet.replace(/\s/g, "")
  if (cleaned.length < 16 || cleaned.length > 4_000_000 || cleaned.length % 4 === 1) return null
  const bytes: Array<number> = []
  for (let index = 0; index < cleaned.length; index += 4) {
    const c0 = BASE64_ALPHABET.indexOf(cleaned[index] ?? "")
    const c1 = BASE64_ALPHABET.indexOf(cleaned[index + 1] ?? "")
    const c2Char = cleaned[index + 2] ?? "="
    const c3Char = cleaned[index + 3] ?? "="
    const c2 = c2Char === "=" ? 0 : BASE64_ALPHABET.indexOf(c2Char)
    const c3 = c3Char === "=" ? 0 : BASE64_ALPHABET.indexOf(c3Char)
    if (c0 < 0 || c1 < 0 || (c2Char !== "=" && c2 < 0) || (c3Char !== "=" && c3 < 0)) return null
    bytes.push((c0 << 2) | (c1 >> 4))
    if (c2Char !== "=") bytes.push(((c1 & 15) << 4) | (c2 >> 2))
    if (c3Char !== "=") bytes.push(((c2 & 3) << 6) | c3)
  }
  if (bytes.length < 12 || bytes.length > 3_000_000) return null
  return Uint8Array.from(bytes)
}

export function rasterBytesLookValid(mediaType: SoalImageMediaType, dataBase64: string): boolean {
  const bytes = decodeBase64(dataBase64)
  if (bytes === null) return false
  const byte = (index: number) => bytes[index] ?? -1
  if (mediaType === "image/png") {
    return byte(0) === 0x89 && byte(1) === 0x50 && byte(2) === 0x4e && byte(3) === 0x47
  }
  if (mediaType === "image/jpeg") {
    return byte(0) === 0xff && byte(1) === 0xd8 && byte(2) === 0xff
  }
  const riff = String.fromCharCode(byte(0), byte(1), byte(2), byte(3))
  const webp = String.fromCharCode(byte(8), byte(9), byte(10), byte(11))
  return riff === "RIFF" && webp === "WEBP"
}

export function soalImageHtml(image: SoalImage): string {
  if (image.source === "svg") {
    const svg = sanitizeStimulusSvg(image.svg)
    if (svg === null) return ""
    return `<div class="soal-stimulus" style="filter:grayscale(1)">${svg}</div>`
  }
  if (!rasterBytesLookValid(image.mediaType, image.dataBase64)) return ""
  const bytes = image.dataBase64.replace(/\s/g, "")
  return `<div class="soal-stimulus" style="filter:grayscale(1)"><img alt="" src="data:${image.mediaType};base64,${bytes}" /></div>`
}
