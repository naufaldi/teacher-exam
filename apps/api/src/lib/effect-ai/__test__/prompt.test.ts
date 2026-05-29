import { describe, expect, it } from "vitest"
import { buildPrompt, getPromptSystemContent, getPromptUserFileParts, getPromptUserText } from "../prompt"

describe("buildPrompt", () => {
  it("keeps system separate from user text", () => {
    const prompt = buildPrompt({
      system: "BASELINE\n## Capaian Pembelajaran\n- foo",
      user: "task params"
    })

    expect(getPromptSystemContent(prompt)).toBe("BASELINE\n## Capaian Pembelajaran\n- foo")
    expect(getPromptUserText(prompt)).toBe("task params")
    expect(getPromptUserText(prompt)).not.toContain("## Capaian Pembelajaran")
  })

  it("omits PDF file part when pdfBytes is absent", () => {
    const prompt = buildPrompt({ system: "s", user: "u" })
    expect(getPromptUserFileParts(prompt)).toEqual([])
  })

  it("adds PDF file part when pdfBytes is provided", () => {
    const pdfBytes = Buffer.from("%PDF-1.4 fake")
    const prompt = buildPrompt({ system: "s", user: "u", pdfBytes })
    const files = getPromptUserFileParts(prompt)
    expect(files).toHaveLength(1)
    expect(files[0]?.type).toBe("file")
    expect(files[0]?.mediaType).toBe("application/pdf")
    expect(files[0]?.fileName).toBe("materi.pdf")
  })
})
