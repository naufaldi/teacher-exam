import type { Effect } from "effect"
import { Context, Data } from "effect"

export class ObjectStorageError extends Data.TaggedError("ObjectStorageError")<{
  message: string
  cause?: unknown
}> {}

export interface ObjectStorageService {
  readonly putObject: (key: string, data: Buffer, contentType: string) => Effect.Effect<void, ObjectStorageError>
  readonly getObject: (key: string) => Effect.Effect<Buffer, ObjectStorageError>
  readonly deleteObject: (key: string) => Effect.Effect<void, ObjectStorageError>
}

export class ObjectStorage extends Context.Tag("ObjectStorage")<ObjectStorage, ObjectStorageService>() {}
