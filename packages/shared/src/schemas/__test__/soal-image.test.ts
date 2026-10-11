import { Either, Schema } from "effect"
import { describe, expect, test } from "vitest"
import {
  rasterBytesLookValid,
  sanitizeStimulusSvg,
  SetSoalImageInputSchema,
  soalImageHtml,
  SoalImageSchema
} from "../soal-image.js"

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
const SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#336699"/></svg>`

describe("SoalImageSchema", () => {
  test("decodes an svg stimulus and a generated png", () => {
    const svg = Schema.decodeUnknownEither(SoalImageSchema)({ source: "svg", svg: SVG })
    const png = Schema.decodeUnknownEither(SoalImageSchema)({
      source: "generated",
      mediaType: "image/png",
      dataBase64: PNG
    })
    expect(Either.isRight(svg)).toBe(true)
    expect(Either.isRight(png)).toBe(true)
    if (Either.isRight(svg)) expect(svg.right.source).toBe("svg")
    if (Either.isRight(png) && png.right.source === "generated") {
      expect(png.right.mediaType).toBe("image/png")
    }
  })

  test("rejects a raster image that claims to be svg", () => {
    const result = Schema.decodeUnknownEither(SoalImageSchema)({
      source: "svg",
      mediaType: "image/png",
      dataBase64: PNG
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("sanitizeStimulusSvg", () => {
  test("keeps the svg element from a fenced model reply", () => {
    const svg = sanitizeStimulusSvg("```svg\n" + SVG + "\n```")
    expect(svg).toBe(SVG)
  })

  test("rejects script and event handlers", () => {
    expect(sanitizeStimulusSvg(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`)).toBeNull()
    expect(sanitizeStimulusSvg(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>`)).toBeNull()
  })
})

describe("soalImageHtml", () => {
  test("prints the svg in grayscale", () => {
    const html = soalImageHtml({ source: "svg", svg: SVG })
    expect(html).toContain("filter:grayscale(1)")
    expect(html).toContain("<rect")
    expect(html).not.toContain("```")
  })

  test("prints an uploaded png as a grayscale data url", () => {
    const html = soalImageHtml({ source: "upload", mediaType: "image/png", dataBase64: PNG })
    expect(html).toContain("filter:grayscale(1)")
    expect(html).toContain(`data:image/png;base64,${PNG}`)
  })

  test("drops a png whose bytes are not a png", () => {
    expect(rasterBytesLookValid("image/png", "aGVsbG8=")).toBe(false)
    expect(soalImageHtml({ source: "upload", mediaType: "image/png", dataBase64: "aGVsbG8=" })).toBe("")
  })
})

describe("SetSoalImageInputSchema", () => {
  test("accepts the two draw routes", () => {
    expect(Either.isRight(Schema.decodeUnknownEither(SetSoalImageInputSchema)({ route: "svg" }))).toBe(true)
    expect(Either.isRight(Schema.decodeUnknownEither(SetSoalImageInputSchema)({ route: "model" }))).toBe(true)
    expect(Either.isRight(Schema.decodeUnknownEither(SetSoalImageInputSchema)({ route: "upload" }))).toBe(false)
  })
})
