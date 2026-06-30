import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { PDFDocument, StandardFonts } from "pdf-lib"
import { describe, expect, it } from "vitest"
import { extractPdfText } from "../pdf-text-extract"

const fixturePath = join(
  fileURLToPath(new URL("../../__test__/fixtures/sample-worksheet.pdf", import.meta.url))
)

describe("extractPdfText", () => {
  it("extracts text from a valid pdf-lib worksheet PDF", async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.addPage()
    page.drawText("Ekosistem dan lingkungan sekitar sekolah untuk ujian IPAS.", {
      x: 50,
      y: 700,
      size: 12,
      font
    })
    const bytes = Buffer.from(await doc.save())

    const result = await extractPdfText(bytes)

    expect(result.pageCount).toBeGreaterThan(0)
    expect(result.text.toLowerCase()).toContain("ekosistem")
  })

  it("does not throw on the legacy minimal fixture PDF", async () => {
    const bytes = readFileSync(fixturePath)

    const result = await extractPdfText(bytes)

    expect(result.pageCount).toBeGreaterThan(0)
    expect(result.text.length).toBeGreaterThan(0)
  })
})
