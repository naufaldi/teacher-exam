import { SqlClient } from "@effect/sql/SqlClient"
import { documentChunks, ingestJobs, pdfUploads } from "@teacher-exam/db"
import { and, eq, inArray } from "drizzle-orm"
import { Data, Effect } from "effect"
import type { ApiDatabaseError } from "../api/errors/http"
import { runDb } from "../api/lib/db-effect"
import { DbClient } from "../api/services/db"
import type { ObjectStorageError } from "../api/services/object-storage"
import { ObjectStorage } from "../api/services/object-storage"
import { extractPdfText } from "../lib/pdf-text-extract"
import { chunkText } from "../lib/retrieval/chunk-text"
import { embedText } from "../lib/retrieval/embed"

export class IngestJobError extends Data.TaggedError("IngestJobError")<{
  message: string
}> {}

export function enqueueIngestJob(
  pdfUploadId: string
): Effect.Effect<string, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const jobId = crypto.randomUUID()
    yield* runDb(
      db.insert(ingestJobs).values({
        id: jobId,
        pdfUploadId,
        status: "queued"
      })
    )
    return jobId
  })
}

function markIngestFailed(
  pdfUploadId: string,
  jobId: string | undefined,
  message: string
): Effect.Effect<void, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const finishedAt = new Date()
    yield* runDb(
      db
        .update(pdfUploads)
        .set({ status: "failed", errorMessage: message })
        .where(eq(pdfUploads.id, pdfUploadId))
    )
    if (jobId !== undefined) {
      yield* runDb(
        db
          .update(ingestJobs)
          .set({ status: "failed", error: message, finishedAt })
          .where(eq(ingestJobs.id, jobId))
      )
    }
  })
}

export function runIngestJob(
  pdfUploadId: string
): Effect.Effect<
  void,
  IngestJobError | ApiDatabaseError | ObjectStorageError,
  DbClient | ObjectStorage | SqlClient
> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const sql = yield* SqlClient
    const storage = yield* ObjectStorage

    const rows = yield* runDb(
      db.select().from(pdfUploads).where(eq(pdfUploads.id, pdfUploadId)).limit(1)
    )
    const row = rows[0]
    if (!row || row.deletedAt !== null) {
      return yield* Effect.fail(new IngestJobError({ message: "PDF upload not found" }))
    }

    const jobRows = yield* runDb(
      db
        .select()
        .from(ingestJobs)
        .where(and(eq(ingestJobs.pdfUploadId, pdfUploadId), inArray(ingestJobs.status, ["queued", "running"])))
        .orderBy(ingestJobs.createdAt)
        .limit(1)
    )
    const job = jobRows[0]
    const jobId = job?.id
    const now = new Date()

    yield* runDb(
      db.update(pdfUploads).set({ status: "processing", errorMessage: null }).where(eq(pdfUploads.id, pdfUploadId))
    )
    if (jobId !== undefined) {
      yield* runDb(
        db.update(ingestJobs).set({ status: "running", startedAt: now }).where(eq(ingestJobs.id, jobId))
      )
    }

    const bytes = yield* storage.getObject(row.storageKey)
    const extractResult = yield* Effect.tryPromise({
      try: () => extractPdfText(bytes),
      catch: (cause) => new IngestJobError({ message: cause instanceof Error ? cause.message : String(cause) })
    })

    if (extractResult.text.trim().length < 20) {
      yield* markIngestFailed(pdfUploadId, jobId, "Tidak dapat mengekstrak teks dari PDF.")
      return yield* Effect.fail(new IngestJobError({ message: "Empty PDF text" }))
    }

    const chunks = chunkText(extractResult.text, { pageCount: extractResult.pageCount })
    const readyAt = new Date()

    yield* sql.withTransaction(
      Effect.gen(function*() {
        yield* runDb(db.delete(documentChunks).where(eq(documentChunks.docId, pdfUploadId)))

        if (chunks.length > 0) {
          yield* runDb(
            db.insert(documentChunks).values(
              chunks.map((chunk) => ({
                docId: pdfUploadId,
                source: "teacher_pdf" as const,
                content: chunk.content,
                metadata: chunk.metadata,
                embedding: [...embedText(chunk.content)]
              }))
            )
          )
        }

        yield* runDb(
          db
            .update(pdfUploads)
            .set({
              status: "ready",
              readyAt,
              pageCount: extractResult.pageCount,
              extractedText: extractResult.text.slice(0, 100_000),
              errorMessage: null
            })
            .where(eq(pdfUploads.id, pdfUploadId))
        )

        if (jobId !== undefined) {
          yield* runDb(
            db
              .update(ingestJobs)
              .set({ status: "completed", finishedAt: readyAt })
              .where(eq(ingestJobs.id, jobId))
          )
        }
      })
    ).pipe(
      Effect.mapError((cause) =>
        new IngestJobError({
          message: cause instanceof Error ? cause.message : "Gagal menyimpan hasil ingest."
        })
      )
    )
  })
}

export function processQueuedIngestJobs(
  limit = 3
): Effect.Effect<
  number,
  IngestJobError | ApiDatabaseError | ObjectStorageError,
  DbClient | ObjectStorage | SqlClient
> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const queued = yield* runDb(
      db
        .select()
        .from(ingestJobs)
        .where(eq(ingestJobs.status, "queued"))
        .orderBy(ingestJobs.createdAt)
        .limit(limit)
    )

    let processed = 0
    for (const job of queued) {
      const result = yield* Effect.either(runIngestJob(job.pdfUploadId))
      if (result._tag === "Left") {
        const message = result.left instanceof IngestJobError ? result.left.message : "Ingest failed"
        yield* markIngestFailed(job.pdfUploadId, job.id, message)
      }
      processed += 1
    }
    return processed
  })
}
