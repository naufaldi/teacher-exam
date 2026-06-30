import { generationJobs } from "@teacher-exam/db"
import type { GenerateStreamResponse, JobStatus } from "@teacher-exam/shared"
import { and, asc, desc, eq, inArray, lt } from "drizzle-orm"
import { Effect } from "effect"
import type { ApiDatabaseError } from "../api/errors/http"
import { runDb } from "../api/lib/db-effect"
import { DbClient } from "../api/services/db"
import { fetchExamWithQuestions } from "../lib/exams-query"

export function createGenerationJob(
  examId: string,
  questionsTarget: number,
  inputJson: Record<string, unknown>
): Effect.Effect<string, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const existing = yield* runDb(
      db
        .select()
        .from(generationJobs)
        .where(and(eq(generationJobs.examId, examId), inArray(generationJobs.status, ["queued", "running"])))
        .limit(1)
    )
    if (existing[0]) {
      return existing[0].id
    }

    const jobId = crypto.randomUUID()
    yield* runDb(
      db.insert(generationJobs).values({
        id: jobId,
        examId,
        status: "queued",
        questionsTarget,
        questionsDone: 0,
        inputJson
      })
    )
    return jobId
  })
}

export function markGenerationJobRunning(
  jobId: string
): Effect.Effect<void, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    yield* runDb(
      db
        .update(generationJobs)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(generationJobs.id, jobId))
    )
  })
}

export function updateGenerationJobProgress(
  jobId: string,
  questionsDone: number
): Effect.Effect<void, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    yield* runDb(
      db.update(generationJobs).set({ questionsDone }).where(eq(generationJobs.id, jobId))
    )
  })
}

export function completeGenerationJob(
  jobId: string,
  questionsDone: number
): Effect.Effect<void, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    yield* runDb(
      db
        .update(generationJobs)
        .set({
          status: "completed",
          questionsDone,
          finishedAt: new Date()
        })
        .where(eq(generationJobs.id, jobId))
    )
  })
}

export function failGenerationJob(
  jobId: string,
  error: string,
  questionsDone: number
): Effect.Effect<void, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    yield* runDb(
      db
        .update(generationJobs)
        .set({
          status: "failed",
          error,
          questionsDone,
          finishedAt: new Date()
        })
        .where(eq(generationJobs.id, jobId))
    )
  })
}

export function getGenerateStreamResponse(
  userId: string,
  examId: string
): Effect.Effect<GenerateStreamResponse | null, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const exam = yield* fetchExamWithQuestions(examId)
    if (!exam || exam.userId !== userId) {
      return null
    }

    const jobRows = yield* runDb(
      db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.examId, examId))
        .orderBy(desc(generationJobs.createdAt))
        .limit(1)
    )
    const job = jobRows[0]
    const questionsCount = exam.questions.length
    const targetCount = job?.questionsTarget ?? questionsCount
    const status: JobStatus = job?.status ?? (questionsCount > 0 ? "completed" : "failed")
    const done = status === "completed" || status === "failed" || questionsCount >= targetCount

    return {
      status,
      questionsCount,
      targetCount,
      questions: exam.questions,
      done,
      ...(job?.error ? { error: job.error } : {})
    }
  })
}

export function reclaimStaleRunningJobs(
  staleAfterMs: number
): Effect.Effect<number, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const cutoff = new Date(Date.now() - staleAfterMs)
    const staleRows = yield* runDb(
      db
        .select({ id: generationJobs.id })
        .from(generationJobs)
        .where(and(eq(generationJobs.status, "running"), lt(generationJobs.startedAt, cutoff)))
    )
    if (staleRows.length === 0) {
      return 0
    }
    yield* runDb(
      db
        .update(generationJobs)
        .set({ status: "queued", startedAt: null, error: null })
        .where(inArray(generationJobs.id, staleRows.map((row) => row.id)))
    )
    return staleRows.length
  })
}

export function listQueuedGenerationJobs(
  limit = 2
): Effect.Effect<ReadonlyArray<{ id: string; examId: string }>, ApiDatabaseError, DbClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const rows = yield* runDb(
      db
        .select({ id: generationJobs.id, examId: generationJobs.examId })
        .from(generationJobs)
        .where(eq(generationJobs.status, "queued"))
        .orderBy(asc(generationJobs.createdAt))
        .limit(limit)
    )
    return rows
  })
}
