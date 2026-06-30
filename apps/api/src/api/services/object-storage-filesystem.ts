import * as FileSystem from "@effect/platform/FileSystem"
import { Effect, Layer } from "effect"
import { dirname, join } from "node:path"
import { ObjectStorage, ObjectStorageError, type ObjectStorageService } from "./object-storage"

function resolveUploadRoot(): string {
  return process.env["UPLOAD_DIR"]?.trim() || "./uploads"
}

export const FilesystemObjectStorageLive = Layer.effect(
  ObjectStorage,
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const root = resolveUploadRoot()

    const putObject = (key: string, data: Buffer, _contentType: string) =>
      Effect.gen(function*() {
        const fullPath = join(root, key)
        yield* fs.makeDirectory(dirname(fullPath), { recursive: true }).pipe(
          Effect.mapError((err) => new ObjectStorageError({ message: "Failed to create upload directory", cause: err }))
        )
        yield* fs.writeFile(fullPath, data).pipe(
          Effect.mapError((err) => new ObjectStorageError({ message: "Failed to write upload file", cause: err }))
        )
      })

    const getObject = (key: string) =>
      Effect.gen(function*() {
        const fullPath = join(root, key)
        const exists = yield* fs.exists(fullPath).pipe(
          Effect.mapError((err) => new ObjectStorageError({ message: "Failed to check upload file", cause: err }))
        )
        if (!exists) {
          return yield* Effect.fail(new ObjectStorageError({ message: `Object not found: ${key}` }))
        }
        const bytes = Buffer.from(
          yield* fs.readFile(fullPath).pipe(
            Effect.mapError((err) => new ObjectStorageError({ message: "Failed to read upload file", cause: err }))
          )
        )
        return bytes
      })

    const deleteObject = (key: string) =>
      Effect.gen(function*() {
        const fullPath = join(root, key)
        const exists = yield* fs.exists(fullPath).pipe(
          Effect.mapError((err) => new ObjectStorageError({ message: "Failed to check upload file", cause: err }))
        )
        if (!exists) return
        yield* fs.remove(fullPath).pipe(
          Effect.mapError((err) => new ObjectStorageError({ message: "Failed to delete upload file", cause: err }))
        )
      })

    return { putObject, getObject, deleteObject } satisfies ObjectStorageService
  })
)
