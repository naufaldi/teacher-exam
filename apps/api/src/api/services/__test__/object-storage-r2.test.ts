import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3"
import { Effect } from "effect"
import { describe, expect, it, vi } from "vitest"
import { ObjectStorageError } from "../object-storage"
import { createR2ObjectStorageService } from "../object-storage-r2"

describe("createR2ObjectStorageService", () => {
  const bucketName = "ujian-sekolah"

  it("putObject sends PutObjectCommand with bucket, key, content type, and body", async () => {
    const send = vi.fn(async () => ({}))
    const client = { send } as unknown as S3Client
    const service = createR2ObjectStorageService({ bucketName }, client)
    const data = Buffer.from("pdf-bytes")

    await Effect.runPromise(service.putObject("documents/u1/d1/original.pdf", data, "application/pdf"))

    expect(send).toHaveBeenCalledOnce()
    const command = send.mock.calls[0]?.[0]
    expect(command).toBeInstanceOf(PutObjectCommand)
    expect(command.input).toEqual({
      Bucket: bucketName,
      Key: "documents/u1/d1/original.pdf",
      Body: data,
      ContentType: "application/pdf"
    })
  })

  it("getObject returns buffer when object exists", async () => {
    const body = {
      transformToByteArray: async () => Uint8Array.from([1, 2, 3])
    }
    const send = vi.fn(async () => ({ Body: body }))
    const client = { send } as unknown as S3Client
    const service = createR2ObjectStorageService({ bucketName }, client)

    const bytes = await Effect.runPromise(service.getObject("documents/u1/d1/original.pdf"))

    expect(bytes).toEqual(Buffer.from([1, 2, 3]))
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetObjectCommand)
  })

  it("getObject maps missing key to ObjectStorageError", async () => {
    const send = vi.fn(async () => {
      throw new NoSuchKey({ message: "not found", $metadata: {} })
    })
    const client = { send } as unknown as S3Client
    const service = createR2ObjectStorageService({ bucketName }, client)

    const result = await Effect.runPromise(
      service.getObject("documents/u1/missing/original.pdf").pipe(Effect.either)
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ObjectStorageError)
      expect(result.left.message).toBe("Object not found: documents/u1/missing/original.pdf")
    }
  })

  it("deleteObject sends DeleteObjectCommand", async () => {
    const send = vi.fn(async () => ({}))
    const client = { send } as unknown as S3Client
    const service = createR2ObjectStorageService({ bucketName }, client)

    await Effect.runPromise(service.deleteObject("documents/u1/d1/original.pdf"))

    expect(send).toHaveBeenCalledOnce()
    const command = send.mock.calls[0]?.[0]
    expect(command).toBeInstanceOf(DeleteObjectCommand)
    expect(command.input).toEqual({
      Bucket: bucketName,
      Key: "documents/u1/d1/original.pdf"
    })
  })
})
