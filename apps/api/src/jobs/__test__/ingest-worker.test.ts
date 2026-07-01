import { SqlClient } from "@effect/sql/SqlClient"
import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { File } from "node:buffer"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it, type Mock, vi } from "vitest"
import { makeQueryEffect } from "../../__test__/mock-db.js"
import { type AppDb, DbClient } from "../../api/services/db.js"
import { ObjectStorage } from "../../api/services/object-storage.js"
import { createPdfUpload, loadReadyPdfUpload } from "../../lib/pdf-upload-service.js"
import * as ingestWorker from "../ingest-worker.js"
import { runIngestJob } from "../ingest-worker.js"

const fixturePath = join(
  fileURLToPath(new URL("../../__test__/fixtures/sample-worksheet.pdf", import.meta.url))
)
const pdfBytes = readFileSync(fixturePath)
const userId = "user-ingest-test"
const pdfUploadId = "11111111-1111-4111-8111-111111111111"
const storageKey = `documents/${userId}/${pdfUploadId}/original.pdf`

const uploadRow = {
  id: pdfUploadId,
  userId,
  fileName: "sample-worksheet.pdf",
  fileSize: pdfBytes.length,
  storageKey,
  status: "uploaded" as const,
  uploadedAt: new Date("2026-06-30T00:00:00.000Z"),
  readyAt: null,
  deletedAt: null,
  pageCount: null,
  extractedText: null,
  errorMessage: null
}

const readyUploadRow = {
  ...uploadRow,
  status: "ready" as const,
  readyAt: new Date("2026-06-30T00:00:01.000Z"),
  pageCount: 1
}

const ingestJobRow = {
  id: "22222222-2222-4222-8222-222222222222",
  pdfUploadId,
  status: "queued" as const,
  createdAt: new Date("2026-06-30T00:00:00.000Z"),
  startedAt: null,
  finishedAt: null,
  error: null
}

function buildTestLayer() {
  return Layer.mergeAll(
    Layer.succeed(DbClient, db as AppDb),
    Layer.succeed(ObjectStorage, {
      putObject: () => Effect.void,
      getObject: () => Effect.succeed(pdfBytes),
      deleteObject: () => Effect.void
    }),
    Layer.succeed(SqlClient, {
      withTransaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => effect
    })
  )
}

describe("runIngestJob", () => {
  it("marks upload ready after extracting and chunking PDF text", async () => {
    ;(db.select as Mock)
      .mockReturnValueOnce(makeQueryEffect([uploadRow]))
      .mockReturnValueOnce(makeQueryEffect([ingestJobRow]))
    ;(db.update as Mock).mockReturnValue(makeQueryEffect(undefined))
    ;(db.delete as Mock).mockReturnValue(makeQueryEffect(undefined))
    ;(db.insert as Mock).mockReturnValue(makeQueryEffect(undefined))

    await Effect.runPromise(runIngestJob(pdfUploadId).pipe(Effect.provide(buildTestLayer())))

    expect(db.update).toHaveBeenCalled()
    const readyUpdate = (db.update as Mock).mock.calls.find((call) => {
      const chain = (db.update as Mock).mock.results[(db.update as Mock).mock.calls.indexOf(call)]?.value
      return chain !== undefined
    })
    expect(readyUpdate).toBeDefined()
    expect(db.insert).toHaveBeenCalled()
  })
})

describe("library reuse", () => {
  it("does not enqueue ingest when reusing a ready library PDF", async () => {
    const enqueueSpy = vi.spyOn(ingestWorker, "enqueueIngestJob").mockImplementation((id) =>
      Effect.succeed(`job-${id}`)
    )
    vi.spyOn(ingestWorker, "runIngestJob").mockImplementation(() => Effect.void)
    ;(db.select as Mock).mockReturnValue(makeQueryEffect([readyUploadRow]))
    ;(db.insert as Mock).mockReturnValue(makeQueryEffect(undefined))
    ;(db.update as Mock).mockReturnValue(makeQueryEffect(undefined))

    const layer = buildTestLayer()
    const file = new File([pdfBytes], "sample-worksheet.pdf", { type: "application/pdf" })

    await Effect.runPromise(createPdfUpload(userId, file).pipe(Effect.provide(layer)))
    expect(enqueueSpy).toHaveBeenCalledTimes(1)

    await Effect.runPromise(loadReadyPdfUpload(userId, pdfUploadId).pipe(Effect.provide(layer)))
    await Effect.runPromise(loadReadyPdfUpload(userId, pdfUploadId).pipe(Effect.provide(layer)))
    expect(enqueueSpy).toHaveBeenCalledTimes(1)

    enqueueSpy.mockRestore()
  })
})
