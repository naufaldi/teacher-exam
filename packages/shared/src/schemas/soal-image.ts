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

export function sanitizeStimulusSvg(raw: string): string | null {
  const start = raw.indexOf("<svg")
  const end = raw.lastIndexOf("</svg>")
  if (start < 0 || end < start) return null
  let svg = raw.slice(start, end + "</svg>".length).trim()
  if (svg.length === 0 || svg.length > 20_000) return null
  if (/<script/i.test(svg)) return null
  if (/<foreignObject/i.test(svg)) return null
  if (/\son[a-z]+\s*=/i.test(svg)) return null
  if (/javascript:/i.test(svg)) return null
  if (!/xmlns=/.test(svg)) {
    svg = svg.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"")
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
