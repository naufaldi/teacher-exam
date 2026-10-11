import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const webRoot = process.cwd()

describe("phone landing bundle", () => {
  it("turns on route code splitting in the Vite config", () => {
    const config = readFileSync(join(webRoot, "vite.config.ts"), "utf8")
    expect(config).toContain("autoCodeSplitting: true")
  })

  it("serves brotli and a short HTML cache from Caddy", () => {
    const caddy = readFileSync(join(webRoot, "Caddyfile"), "utf8")
    expect(caddy).toContain("br")
    expect(caddy).toMatch(/max-age=60/)
  })

  it("builds more than one JS file and keeps the largest under the old single bundle", () => {
    const assets = readdirSync(join(webRoot, "dist/assets")).filter((name) => name.endsWith(".js"))
    expect(assets.length).toBeGreaterThan(1)
    const largest = Math.max(...assets.map((name) => statSync(join(webRoot, "dist/assets", name)).size))
    expect(largest).toBeLessThan(1_372_642)
    const indexHtml = readFileSync(join(webRoot, "dist/index.html"), "utf8")
    const entry = indexHtml.match(/src="(\/assets\/[^"]+\.js)"/)?.[1]
    expect(entry).toBeTruthy()
    const entrySource = readFileSync(join(webRoot, "dist", entry ?? ""), "utf8")
    expect(entrySource.includes("import(") || assets.length > 2).toBe(true)
    expect(entrySource).not.toContain("Download the React DevTools")
  })

  it("prerenders the landing sample into the HTML shell", () => {
    const indexHtml = readFileSync(join(webRoot, "dist/index.html"), "utf8")
    expect(indexHtml).toContain("LULUS KURIKULUM")
    expect(indexHtml).toContain("Buat Soal Ujian Sekolah")
    expect(indexHtml).not.toContain("modulepreload")
    const cssAt = indexHtml.indexOf("rel=\"stylesheet\"")
    const scriptAt = indexHtml.indexOf("type=\"module\"")
    expect(cssAt).toBeGreaterThan(-1)
    expect(cssAt).toBeLessThan(scriptAt)
  })

  it("hydrates a prerendered landing instead of replacing it", () => {
    const main = readFileSync(join(webRoot, "src/main.tsx"), "utf8")
    const shell = readFileSync(join(webRoot, "index.html"), "utf8")
    expect(main).toContain("hydrateRoot")
    expect(main).toContain("shouldHydratePrerenderedRoot")
    expect(main).toContain("manifest: undefined")
    expect(shell).toContain("path === \"/\"")
  })
})
