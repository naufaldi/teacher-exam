import type { SqlClient } from "@effect/sql/SqlClient"
import { pdfUploads } from "@teacher-exam/db"
import {
  type PdfUploadDetail,
  PdfUploadIdSchema,
  type PdfUploadListResponse,
  type PdfUploadResponse,
  type PdfUploadSummary
} from "@teacher-exam/shared"
import { and, desc, eq, isNull } from "drizzle-orm"
import { Data, Effect, Schema } from "effect"
import type { ApiDatabaseError } from "../api/errors/http"
import { runDb } from "../api/lib/db-effect"
import { DbClient } from "../api/services/db"
import type { ObjectStorageError } from "../api/services/object-storage"
import { ObjectStorage } from "../api/services/object-storage"
import { enqueueIngestJob, runIngestJob } from "../jobs/ingest-worker"
import { buildPdfStorageKey } from "./pdf-storage-keys"

const MAX_PDF_BYTES = 10 * 1024 * 1024

export class PdfUploadValidationError extends Data.TaggedError("PdfUploadValidationError")<{
  status: 400 | 403 | 404 | 409 | 413 | 415
  message: string
}> {}

export function validatePdfUploadFile(file: File): Effect.Effect<Buffer, PdfUploadValidationError> {
  return Effect.gen(function*() {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return yield* Effect.fail(
        new PdfUploadValidationError({ status: 415, message: "Hanya file PDF yang didukung." })
      )
    }
    if (file.size > MAX_PDF_BYTES) {
      return yield* Effect.fail(
        new PdfUploadValidationError({ status: 413, message: "Ukuran PDF maksimal 10 MB." })
      )
    }
    const bytes = Buffer.from(yield* Effect.promise(() => file.arrayBuffer()))
    if (bytes.length === 0) {
      return yield* Effect.fail(
        new PdfUploadValidationError({ status: 415, message: "File PDF kosong." })
      )
    }
    return bytes
  })
}

function toSummary(row: typeof pdfUploads.$inferSelect): PdfUploadSummary {
  return {
    id: Schema.decodeSync(PdfUploadIdSchema)(row.id),
    status: row.status,
    filename: row.fileName,
    fileSize: row.fileSize,
    createdAt: row.uploadedAt.toISOString(),
    ...(row.readyAt ? { readyAt: row.readyAt.toISOString() } : {})
  }
}

export function listPdfUploads(userId: string): Effect.Effect<PdfUploadListResponse, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const rows = yield* runDb(
      db
        .select()
        .from(pdfUploads)
        .where(and(eq(pdfUploads.userId, userId), isNull(pdfUploads.deletedAt)))
        .orderBy(desc(pdfUploads.uploadedAt))
    )
    return { items: rows.map((row) => toSummary(row)) }
  })
}

export function getPdfUploadDetail(
  userId: string,
  pdfUploadId: string
): Effect.Effect<PdfUploadDetail, PdfUploadValidationError | ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const rows = yield* runDb(
      db
        .select()
        .from(pdfUploads)
        .where(and(eq(pdfUploads.id, pdfUploadId), isNull(pdfUploads.deletedAt)))
        .limit(1)
    )
    const row = rows[0]
    if (!row || row.userId !== userId) {
      return yield* Effect.fail(
        new PdfUploadValidationError({ status: 404, message: "PDF tidak ditemukan." })
      )
    }
    return {
      id: Schema.decodeSync(PdfUploadIdSchema)(row.id),
      status: row.status,
      filename: row.fileName,
      ...(row.pageCount !== null ? { pageCount: row.pageCount } : {}),
      ...(row.errorMessage ? { errorMessage: row.errorMessage } : {}),
      createdAt: row.uploadedAt.toISOString(),
      ...(row.readyAt ? { readyAt: row.readyAt.toISOString() } : {})
    }
  })
}

export function softDeletePdfUpload(
  userId: string,
  pdfUploadId: string
): Effect.Effect<void, PdfUploadValidationError | ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const rows = yield* runDb(
      db
        .select()
        .from(pdfUploads)
        .where(and(eq(pdfUploads.id, pdfUploadId), isNull(pdfUploads.deletedAt)))
        .limit(1)
    )
    const row = rows[0]
    if (!row || row.userId !== userId) {
      return yield* Effect.fail(
        new PdfUploadValidationError({ status: 404, message: "PDF tidak ditemukan." })
      )
    }
    yield* runDb(
      db
        .update(pdfUploads)
        .set({ deletedAt: new Date() })
        .where(eq(pdfUploads.id, pdfUploadId))
    )
  })
}

export function createPdfUpload(
  userId: string,
  file: File
): Effect.Effect<
  PdfUploadResponse,
  PdfUploadValidationError | ObjectStorageError | ApiDatabaseError,
  DbClient | ObjectStorage | SqlClient
> {
  return Effect.gen(function*() {
    const bytes = yield* validatePdfUploadFile(file)
    const db = yield* DbClient
    const storage = yield* ObjectStorage
    const docId = crypto.randomUUID()
    const brandedId = Schema.decodeSync(PdfUploadIdSchema)(docId)
    const storageKey = buildPdfStorageKey(userId, docId)
    const now = new Date()

    yield* storage.putObject(storageKey, bytes, "application/pdf")

    yield* runDb(
      db.insert(pdfUploads).values({
        id: docId,
        userId,
        fileName: file.name,
        fileSize: bytes.length,
        storageKey,
        status: "uploaded",
        uploadedAt: now
      })
    )

    yield* enqueueIngestJob(docId)

    const syncIngest = process.env["DEV_INGEST_SYNC"] === "1" || process.env["NODE_ENV"] === "test"
    if (syncIngest) {
      const ingestResult = yield* Effect.either(runIngestJob(docId))
      if (ingestResult._tag === "Left") {
        return yield* Effect.fail(
          new PdfUploadValidationError({
            status: 415,
            message: ingestResult.left instanceof Error ? ingestResult.left.message : "Ingest gagal"
          })
        )
      }
      const detail = yield* getPdfUploadDetail(userId, docId)
      return {
        id: brandedId,
        status: detail.status,
        filename: file.name,
        createdAt: now.toISOString()
      }
    }

    return {
      id: brandedId,
      status: "processing" as const,
      filename: file.name,
      createdAt: now.toISOString()
    }
  })
}

export function loadReadyPdfUpload(
  userId: string,
  pdfUploadId: string
): Effect.Effect<
  { bytes: Buffer; fileName: string },
  PdfUploadValidationError | ObjectStorageError | ApiDatabaseError,
  DbClient | ObjectStorage
> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const storage = yield* ObjectStorage

    const rows = yield* runDb(
      db
        .select()
        .from(pdfUploads)
        .where(eq(pdfUploads.id, pdfUploadId))
        .limit(1)
    )
    const row = rows[0]
    if (!row || row.userId !== userId || row.deletedAt !== null) {
      return yield* Effect.fail(
        new PdfUploadValidationError({ status: 404, message: "PDF tidak ditemukan." })
      )
    }
    if (row.status === "processing" || row.status === "uploaded") {
      return yield* Effect.fail(
        new PdfUploadValidationError({ status: 409, message: "PDF masih diproses." })
      )
    }
    if (row.status === "failed") {
      return yield* Effect.fail(
        new PdfUploadValidationError({
          status: 409,
          message: "PDF gagal diproses. Upload ulang atau hapus dari perpustakaan."
        })
      )
    }
    if (row.status !== "ready") {
      return yield* Effect.fail(
        new PdfUploadValidationError({ status: 409, message: "PDF masih diproses." })
      )
    }

    const bytes = yield* storage.getObject(row.storageKey)
    return { bytes, fileName: row.fileName }
  })
}
