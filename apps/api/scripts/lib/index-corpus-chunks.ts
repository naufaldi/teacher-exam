import { documentChunks } from "@teacher-exam/db"
import type { CurriculumSourceManifestItem, ExamSubject } from "@teacher-exam/shared"
import { and, eq } from "drizzle-orm"
import { Effect } from "effect"
import type { ApiDatabaseError } from "../../src/api/errors/http.js"
import { runDb } from "../../src/api/lib/db-effect.js"
import { DbClient } from "../../src/api/services/db.js"
import { chunkCorpusMarkdown } from "../../src/lib/retrieval/chunk-text.js"
import { embedText } from "../../src/lib/retrieval/embed.js"

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

export function corpusDocId(subject: string, grade: number): string {
  return `corpus:${subject}:${grade}`
}

export function buildCorpusChunkRows(
  subject: string,
  grade: number,
  markdown: string
): ReadonlyArray<CorpusChunkInsertRow> {
  const docId = corpusDocId(subject, grade)
  const chunks = chunkCorpusMarkdown(markdown, subject, grade)
  return chunks.map((chunk) => ({
    docId,
    source: "corpus" as const,
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: [...embedText(chunk.content)]
  }))
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
        .select({ id: documentChunks.id })
        .from(documentChunks)
        .where(and(eq(documentChunks.docId, docId), eq(documentChunks.source, "corpus")))
        .limit(1)
    )
    if (existing.length > 0) {
      return { indexed: false, chunkCount: 0 }
    }

    const rows = buildCorpusChunkRows(subject, grade, markdown)
    if (rows.length === 0) {
      return { indexed: false, chunkCount: 0 }
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
