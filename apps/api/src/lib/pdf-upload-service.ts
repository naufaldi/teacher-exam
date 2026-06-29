import { pdfUploads } from "@teacher-exam/db"
import { PdfUploadIdSchema, type PdfUploadResponse } from "@teacher-exam/shared"
import { eq } from "drizzle-orm"
import { Data, Effect, Schema } from "effect"
import type { ApiDatabaseError } from "../api/errors/http"
import { runDb } from "../api/lib/db-effect"
import { DbClient } from "../api/services/db"
import type { ObjectStorageError } from "../api/services/object-storage"
import { ObjectStorage } from "../api/services/object-storage"
import { buildPdfStorageKey } from "./pdf-storage-keys"

const MAX_PDF_BYTES = 10 * 1024 * 1024

export class PdfUploadValidationError extends Data.TaggedError("PdfUploadValidationError")<{
  status: 413 | 415
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

export function createPdfUpload(
  userId: string,
  file: File
): Effect.Effect<
  PdfUploadResponse,
  PdfUploadValidationError | ObjectStorageError | ApiDatabaseError,
  DbClient | ObjectStorage
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
        status: "ready",
        readyAt: now,
        uploadedAt: now
      })
    )

    return {
      id: brandedId,
      status: "ready" as const,
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
        new PdfUploadValidationError({ status: 415, message: "PDF tidak ditemukan." })
      )
    }
    if (row.status !== "ready") {
      return yield* Effect.fail(
        new PdfUploadValidationError({ status: 415, message: "PDF masih diproses." })
      )
    }

    const bytes = yield* storage.getObject(row.storageKey)
    return { bytes, fileName: row.fileName }
  })
}
