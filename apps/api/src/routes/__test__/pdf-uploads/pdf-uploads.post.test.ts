import { Effect } from "effect"
import { File } from "node:buffer"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { validatePdfUploadFile } from "../../../lib/pdf-upload-service.js"

const fixturePath = join(
  fileURLToPath(new URL("../../../__test__/fixtures/sample-worksheet.pdf", import.meta.url))
)

describe("validatePdfUploadFile", () => {
  it("accepts a small PDF file", async () => {
    const file = new File([readFileSync(fixturePath)], "worksheet.pdf", { type: "application/pdf" })
    const bytes = await Effect.runPromise(validatePdfUploadFile(file))
    expect(bytes.length).toBeGreaterThan(0)
  })

  it("rejects non-PDF files", async () => {
    const file = new File([Buffer.from("hello")], "notes.txt", { type: "text/plain" })
    const result = await Effect.runPromise(Effect.either(validatePdfUploadFile(file)))
    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left.status).toBe(415)
    }
  })
})
