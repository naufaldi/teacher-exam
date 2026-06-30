import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { Effect, Layer } from "effect"
import { ObjectStorage, ObjectStorageError, type ObjectStorageService } from "./object-storage"

export interface R2ObjectStorageConfig {
  readonly bucketName: string
}

export interface R2Credentials {
  readonly accountId: string
  readonly accessKeyId: string
  readonly secretAccessKey: string
  readonly bucketName: string
}

function mapS3Error(key: string, action: string, err: unknown): ObjectStorageError {
  if (err instanceof NoSuchKey) {
    return new ObjectStorageError({ message: `Object not found: ${key}`, cause: err })
  }
  return new ObjectStorageError({ message: `Failed to ${action} object in R2: ${key}`, cause: err })
}

export function readR2CredentialsFromEnv(): R2Credentials {
  const requireEnv = (name: string): string => {
    const value = process.env[name]?.trim()
    if (!value) {
      throw new Error(`Missing required env var: ${name}`)
    }
    return value
  }

  return {
    accountId: requireEnv("R2_ACCOUNT_ID"),
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    bucketName: requireEnv("R2_BUCKET_NAME")
  }
}

export function createS3ClientForR2(credentials: R2Credentials): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey
    }
  })
}

export function createR2ObjectStorageService(
  config: R2ObjectStorageConfig,
  client: S3Client
): ObjectStorageService {
  const putObject = (key: string, data: Buffer, contentType: string) =>
    Effect.tryPromise({
      try: () =>
        client.send(
          new PutObjectCommand({
            Bucket: config.bucketName,
            Key: key,
            Body: data,
            ContentType: contentType
          })
        ),
      catch: (err) => mapS3Error(key, "write", err)
    }).pipe(Effect.asVoid)

  const getObject = (key: string) =>
    Effect.gen(function*() {
      const response = yield* Effect.tryPromise({
        try: () =>
          client.send(
            new GetObjectCommand({
              Bucket: config.bucketName,
              Key: key
            })
          ),
        catch: (err) => mapS3Error(key, "read", err)
      })
      if (!response.Body) {
        return yield* Effect.fail(new ObjectStorageError({ message: `Object not found: ${key}` }))
      }
      const bytes = yield* Effect.tryPromise({
        try: () => response.Body!.transformToByteArray(),
        catch: (err) => mapS3Error(key, "read", err)
      })
      return Buffer.from(bytes)
    })

  const deleteObject = (key: string) =>
    Effect.tryPromise({
      try: () =>
        client.send(
          new DeleteObjectCommand({
            Bucket: config.bucketName,
            Key: key
          })
        ),
      catch: (err) => mapS3Error(key, "delete", err)
    }).pipe(Effect.asVoid)

  return { putObject, getObject, deleteObject }
}

export const R2ObjectStorageLive = Layer.effect(
  ObjectStorage,
  Effect.sync(() => {
    const credentials = readR2CredentialsFromEnv()
    const client = createS3ClientForR2(credentials)
    return createR2ObjectStorageService({ bucketName: credentials.bucketName }, client)
  })
)
