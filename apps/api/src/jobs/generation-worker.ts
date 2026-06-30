import type { SqlClient } from "@effect/sql/SqlClient"
import { generationJobs } from "@teacher-exam/db"
import type { GenerateExamInput } from "@teacher-exam/shared"
import { eq } from "drizzle-orm"
import { Effect } from "effect"
import type { ApiDatabaseError } from "../api/errors/http"
import { runDb } from "../api/lib/db-effect"
import type { CurriculumService } from "../api/services/curriculum-service"
import { DbClient } from "../api/services/db"
import type { ObjectStorage } from "../api/services/object-storage"
import { executeGenerateExam, type GenerateExamResult } from "../lib/ai-generate"
import { failGenerationJob, listQueuedGenerationJobs, markGenerationJobRunning } from "../lib/generation-job-service"
import type { AiService } from "../services/AiService"

type StoredJobInput = GenerateExamInput & { userId?: string }

export function runGenerationJobById(
  jobId: string,
  examId: string,
  aiService: AiService
): Effect.Effect<
  GenerateExamResult,
  ApiDatabaseError,
  DbClient | SqlClient | CurriculumService | ObjectStorage
> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const jobRows = yield* runDb(
      db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1)
    )
    const job = jobRows[0]
    const stored = job?.inputJson as StoredJobInput | null | undefined
    if (!job || !stored?.userId) {
      yield* failGenerationJob(jobId, "Job input missing", 0)
      return { _tag: "database_error", message: "Job input missing" } as const
    }

    yield* markGenerationJobRunning(jobId)
    const { userId, ...input } = stored
    const result = yield* executeGenerateExam(userId, input, aiService, { examId, jobId }).pipe(
      Effect.catchTag(
        "AiGenerationError",
        (err) => Effect.succeed({ _tag: "ai_error" as const, message: String(err.cause) })
      ),
      Effect.catchTag(
        "CurriculumReadError",
        () => Effect.succeed({ _tag: "database_error" as const, message: "Curriculum lookup failed" })
      )
    )

    if (result._tag === "success") {
      return result
    }

    if (result._tag === "ai_error") {
      yield* failGenerationJob(jobId, result.message, 0)
    } else if (result._tag === "validation_error" || result._tag === "insufficient_materi") {
      yield* failGenerationJob(jobId, result.details, 0)
    } else if (result._tag === "database_error") {
      yield* failGenerationJob(jobId, result.message, 0)
    }

    return result
  })
}

export function processQueuedGenerationJobs(
  aiService: AiService,
  limit = 2
): Effect.Effect<number, ApiDatabaseError, DbClient | SqlClient | CurriculumService | ObjectStorage> {
  return Effect.gen(function*() {
    const queued = yield* listQueuedGenerationJobs(limit)
    let processed = 0

    for (const item of queued) {
      yield* runGenerationJobById(item.id, item.examId, aiService).pipe(
        Effect.catchAll(() => Effect.void)
      )
      processed += 1
    }
    return processed
  })
}
