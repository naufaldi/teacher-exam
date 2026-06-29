import { NodeContext } from "@effect/platform-node"
import { Effect, Layer, Match } from "effect"
import { createPdfUpload } from "../../lib/pdf-upload-service"
import { AuthService } from "../services/auth-service"
import { databaseRuntime, getSharedDatabaseLayer } from "../services/bootstrap-db"
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
    return Match.value(result.left).pipe(
      Match.tag("PdfUploadValidationError", (err) => Response.json({ error: err.message }, { status: err.status })),
      Match.tag("ObjectStorageError", (err) => Response.json({ error: err.message }, { status: 503 })),
      Match.tag("ApiDatabaseError", () => Response.json({ error: "Database error" }, { status: 500 })),
      Match.orElse(() => Response.json({ error: "Upload failed" }, { status: 500 }))
    )
  }

  return Response.json(result.right, { status: 201 })
}
