/**
 * Optional R2 smoke test — run only when credentials are configured:
 *
 *   R2_INTEGRATION=1 pnpm --filter @teacher-exam/api exec node --env-file-if-exists=../../.env --import tsx/esm scripts/r2-smoke.ts
 */
import { HeadObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3"
import { createS3ClientForR2, readR2CredentialsFromEnv } from "../src/api/services/object-storage-r2.js"

async function main(): Promise<void> {
  if (process.env["R2_INTEGRATION"] !== "1") {
    console.log("skip: set R2_INTEGRATION=1 and R2 env vars to run")
    process.exit(0)
  }

  const credentials = readR2CredentialsFromEnv()
  const client: S3Client = createS3ClientForR2(credentials)
  const key = `documents/_smoke/${Date.now()}/original.pdf`
  const body = Buffer.from("%PDF-1.4 smoke")

  await client.send(
    new PutObjectCommand({
      Bucket: credentials.bucketName,
      Key: key,
      Body: body,
      ContentType: "application/pdf"
    })
  )

  await client.send(
    new HeadObjectCommand({
      Bucket: credentials.bucketName,
      Key: key
    })
  )

  console.log(`ok: wrote and head-checked ${key}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
