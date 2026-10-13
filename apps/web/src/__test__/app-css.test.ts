import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("app.css import order", () => {
  it("self-hosts Plus Jakarta Sans and keeps Tailwind ahead of shared UI CSS", () => {
    const appCss = readFileSync(join(process.cwd(), "src/app.css"), "utf8")
    const uiCss = readFileSync(join(process.cwd(), "../../packages/ui/tailwind.css"), "utf8")

    const appImports = appCss
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("@import"))

    expect(appCss).not.toContain("fonts.googleapis.com")
    expect(appCss).toContain("font-display: swap")
    expect(appCss).toContain("Plus Jakarta Sans")
    expect(appImports[0]).toBe("@import \"tailwindcss\";")
    expect(uiCss).not.toContain("fonts.googleapis.com")
  })
})
