import { db, generationJobs } from "@teacher-exam/db"
import { asc } from "drizzle-orm"
import { Effect, Layer } from "effect"
import { describe, expect, it, type Mock, vi } from "vitest"
import { makeQueryEffect } from "../../__test__/mock-db.js"
import { type AppDb, DbClient } from "../../api/services/db.js"
import { listQueuedGenerationJobs, reclaimStaleRunningJobs } from "../../lib/generation-job-service.js"

const testLayer = Layer.succeed(DbClient, db as AppDb)

describe("reclaimStaleRunningJobs", () => {
  it("requeues running jobs whose startedAt is older than the stale window", async () => {
    const staleJobId = "33333333-3333-4333-8333-333333333333"
    ;(db.select as Mock).mockReturnValueOnce(makeQueryEffect([{ id: staleJobId }]))
    ;(db.update as Mock).mockReturnValueOnce(makeQueryEffect(undefined))

    const reclaimed = await Effect.runPromise(
      reclaimStaleRunningJobs(15 * 60 * 1000).pipe(Effect.provide(testLayer))
    )

    expect(reclaimed).toBe(1)
    expect(db.update).toHaveBeenCalledWith(generationJobs)
  })
})

describe("listQueuedGenerationJobs", () => {
  it("orders queued jobs FIFO by createdAt ascending", async () => {
    const orderBy = vi.fn(() => makeQueryEffect([]))
    const limit = vi.fn(() => ({ orderBy }))
    ;(db.select as Mock).mockReturnValue({
      from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy, limit })) }))
    })

    await Effect.runPromise(listQueuedGenerationJobs(2).pipe(Effect.provide(testLayer)))

    expect(orderBy).toHaveBeenCalledWith(asc(generationJobs.createdAt))
  })
})
