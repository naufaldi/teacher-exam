import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { injectSharePreview, sharePreviewFromExam } from "../share-preview.js"

const webRoot = join(process.cwd())

describe("public preview files", () => {
  it("ships a landing description, an image, robots rules, and a sitemap", () => {
    const html = readFileSync(join(webRoot, "index.html"), "utf8")
    const robots = readFileSync(join(webRoot, "public/robots.txt"), "utf8")
    const sitemap = readFileSync(join(webRoot, "public/sitemap.xml"), "utf8")
    const image = readFileSync(join(webRoot, "public/og.png"))

    expect(html).toContain("name=\"description\"")
    expect(html.toLowerCase()).toContain("siap cetak")
    expect(html.toLowerCase()).toContain("sd")
    expect(html).toContain("property=\"og:image\"")
    expect(html).toContain("/og.png")
    expect(robots).toMatch(/User-agent:/)
    expect(robots).toMatch(/Allow:|Disallow:/)
    expect(robots).not.toContain("<div")
    expect(sitemap).toContain("https://ujian-sekolah.naufaldi.com/")
    expect(sitemap).toContain("https://ujian-sekolah.naufaldi.com/bank-soal-publik")
    expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  })

  it("names the landing page url, type, locale, and canonical link", () => {
    const html = readFileSync(join(webRoot, "index.html"), "utf8")

    expect(html).toContain("property=\"og:url\" content=\"https://ujian-sekolah.naufaldi.com/\"")
    expect(html).toContain("property=\"og:type\" content=\"website\"")
    expect(html).toContain("property=\"og:locale\" content=\"id_ID\"")
    expect(html).toContain("rel=\"canonical\" href=\"https://ujian-sekolah.naufaldi.com/\"")
  })
})

describe("sharePreviewFromExam", () => {
  it("builds a title, description, and image for a shared sheet", () => {
    const meta = sharePreviewFromExam({
      title: "Ulangan Narasi",
      subjectLabel: "Bahasa Indonesia",
      grade: 4,
      origin: "https://ujian-sekolah.naufaldi.com/",
      slug: "share-abc"
    })

    expect(meta.title).toBe("Ulangan Narasi")
    expect(meta.description).toContain("Ulangan Narasi")
    expect(meta.description).toContain("Bahasa Indonesia")
    expect(meta.description).toContain("Kelas 4 SD")
    expect(meta.description.toLowerCase()).toContain("siap cetak")
    expect(meta.imageUrl).toBe("https://ujian-sekolah.naufaldi.com/og.png")
    expect(meta.pageUrl).toBe("https://ujian-sekolah.naufaldi.com/share/share-abc")
  })
})

describe("injectSharePreview", () => {
  it("puts the shared sheet title, description, and image in the html head", () => {
    const html = injectSharePreview(
      "<!doctype html><html><head><title>Ujian Sekolah — Generator Soal</title></head><body><div id=\"root\"></div></body></html>",
      {
        title: "Ulangan Narasi",
        description: "Ulangan Narasi. Bahasa Indonesia Kelas 4 SD. Lembar ujian siap cetak.",
        imageUrl: "https://ujian-sekolah.naufaldi.com/og.png",
        pageUrl: "https://ujian-sekolah.naufaldi.com/share/share-abc"
      }
    )

    expect(html).toContain("<title>Ulangan Narasi</title>")
    expect(html).toContain("property=\"og:title\" content=\"Ulangan Narasi\"")
    expect(html).toContain(
      "name=\"description\" content=\"Ulangan Narasi. Bahasa Indonesia Kelas 4 SD. Lembar ujian siap cetak.\""
    )
    expect(html).toContain("property=\"og:image\" content=\"https://ujian-sekolah.naufaldi.com/og.png\"")
    expect(html).toContain("<div id=\"root\"></div>")
    expect(html).not.toContain("Ujian Sekolah — Generator Soal")
  })

  it("replaces the landing url with the share page url, type, locale, and canonical link", () => {
    const html = injectSharePreview(
      [
        "<!doctype html><html><head>",
        "<title>Ujian Sekolah — Generator Soal</title>",
        "<meta property=\"og:url\" content=\"https://ujian-sekolah.naufaldi.com/\" />",
        "<link rel=\"canonical\" href=\"https://ujian-sekolah.naufaldi.com/\" />",
        "</head><body><div id=\"root\"></div></body></html>"
      ].join(""),
      {
        title: "Ulangan Narasi",
        description: "Ulangan Narasi. Bahasa Indonesia Kelas 4 SD. Lembar ujian siap cetak.",
        imageUrl: "https://ujian-sekolah.naufaldi.com/og.png",
        pageUrl: "https://ujian-sekolah.naufaldi.com/share/share-abc"
      }
    )

    expect(html).toContain(
      "property=\"og:url\" content=\"https://ujian-sekolah.naufaldi.com/share/share-abc\""
    )
    expect(html).toContain("property=\"og:type\" content=\"website\"")
    expect(html).toContain("property=\"og:locale\" content=\"id_ID\"")
    expect(html).toContain(
      "rel=\"canonical\" href=\"https://ujian-sekolah.naufaldi.com/share/share-abc\""
    )
    expect(html.match(/property="og:url"/g)).toHaveLength(1)
    expect(html.match(/property="og:type"/g)).toHaveLength(1)
    expect(html.match(/rel="canonical"/g)).toHaveLength(1)
    expect(html).not.toContain("content=\"https://ujian-sekolah.naufaldi.com/\"")
    expect(html).not.toContain("href=\"https://ujian-sekolah.naufaldi.com/\"")
  })
})
