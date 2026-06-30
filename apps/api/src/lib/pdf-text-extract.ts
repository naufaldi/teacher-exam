import { PDFDocument } from "pdf-lib"

export interface PdfExtractResult {
  readonly text: string
  readonly pageCount: number
}

async function loadPageCount(bytes: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    return doc.getPageCount()
  } catch {
    return 1
  }
}

export async function extractPdfText(bytes: Buffer): Promise<PdfExtractResult> {
  const pageCount = await loadPageCount(bytes)

  try {
    const { extractText, getDocumentProxy } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(bytes))
    const { text } = await extractText(pdf, { mergePages: true })
    const merged = Array.isArray(text) ? text.join("\n\n") : String(text ?? "")
    const trimmed = merged.trim()
    if (trimmed.length > 0) {
      return { text: trimmed, pageCount }
    }
  } catch {
    // fall through to latin1 heuristic
  }

  const printable = bytes
    .toString("latin1")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/\s{3,}/g, " ")
    .trim()

  return { text: printable.slice(0, 50_000), pageCount }
}
