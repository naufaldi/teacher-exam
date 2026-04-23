import { PDFDocument } from 'pdf-lib'
import { readFile } from 'node:fs/promises'

/**
 * One slice of a source PDF that fits inside Anthropic's per-document-block
 * limit (100 pages / 32 MB). Pages are 1-indexed and inclusive of the source.
 */
export interface PdfChunkRange {
  index: number
  total: number
  startPage: number
  endPage: number
}

const PAGES_PER_CHUNK = 60
const OVERLAP_PAGES = 5

/**
 * Build a new PDF buffer containing only the given inclusive 1-indexed page
 * range from the loaded source document.
 */
export async function extractPageRange(
  src: PDFDocument,
  startPage: number,
  endPage: number,
): Promise<Buffer> {
  const total = src.getPageCount()
  if (startPage < 1 || endPage > total || startPage > endPage) {
    throw new Error(`invalid page range ${startPage}-${endPage} (source has ${total} pages)`)
  }
  const out = await PDFDocument.create()
  const indices = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage - 1 + i)
  const copied = await out.copyPages(src, indices)
  for (const p of copied) out.addPage(p)
  return Buffer.from(await out.save())
}

/**
 * Plan overlapping page-range chunks bounded by `PAGES_PER_CHUNK`. Pure
 * computation over an already-loaded document — callers materialize bytes on
 * demand via `extractPageRange`.
 */
export function planChunks(doc: PDFDocument): PdfChunkRange[] {
  const total = doc.getPageCount()

  if (total <= PAGES_PER_CHUNK) {
    return [{ index: 1, total: 1, startPage: 1, endPage: total }]
  }

  const ranges: Array<Omit<PdfChunkRange, 'total'>> = []
  let start = 0
  while (start < total) {
    const end = Math.min(start + PAGES_PER_CHUNK, total)
    ranges.push({ index: ranges.length + 1, startPage: start + 1, endPage: end })
    if (end >= total) break
    start = end - OVERLAP_PAGES
  }

  return ranges.map((r) => ({ ...r, total: ranges.length }))
}

/**
 * Load a PDF document once so callers can plan chunks and build sub-chunks
 * via `extractPageRange` without re-reading the file from disk.
 */
export async function loadPdfDocument(path: string): Promise<PDFDocument> {
  return PDFDocument.load(await readFile(path))
}
