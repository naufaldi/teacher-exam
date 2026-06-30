import { documentChunks } from "@teacher-exam/db"
import type { ExamSubject } from "@teacher-exam/shared"
import { and, eq } from "drizzle-orm"
import { Effect } from "effect"
import { readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { ApiDatabaseError } from "../../api/errors/http.js"
import { runDb } from "../../api/lib/db-effect.js"
import { DbClient } from "../../api/services/db.js"
import { SUBJECT_SLUG } from "../curriculum.js"
import { chunkCorpusMarkdown } from "./chunk-text.js"
import { embedText } from "./embed.js"

const SLUG_TO_SUBJECT = Object.fromEntries(
  Object.entries(SUBJECT_SLUG).map(([subject, slug]) => [slug, subject as ExamSubject])
) as Record<string, ExamSubject>

export interface CurriculumMdTarget {
  readonly subject: ExamSubject
  readonly grade: number
  readonly path: string
}

export function parseCurriculumMdFilename(
  filename: string
): { subject: ExamSubject; grade: number } | null {
  const match = /^(.+)-kelas-(\d+)\.md$/.exec(filename)
  if (match === null) return null
  const slug = match[1]
  const subject = slug !== undefined ? SLUG_TO_SUBJECT[slug] : undefined
  if (subject === undefined) return null
  const grade = Number.parseInt(match[2] ?? "", 10)
  if (!Number.isFinite(grade) || grade < 1 || grade > 6) return null
  return { subject, grade }
}

export function corpusDocId(subject: ExamSubject, grade: number): string {
  return `corpus:${subject}:${grade}`
}

export async function listCurriculumMdTargets(mdDir: string): Promise<Array<CurriculumMdTarget>> {
  const entries = await readdir(mdDir, { withFileTypes: true })
  const targets: Array<CurriculumMdTarget> = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue
    const parsed = parseCurriculumMdFilename(entry.name)
    if (parsed === null) continue
    targets.push({
      subject: parsed.subject,
      grade: parsed.grade,
      path: join(mdDir, entry.name)
    })
  }
  return targets.sort((left, right) => {
    if (left.subject !== right.subject) return left.subject.localeCompare(right.subject)
    return left.grade - right.grade
  })
}

export function buildCorpusChunkRows(
  markdown: string,
  subject: ExamSubject,
  grade: number
): Array<{
  docId: string
  source: "corpus"
  content: string
  metadata: Record<string, unknown>
  embedding: Array<number>
}> {
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

export function indexCorpusMarkdownForTarget(
  target: CurriculumMdTarget,
  markdown: string
): Effect.Effect<number, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const rows = buildCorpusChunkRows(markdown, target.subject, target.grade)
    const docId = corpusDocId(target.subject, target.grade)
    yield* runDb(
      db
        .delete(documentChunks)
        .where(and(eq(documentChunks.docId, docId), eq(documentChunks.source, "corpus")))
    )
    if (rows.length === 0) return 0
    yield* runDb(db.insert(documentChunks).values(rows))
    return rows.length
  })
}

export function indexCurriculumMdDirectory(
  mdDir: string
): Effect.Effect<{ indexed: number; chunks: number }, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const targets = yield* Effect.tryPromise({
      try: () => listCurriculumMdTargets(mdDir),
      catch: (cause) =>
        new ApiDatabaseError({
          error: `Failed to list curriculum markdown: ${String(cause)}`,
          code: "DATABASE_ERROR"
        })
    })

    let indexed = 0
    let chunks = 0
    for (const target of targets) {
      const markdown = yield* Effect.tryPromise({
        try: () => readFile(target.path, "utf8"),
        catch: (cause) =>
          new ApiDatabaseError({
            error: `Failed to read ${target.path}: ${String(cause)}`,
            code: "DATABASE_ERROR"
          })
      })
      const inserted = yield* indexCorpusMarkdownForTarget(target, markdown)
      if (inserted > 0) {
        indexed += 1
        chunks += inserted
      }
    }
    return { indexed, chunks }
  })
}

export function defaultCurriculumMdDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "curriculum", "md")
}
