import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { describe, expect, it, type Mock, vi } from "vitest"
import { makeQueryEffect } from "../../__test__/mock-db.js"
import { type AppDb, DbClient } from "../../api/services/db.js"
import { ObjectStorage } from "../../api/services/object-storage.js"
import { softDeletePdfUpload } from "../pdf-upload-service.js"

const userId = "user-test-1"
const pdfUploadId = "pdf-upload-test-1"
const storageKey = "documents/user-test-1/pdf-upload-test-1/original.pdf"

describe("softDeletePdfUpload", () => {
  it("deletes the object from storage after soft-deleting the row", async () => {
    const deleteObject = vi.fn((_key: string) => Effect.void)
    const row = {
      id: pdfUploadId,
      userId,
      storageKey,
      deletedAt: null,
      fileName: "worksheet.pdf",
      fileSize: 100,
      status: "ready" as const,
      uploadedAt: new Date(),
      readyAt: new Date(),
      pageCount: 1,
      errorMessage: null
    }
    ;(db.select as Mock).mockReturnValue(makeQueryEffect([row]))
    ;(db.update as Mock).mockReturnValue(makeQueryEffect(undefined))

    const testLayer = Layer.mergeAll(
      Layer.succeed(DbClient, db as AppDb),
      Layer.succeed(ObjectStorage, {
        putObject: () => Effect.void,
        getObject: () => Effect.succeed(Buffer.from("%PDF-1.4")),
        deleteObject
      })
    )

    await Effect.runPromise(
      softDeletePdfUpload(userId, pdfUploadId).pipe(Effect.provide(testLayer))
    )

    expect(db.update).toHaveBeenCalled()
    expect(deleteObject).toHaveBeenCalledWith(storageKey)
  })
})
