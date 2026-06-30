import type { SqlClient } from "@effect/sql/SqlClient"
import { documentChunks } from "@teacher-exam/db"
import type { SourceMode } from "@teacher-exam/shared"
import { and, eq } from "drizzle-orm"
import { Data, Effect } from "effect"
import type { ApiDatabaseError } from "../../api/errors/http"
import { runDb } from "../../api/lib/db-effect"
import type { CurriculumReadError } from "../../api/services/curriculum-service"
import { CurriculumService } from "../../api/services/curriculum-service"
import { DbClient } from "../../api/services/db"
import { agenticSearch } from "./agentic-search"
import { chunkCorpusMarkdown } from "./chunk-text"
import { embedText } from "./embed"

export class InsufficientMateriError extends Data.TaggedError("InsufficientMateriError")<{
  message: string
}> {}

export interface RetrievalContext {
  readonly curriculumText: string
  readonly retrievalTrace: ReadonlyArray<string>
}

export function ensureCorpusIndexed(
  subject: string,
  grade: number
): Effect.Effect<void, ApiDatabaseError | CurriculumReadError, DbClient | CurriculumService> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const docId = `corpus:${subject}:${grade}`
    const existing = yield* runDb(
      db
        .select({ id: documentChunks.id })
        .from(documentChunks)
        .where(and(eq(documentChunks.docId, docId), eq(documentChunks.source, "corpus")))
        .limit(1)
    )
    if (existing.length > 0) return

    const curriculum = yield* CurriculumService
    const markdown = yield* curriculum.getText(subject as never, grade as never)
    const chunks = chunkCorpusMarkdown(markdown, subject, grade)
    if (chunks.length === 0) return

    yield* runDb(
      db.insert(documentChunks).values(
        chunks.map((chunk) => ({
          docId,
          source: "corpus" as const,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding: [...embedText(chunk.content)]
        }))
      )
    )
  })
}

export function resolveRetrievalContext(input: {
  sourceMode: SourceMode
  subject: string
  grade: number
  topics: ReadonlyArray<string>
  freeTopic?: string | undefined
  pdfUploadId?: string | undefined
}): Effect.Effect<
  RetrievalContext,
  ApiDatabaseError | CurriculumReadError | InsufficientMateriError,
  DbClient | SqlClient | CurriculumService
> {
  return Effect.gen(function*() {
    const query = input.sourceMode === "pdf_guru"
      ? (input.freeTopic?.trim() ?? input.topics.join(" "))
      : input.topics.join(" ")

    if (input.sourceMode === "pdf_guru") {
      if (!input.pdfUploadId) {
        return yield* Effect.fail(new InsufficientMateriError({ message: "PDF materi wajib dipilih." }))
      }
      const { material, trace } = yield* agenticSearch({
        query,
        docIds: [input.pdfUploadId],
        source: "teacher_pdf"
      })
      if (material.trim().length < 50) {
        return yield* Effect.fail(new InsufficientMateriError({ message: "Materi PDF tidak cukup untuk topik ini." }))
      }
      return { curriculumText: material, retrievalTrace: trace }
    }

    yield* ensureCorpusIndexed(input.subject, input.grade).pipe(Effect.catchAll(() => Effect.void))
    const corpusDocId = `corpus:${input.subject}:${input.grade}`
    const babNumbers = input.topics
      .map((topic) => /^Bab\s+(\d+)/i.exec(topic)?.[1])
      .filter((bab): bab is string => bab !== undefined)

    const corpusResult = yield* agenticSearch({
      query,
      docIds: [corpusDocId],
      source: "corpus",
      babNumbers: babNumbers.length > 0 ? babNumbers : undefined
    })

    let combined = corpusResult.material
    const trace = [...corpusResult.trace]

    if (input.sourceMode === "combine" && input.pdfUploadId) {
      const pdfResult = yield* agenticSearch({
        query,
        docIds: [input.pdfUploadId],
        source: "teacher_pdf"
      })
      combined = `${combined}\n\n--- Materi PDF Guru ---\n\n${pdfResult.material}`
      for (const step of pdfResult.trace) {
        trace.push(step)
      }
    }

    if (combined.trim().length < 50) {
      const curriculum = yield* CurriculumService
      const fullText = yield* curriculum.getText(input.subject as never, input.grade as never)
      return { curriculumText: fullText, retrievalTrace: [...trace, "fallback:full-corpus"] }
    }

    return { curriculumText: combined, retrievalTrace: trace }
  })
}
