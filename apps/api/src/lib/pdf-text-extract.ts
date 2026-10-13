import { PDFDocument } from "pdf-lib"
import { PDF_PAGE_CAP } from "./pdf-limits"

const MIN_PAGE_LETTERS = 20

export interface PdfPageText {
  readonly page: number
  readonly text: string
}

export type PdfExtractResult =
  | {
    readonly _tag: "ok"
    readonly text: string
    readonly pageCount: number
    readonly pages: ReadonlyArray<PdfPageText>
  }
  | { readonly _tag: "too_many_pages"; readonly pageCount: number }
  | { readonly _tag: "scanned"; readonly pageCount: number }

export async function readPdfPageCount(bytes: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    return doc.getPageCount()
  } catch {
    return 1
  }
}

function letterCount(text: string): number {
  return text.match(/\p{L}/gu)?.length ?? 0
}

export async function extractPdfText(bytes: Buffer): Promise<PdfExtractResult> {
  const pageCount = await readPdfPageCount(bytes)
  if (pageCount > PDF_PAGE_CAP) {
    return { _tag: "too_many_pages", pageCount }
  }

  try {
    const { extractText, getDocumentProxy } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(bytes))
    const extracted = await extractText(pdf, { mergePages: false })
    const rawPages = Array.isArray(extracted.text) ? extracted.text : [String(extracted.text ?? "")]
    const pages = rawPages.flatMap((raw, index) => {
      const text = String(raw).trim()
      if (letterCount(text) < MIN_PAGE_LETTERS) return []
      return [{ page: index + 1, text }]
    })
    if (pages.length === 0) {
      return { _tag: "scanned", pageCount }
    }
    return {
      _tag: "ok",
      pageCount,
      pages,
      text: pages.map((page) => page.text).join("\n\n")
    }
  } catch {
    return { _tag: "scanned", pageCount }
  }
}
