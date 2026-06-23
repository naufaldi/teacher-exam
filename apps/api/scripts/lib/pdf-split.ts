import { readFile } from "node:fs/promises"
import { PDFDocument } from "pdf-lib"

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

export interface PageSizeChunkInput {
  pageSizes: ReadonlyArray<number>
  maxPagesPerChunk?: number
  overlapPages?: number
  maxBytesPerChunk?: number
}

const PAGES_PER_CHUNK = 60
const OVERLAP_PAGES = 5
const SAFE_CHUNK_BYTES = 18 * 1024 * 1024

/**
 * Build a new PDF buffer containing only the given inclusive 1-indexed page
 * range from the loaded source document.
 */
export async function extractPageRange(
  src: PDFDocument,
  startPage: number,
  endPage: number
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
export function planChunks(doc: PDFDocument): Array<PdfChunkRange> {
  return planChunksFromPageSizes({
    maxBytesPerChunk: Number.POSITIVE_INFINITY,
    pageSizes: Array.from({ length: doc.getPageCount() }, () => 1)
  })
}

export function planChunksFromPageSizes(input: PageSizeChunkInput): Array<PdfChunkRange> {
  const totalPages = input.pageSizes.length
  if (totalPages === 0) return []

  const maxPagesPerChunk = input.maxPagesPerChunk ?? PAGES_PER_CHUNK
  const overlapPages = input.overlapPages ?? OVERLAP_PAGES
  const maxBytesPerChunk = input.maxBytesPerChunk ?? SAFE_CHUNK_BYTES
  const ranges: Array<Omit<PdfChunkRange, "total">> = []
  let start = 0

  while (start < totalPages) {
    let end = start
    let bytes = 0
    while (end < totalPages && end - start < maxPagesPerChunk) {
      const nextBytes = bytes + (input.pageSizes[end] ?? 0)
      if (end > start && nextBytes > maxBytesPerChunk) break
      bytes = nextBytes
      end += 1
    }

    if (end === start) end += 1
    ranges.push({ index: ranges.length + 1, startPage: start + 1, endPage: end })
    if (end >= totalPages) break

    const chunkLength = end - start
    const safeOverlap = Math.min(overlapPages, Math.max(0, chunkLength - 1))
    start = Math.max(end - safeOverlap, start + 1)
  }

  return ranges.map((r) => ({ ...r, total: ranges.length }))
}

export async function planChunksBySize(doc: PDFDocument): Promise<Array<PdfChunkRange>> {
  const total = doc.getPageCount()
  const pageSizes: Array<number> = []
  for (let page = 1; page <= total; page += 1) {
    pageSizes.push((await extractPageRange(doc, page, page)).byteLength)
  }
  return planChunksFromPageSizes({ pageSizes })
}

/**
 * Load a PDF document once so callers can plan chunks and build sub-chunks
 * via `extractPageRange` without re-reading the file from disk.
 */
export async function loadPdfDocument(path: string): Promise<PDFDocument> {
  return PDFDocument.load(await readFile(path))
}
