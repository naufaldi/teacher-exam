import { assert, describe, it } from "@effect/vitest"
import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import type { Mock } from "vitest"
import { DbClient } from "../../api/services/db.js"
import { makeChain } from "../../routes/__test__/helpers.js"
import { listQueuedGenerationJobs, reclaimStaleRunningJobs } from "../generation-job-service.js"

describe("generation-job-service reclaim (#212)", () => {
  it.effect("requeues stale running jobs once before failing on second reclaim", () =>
    Effect.gen(function*() {
      const staleStartedAt = new Date("2020-01-01T00:00:00.000Z")
      const updates: Array<Record<string, unknown>> = []
      ;(db.select as Mock).mockImplementation(() =>
        makeChain([
          {
            id: "job-stale",
            examId: "exam-1",
            status: "running",
            questionsTarget: 20,
            questionsDone: 3,
            inputJson: {},
            error: null,
            startedAt: staleStartedAt,
            finishedAt: null,
            createdAt: new Date("2020-01-01T00:00:00.000Z")
          }
        ])
      )
      ;(db.update as Mock).mockImplementation(() => ({
        set: (values: Record<string, unknown>) => {
          updates.push(values)
          return {
            where: () => makeChain(undefined)
          }
        }
      }))

      const reclaimed = yield* reclaimStaleRunningJobs(60_000, new Date("2024-01-01T00:00:00.000Z"))
      assert.strictEqual(reclaimed, 1)
      assert.strictEqual(updates[0]?.["status"], "queued")
      assert.strictEqual(updates[0]?.["startedAt"], null)
      assert.deepStrictEqual(
        (updates[0]?.["inputJson"] as Record<string, unknown>)?.["reclaimCount"],
        1
      )
    }).pipe(Effect.provide(Layer.succeed(DbClient, db as never))))

  it.effect("marks stale running jobs failed after one reclaim retry", () =>
    Effect.gen(function*() {
      const staleStartedAt = new Date("2020-01-01T00:00:00.000Z")
      const updates: Array<Record<string, unknown>> = []
      ;(db.select as Mock).mockImplementation(() =>
        makeChain([
          {
            id: "job-stale-retry",
            examId: "exam-2",
            status: "running",
            questionsTarget: 20,
            questionsDone: 5,
            inputJson: { reclaimCount: 1 },
            error: null,
            startedAt: staleStartedAt,
            finishedAt: null,
            createdAt: new Date("2020-01-01T00:00:00.000Z")
          }
        ])
      )
      ;(db.update as Mock).mockImplementation(() => ({
        set: (values: Record<string, unknown>) => {
          updates.push(values)
          return {
            where: () => makeChain(undefined)
          }
        }
      }))

      const reclaimed = yield* reclaimStaleRunningJobs(60_000, new Date("2024-01-01T00:00:00.000Z"))
      assert.strictEqual(reclaimed, 1)
      assert.strictEqual(updates[0]?.["status"], "failed")
      assert.strictEqual(updates[0]?.["error"], "Worker timeout after retry")
      assert.strictEqual(updates[0]?.["questionsDone"], 5)
    }).pipe(Effect.provide(Layer.succeed(DbClient, db as never))))

  it.effect("returns queued jobs in database order for FIFO dequeue", () =>
    Effect.gen(function*() {
      ;(db.select as Mock).mockImplementation(() =>
        makeChain([
          { id: "job-old", examId: "exam-old" },
          { id: "job-new", examId: "exam-new" }
        ])
      )

      const rows = yield* listQueuedGenerationJobs(2)
      assert.strictEqual(rows[0]?.id, "job-old")
      assert.strictEqual(rows[1]?.id, "job-new")
    }).pipe(Effect.provide(Layer.succeed(DbClient, db as never))))
})
