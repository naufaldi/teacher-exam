import { documentChunks } from "@teacher-exam/db"
import type { CurriculumSourceManifestItem, ExamSubject } from "@teacher-exam/shared"
import { and, eq, inArray } from "drizzle-orm"
import { Effect } from "effect"
import type { ApiDatabaseError } from "../../api/errors/http.js"
import { runDb } from "../../api/lib/db-effect.js"
import { DbClient } from "../../api/services/db.js"
import { babsToRewrite, type IndexedBab, indexMarkdownBabs, removedBabNumbers } from "../../curriculum/bab-index.js"
import { formatBabLabel } from "../../curriculum/parse-bab.js"
import { chunkText } from "./chunk-text.js"
import { embedText } from "./embed.js"

export interface CorpusChunkInsertRow {
  readonly docId: string
  readonly source: "corpus"
  readonly content: string
  readonly metadata: Record<string, unknown>
  readonly embedding: ReadonlyArray<number>
}

export interface CorpusIndexTarget {
  readonly subjectKey: ExamSubject
  readonly grade: number
}

export interface CorpusIndexResult {
  readonly indexed: boolean
  readonly chunkCount: number
}

interface StoredChunk {
  readonly id: string
  readonly babNumber: string
  readonly contentHash: string
}

export function corpusDocId(subject: string, grade: number): string {
  return `corpus:${subject}:${grade}`
}

function sectionForBab(bab: IndexedBab): string {
  if (bab.bab === 0) return bab.body
  return `## ${formatBabLabel(bab.bab, bab.title)}\n${bab.body}`
}

export function buildBabChunkRows(
  subject: string,
  grade: number,
  bab: IndexedBab
): ReadonlyArray<CorpusChunkInsertRow> {
  const docId = corpusDocId(subject, grade)
  const babHint = bab.bab === 0 ? "Pembuka" : formatBabLabel(bab.bab, bab.title)
  const chunks = chunkText(sectionForBab(bab), {
    subject,
    grade,
    babHint,
    babNumber: String(bab.bab),
    contentHash: bab.contentHash
  })
  return chunks.map((chunk) => ({
    docId,
    source: "corpus" as const,
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: [...embedText(chunk.content)]
  }))
}

export function buildCorpusChunkRows(
  subject: string,
  grade: number,
  markdown: string
): ReadonlyArray<CorpusChunkInsertRow> {
  return indexMarkdownBabs(markdown).flatMap((bab) => buildBabChunkRows(subject, grade, bab))
}

export function listReadyCorpusTargets(
  manifest: ReadonlyArray<CurriculumSourceManifestItem>
): ReadonlyArray<CorpusIndexTarget> {
  return manifest
    .filter((entry): entry is CurriculumSourceManifestItem & { subjectKey: ExamSubject } =>
      entry.status === "ready" && entry.sourceType === "sibi_pdf"
    )
    .map((entry) => ({
      subjectKey: entry.subjectKey,
      grade: entry.grade
    }))
}

function storedChunks(
  rows: ReadonlyArray<{ id: string; metadata: Record<string, unknown> | null }>
): ReadonlyArray<StoredChunk> {
  return rows.map((row) => {
    const metadata = row.metadata ?? {}
    const babNumber = metadata["babNumber"]
    const contentHash = metadata["contentHash"]
    return {
      id: row.id,
      babNumber: typeof babNumber === "string" || typeof babNumber === "number" ? String(babNumber) : "",
      contentHash: typeof contentHash === "string" ? contentHash : ""
    }
  })
}

export function indexCorpusSubjectGrade(
  subject: ExamSubject,
  grade: number,
  markdown: string
): Effect.Effect<CorpusIndexResult, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const docId = corpusDocId(subject, grade)
    const existing = yield* runDb(
      db
        .select({ id: documentChunks.id, metadata: documentChunks.metadata })
        .from(documentChunks)
        .where(and(eq(documentChunks.docId, docId), eq(documentChunks.source, "corpus")))
    )
    const stored = storedChunks(existing)
    const legacy = stored.length > 0 && stored.some((row) => row.contentHash === "")
    const rewrite = legacy ? indexMarkdownBabs(markdown) : babsToRewrite(stored, markdown)
    const removed = legacy ? [] : removedBabNumbers(stored, markdown)
    if (rewrite.length === 0 && removed.length === 0) {
      return { indexed: false, chunkCount: 0 }
    }

    const staleBabNumbers = new Set<string>([
      ...rewrite.map((bab) => String(bab.bab)),
      ...removed.map((bab) => String(bab))
    ])
    const ids = legacy
      ? stored.map((row) => row.id)
      : stored.filter((row) => staleBabNumbers.has(row.babNumber)).map((row) => row.id)
    if (ids.length > 0) {
      yield* runDb(db.delete(documentChunks).where(inArray(documentChunks.id, [...ids])))
    }

    const rows = rewrite.flatMap((bab) => buildBabChunkRows(subject, grade, bab))
    if (rows.length === 0) {
      return { indexed: true, chunkCount: 0 }
    }

    yield* runDb(
      db.insert(documentChunks).values(
        rows.map((row) => ({
          docId: row.docId,
          source: row.source,
          content: row.content,
          metadata: row.metadata,
          embedding: [...row.embedding]
        }))
      )
    )
    return { indexed: true, chunkCount: rows.length }
  })
}
