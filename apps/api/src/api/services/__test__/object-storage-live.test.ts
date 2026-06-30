import { NodeContext } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { ObjectStorage } from "../object-storage"
import { createObjectStorageLayer, resolveObjectStorageBackend } from "../object-storage-live"

const ENV_KEYS = [
  "OBJECT_STORAGE_BACKEND",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "UPLOAD_DIR"
] as const

const originalEnv: Record<string, string | undefined> = {}

describe("resolveObjectStorageBackend", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = originalEnv[key]
      }
    }
  })

  it("defaults to filesystem when OBJECT_STORAGE_BACKEND is unset", () => {
    delete process.env["OBJECT_STORAGE_BACKEND"]
    expect(resolveObjectStorageBackend()).toBe("filesystem")
  })

  it("accepts explicit filesystem backend", () => {
    process.env["OBJECT_STORAGE_BACKEND"] = "filesystem"
    expect(resolveObjectStorageBackend()).toBe("filesystem")
  })

  it("accepts r2 backend", () => {
    process.env["OBJECT_STORAGE_BACKEND"] = "r2"
    expect(resolveObjectStorageBackend()).toBe("r2")
  })

  it("rejects unknown backend", () => {
    process.env["OBJECT_STORAGE_BACKEND"] = "s3"
    expect(() => resolveObjectStorageBackend()).toThrow(/OBJECT_STORAGE_BACKEND/)
  })
})

describe("createObjectStorageLayer", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key]
    }
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = originalEnv[key]
      }
    }
  })

  it("provides ObjectStorage for filesystem backend", async () => {
    const uploadDir = await mkdtemp(join(tmpdir(), "object-storage-live-"))
    process.env["OBJECT_STORAGE_BACKEND"] = "filesystem"
    process.env["UPLOAD_DIR"] = uploadDir

    try {
      const layer = createObjectStorageLayer().pipe(Layer.provide(NodeContext.layer))
      const program = Effect.gen(function*() {
        const storage = yield* ObjectStorage
        yield* storage.putObject("test-key", Buffer.from("x"), "application/pdf")
      })

      await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).resolves.toBeUndefined()
    } finally {
      await rm(uploadDir, { recursive: true, force: true })
    }
  })

  it("fails fast when r2 backend is selected without R2 env vars", async () => {
    process.env["OBJECT_STORAGE_BACKEND"] = "r2"
    delete process.env["R2_ACCOUNT_ID"]
    delete process.env["R2_ACCESS_KEY_ID"]
    delete process.env["R2_SECRET_ACCESS_KEY"]
    delete process.env["R2_BUCKET_NAME"]

    const layer = createObjectStorageLayer()
    const program = Effect.gen(function*() {
      yield* ObjectStorage
    })

    await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).rejects.toThrow(/R2_ACCOUNT_ID/)
  })
})
