import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

let cachedCss: string | null = null

const FONT_MIME: Record<string, string> = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf"
}

/**
 * Loads KaTeX's stylesheet from the installed `katex` package and rewrites its
 * relative `url(fonts/...)` references to base64 data URIs so the export HTML
 * is fully self-contained for headless Chromium rendering (no network needed).
 * Cached for the process lifetime.
 */
export function loadKatexCss(): string {
  if (cachedCss !== null) return cachedCss

  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    join(here, "..", "..", "..", "node_modules", "katex", "dist", "katex.min.css"),
    join(here, "..", "..", "..", "..", "..", "node_modules", "katex", "dist", "katex.min.css")
  ]
  const cssPath = candidates.find((p) => existsSync(p))

  if (cssPath === undefined) {
    // Fallback: CDN link (requires network, used only if the package is missing)
    cachedCss = "@import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');"
    return cachedCss
  }

  let css = readFileSync(cssPath, "utf8")
  css = css.replace(/url\((?:['"])?(fonts\/[^)'"]+)\)?/g, (match, rel: string) => {
    const fontPath = join(dirname(cssPath), rel)
    if (!existsSync(fontPath)) return match
    const ext = extOf(fontPath)
    const mime = FONT_MIME[ext] ?? "application/octet-stream"
    const data = readFileSync(fontPath).toString("base64")
    return `url(data:${mime};base64,${data})`
  })
  cachedCss = css
  return css
}

function extOf(p: string): string {
  const i = p.lastIndexOf(".")
  return i === -1 ? "" : p.slice(i).toLowerCase()
}
