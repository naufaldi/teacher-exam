import { NodeContext } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import type { PdfUploadValidationError } from "../../lib/pdf-upload-service"
import { createPdfUpload, getPdfUploadDetail, listPdfUploads, softDeletePdfUpload } from "../../lib/pdf-upload-service"
import type { ApiDatabaseError } from "../errors/http"
import { AuthService } from "../services/auth-service"
import { databaseRuntime, getSharedDatabaseLayer } from "../services/bootstrap-db"
import type { ObjectStorageError } from "../services/object-storage"
import { FilesystemObjectStorageLive } from "../services/object-storage-filesystem"

function buildPdfUploadLayer() {
  return Layer.mergeAll(
    getSharedDatabaseLayer(),
    FilesystemObjectStorageLive.pipe(Layer.provide(NodeContext.layer))
  )
}

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const { AuthServiceLive } = await import("../services/auth-service.js")
  const headers = new Headers(request.headers)
  const program = Effect.gen(function*() {
    const auth = yield* AuthService
    const session = yield* auth.getSession(headers)
    return session?.user?.id ?? null
  }).pipe(Effect.provide(AuthServiceLive))

  return databaseRuntime.runPromise(program)
}

function mapPdfUploadError(left: PdfUploadValidationError | ObjectStorageError | ApiDatabaseError): Response {
  if (left._tag === "PdfUploadValidationError") {
    return Response.json({ error: left.message }, { status: left.status })
  }
  if (left._tag === "ObjectStorageError") {
    return Response.json({ error: left.message }, { status: 503 })
  }
  return Response.json({ error: "Database error" }, { status: 500 })
}

export async function handlePdfUploadGetList(request: Request): Promise<Response> {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await databaseRuntime.runPromise(
    listPdfUploads(userId).pipe(Effect.either, Effect.provide(buildPdfUploadLayer()))
  )
  if (result._tag === "Left") {
    return mapPdfUploadError(result.left)
  }
  return Response.json(result.right, { status: 200 })
}

export async function handlePdfUploadGetDetail(request: Request, pdfUploadId: string): Promise<Response> {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await databaseRuntime.runPromise(
    getPdfUploadDetail(userId, pdfUploadId).pipe(Effect.either, Effect.provide(buildPdfUploadLayer()))
  )
  if (result._tag === "Left") {
    return mapPdfUploadError(result.left)
  }
  return Response.json(result.right, { status: 200 })
}

export async function handlePdfUploadDelete(request: Request, pdfUploadId: string): Promise<Response> {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await databaseRuntime.runPromise(
    softDeletePdfUpload(userId, pdfUploadId).pipe(Effect.either, Effect.provide(buildPdfUploadLayer()))
  )
  if (result._tag === "Left") {
    return mapPdfUploadError(result.left)
  }
  return new Response(null, { status: 204 })
}

export async function handlePdfUploadPost(request: Request): Promise<Response> {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: "Invalid multipart body" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return Response.json({ error: "Field file wajib berisi PDF." }, { status: 400 })
  }

  const result = await databaseRuntime.runPromise(
    createPdfUpload(userId, file).pipe(Effect.either, Effect.provide(buildPdfUploadLayer()))
  )

  if (result._tag === "Left") {
    return mapPdfUploadError(result.left)
  }

  return Response.json(result.right, { status: 201 })
}
