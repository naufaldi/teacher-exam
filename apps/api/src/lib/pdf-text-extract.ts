import { PDFDocument } from "pdf-lib"

export interface PdfExtractResult {
  readonly text: string
  readonly pageCount: number
}

export async function extractPdfText(bytes: Buffer): Promise<PdfExtractResult> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const pageCount = doc.getPageCount()

  try {
    const { extractText, getDocumentProxy } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(bytes))
    const { text } = await extractText(pdf, { mergePages: true })
    const merged = Array.isArray(text) ? text.join("\n\n") : String(text ?? "")
    return { text: merged.trim(), pageCount }
  } catch {
    const printable = bytes
      .toString("latin1")
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s{3,}/g, " ")
      .trim()
    return { text: printable.slice(0, 50_000), pageCount }
  }
}
