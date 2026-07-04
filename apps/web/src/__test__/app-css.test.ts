import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("app.css import order", () => {
  it("keeps external font imports before Tailwind and out of shared UI CSS", () => {
    const appCss = readFileSync(join(process.cwd(), "src/app.css"), "utf8")
    const uiCss = readFileSync(join(process.cwd(), "../../packages/ui/tailwind.css"), "utf8")

    const appImports = appCss
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("@import"))

    expect(appImports[0]).toContain("fonts.googleapis.com")
    expect(appImports[1]).toBe("@import \"tailwindcss\";")
    expect(uiCss).not.toContain("fonts.googleapis.com")
  })
})
