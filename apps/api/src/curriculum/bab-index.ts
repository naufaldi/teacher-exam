import { Either, Schema } from "effect"
import { createHash } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { formatBabLabel, parseBabBlocks } from "./parse-bab.js"

const MD_DIR = fileURLToPath(new URL("./md", import.meta.url))
const MANIFEST_PATH = fileURLToPath(new URL("./bab-manifest.json", import.meta.url))

export const BabManifestEntrySchema = Schema.Struct({
  bab: Schema.Number,
  title: Schema.String,
  contentHash: Schema.String
})

export const BabManifestBookSchema = Schema.Struct({
  file: Schema.String,
  babs: Schema.Array(BabManifestEntrySchema)
})

export const BabManifestSchema = Schema.Struct({
  version: Schema.Literal(1),
  books: Schema.Array(BabManifestBookSchema)
})

export type BabManifest = typeof BabManifestSchema.Type

export interface IndexedBab {
  readonly bab: number
  readonly title: string
  readonly body: string
  readonly contentHash: string
}

export interface StoredBabHash {
  readonly babNumber: string
  readonly contentHash: string
}

export interface BabManifestDrift {
  readonly file: string
  readonly bab: number
  readonly reason: "hash-mismatch" | "missing-in-manifest" | "missing-on-disk"
}

export function hashBabContent(bab: number, title: string, body: string): string {
  return createHash("sha256").update(`${bab}\n${title}\n${body}`).digest("hex")
}

export function indexMarkdownBabs(markdown: string): ReadonlyArray<IndexedBab> {
  const blocks = parseBabBlocks(markdown)
  const indexed: Array<IndexedBab> = []
  const seen = new Set<number>()
  const firstHeader = /^## Bab \d+:/m.exec(markdown)
  const preamble = (firstHeader === null ? markdown : markdown.slice(0, firstHeader.index)).trim()
  if (preamble.length > 0) {
    indexed.push({
      bab: 0,
      title: "Pembuka",
      body: preamble,
      contentHash: hashBabContent(0, "Pembuka", preamble)
    })
    seen.add(0)
  }

  for (const block of blocks) {
    if (seen.has(block.num)) continue
    seen.add(block.num)
    indexed.push({
      bab: block.num,
      title: block.title,
      body: block.body,
      contentHash: hashBabContent(block.num, block.title, block.body)
    })
  }

  return indexed
}

export function parseChosenBabNumbers(topics: ReadonlyArray<string>): ReadonlyArray<number> {
  const numbers: Array<number> = []
  for (const topic of topics) {
    const match = /^Bab\s+(\d+)/i.exec(topic.trim())
    const raw = match?.[1]
    if (raw === undefined) continue
    const bab = Number.parseInt(raw, 10)
    if (!numbers.includes(bab)) numbers.push(bab)
  }
  return numbers
}

export function selectChosenBabText(markdown: string, topics: ReadonlyArray<string>): string {
  const numbers = parseChosenBabNumbers(topics)
  if (numbers.length === 0) return markdown

  const indexed = indexMarkdownBabs(markdown)
  const sections: Array<string> = []
  for (const babNumber of numbers) {
    const bab = indexed.find((item) => item.bab === babNumber)
    if (bab === undefined) continue
    sections.push(`## ${formatBabLabel(bab.bab, bab.title)}\n${bab.body}`)
  }
  return sections.join("\n\n")
}

export function babsToRewrite(
  stored: ReadonlyArray<StoredBabHash>,
  markdown: string
): ReadonlyArray<IndexedBab> {
  const storedHash = new Map<string, string>()
  for (const row of stored) {
    if (!storedHash.has(row.babNumber)) storedHash.set(row.babNumber, row.contentHash)
  }

  return indexMarkdownBabs(markdown).filter((bab) => storedHash.get(String(bab.bab)) !== bab.contentHash)
}

export function removedBabNumbers(
  stored: ReadonlyArray<StoredBabHash>,
  markdown: string
): ReadonlyArray<number> {
  const live = new Set(indexMarkdownBabs(markdown).map((bab) => String(bab.bab)))
  const removed: Array<number> = []
  const seen = new Set<string>()
  for (const row of stored) {
    if (row.babNumber === "" || seen.has(row.babNumber) || live.has(row.babNumber)) continue
    seen.add(row.babNumber)
    const bab = Number.parseInt(row.babNumber, 10)
    if (Number.isFinite(bab)) removed.push(bab)
  }
  return removed
}

export function manifestFromMarkdownFiles(
  files: ReadonlyArray<{ file: string; markdown: string }>
): BabManifest {
  const books = [...files]
    .sort((left, right) => (left.file < right.file ? -1 : left.file > right.file ? 1 : 0))
    .map((file) => ({
      file: file.file,
      babs: indexMarkdownBabs(file.markdown)
        .map((bab) => ({
          bab: bab.bab,
          title: bab.title,
          contentHash: bab.contentHash
        }))
        .sort((left, right) => left.bab - right.bab)
    }))

  return { version: 1, books }
}

export function diffBabManifest(committed: BabManifest, actual: BabManifest): ReadonlyArray<BabManifestDrift> {
  const drift: Array<BabManifestDrift> = []
  const committedBooks = new Map(committed.books.map((book) => [book.file, book]))
  const actualBooks = new Map(actual.books.map((book) => [book.file, book]))

  for (const book of actual.books) {
    const previous = committedBooks.get(book.file)
    if (previous === undefined) {
      for (const bab of book.babs) {
        drift.push({ file: book.file, bab: bab.bab, reason: "missing-in-manifest" })
      }
      continue
    }
    const previousBabs = new Map(previous.babs.map((bab) => [bab.bab, bab]))
    for (const bab of book.babs) {
      const earlier = previousBabs.get(bab.bab)
      if (earlier === undefined) {
        drift.push({ file: book.file, bab: bab.bab, reason: "missing-in-manifest" })
        continue
      }
      if (earlier.contentHash !== bab.contentHash) {
        drift.push({ file: book.file, bab: bab.bab, reason: "hash-mismatch" })
      }
    }
  }

  for (const book of committed.books) {
    const current = actualBooks.get(book.file)
    if (current === undefined) {
      for (const bab of book.babs) {
        drift.push({ file: book.file, bab: bab.bab, reason: "missing-on-disk" })
      }
      continue
    }
    const currentBabs = new Set(current.babs.map((bab) => bab.bab))
    for (const bab of book.babs) {
      if (!currentBabs.has(bab.bab)) {
        drift.push({ file: book.file, bab: bab.bab, reason: "missing-on-disk" })
      }
    }
  }

  return drift
}

export function readBabManifestDrift(
  mdDir: string = MD_DIR,
  manifestPath: string = MANIFEST_PATH
): ReadonlyArray<BabManifestDrift> {
  const files = readdirSync(mdDir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => ({
      file,
      markdown: readFileSync(join(mdDir, file), "utf8")
    }))
  const actual = manifestFromMarkdownFiles(files)
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, "utf8"))
  const decoded = Schema.decodeUnknownEither(BabManifestSchema)(parsed)
  if (Either.isLeft(decoded)) {
    throw new Error(`Invalid bab manifest at ${manifestPath}`)
  }
  return diffBabManifest(decoded.right, actual)
}
