import { NodeContext } from "@effect/platform-node"
import { Layer } from "effect"
import type { ObjectStorage } from "./object-storage"
import { FilesystemObjectStorageLive } from "./object-storage-filesystem"
import { R2ObjectStorageLive } from "./object-storage-r2"

export type ObjectStorageBackend = "filesystem" | "r2"

export function resolveObjectStorageBackend(): ObjectStorageBackend {
  const backend = process.env["OBJECT_STORAGE_BACKEND"]?.trim().toLowerCase() ?? "filesystem"
  if (backend === "filesystem" || backend === "r2") {
    return backend
  }
  throw new Error(`Invalid OBJECT_STORAGE_BACKEND: ${backend}. Expected "filesystem" or "r2".`)
}

export function createObjectStorageLayer(): Layer.Layer<ObjectStorage> {
  const backend = resolveObjectStorageBackend()
  if (backend === "r2") {
    return R2ObjectStorageLive
  }
  return FilesystemObjectStorageLive.pipe(Layer.provide(NodeContext.layer))
}

/** Production/dev selector: filesystem locally, R2 when OBJECT_STORAGE_BACKEND=r2. */
export const ObjectStorageLive = createObjectStorageLayer()
