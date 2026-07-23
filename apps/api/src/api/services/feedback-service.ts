import { examPilotOutcomes, exams } from "@teacher-exam/db"
import type { ExamPilotOutcome, SetExamPilotOutcomeInput } from "@teacher-exam/shared"
import { and, eq, sql } from "drizzle-orm"
import { Context, Data, Effect, Layer } from "effect"
import type { ApiDatabaseError } from "../errors/http"
import { runDb } from "../lib/db-effect"
import { DbClient } from "./db"

export class FeedbackExamNotFoundError extends Data.TaggedError("FeedbackExamNotFoundError")<{
  examId: string
}> {}

export interface FeedbackServiceApi {
  readonly setExamOutcome: (
    userId: string,
    examId: string,
    input: SetExamPilotOutcomeInput
  ) => Effect.Effect<ExamPilotOutcome, FeedbackExamNotFoundError | ApiDatabaseError>
}

export class FeedbackService extends Context.Tag("FeedbackService")<
  FeedbackService,
  FeedbackServiceApi
>() {}

function toOutcome(row: typeof examPilotOutcomes.$inferSelect): ExamPilotOutcome {
  return {
    id: row.id as ExamPilotOutcome["id"],
    examId: row.examId as ExamPilotOutcome["examId"],
    trigger: row.trigger,
    readiness: row.readiness,
    firstExportAt: row.firstExportAt.toISOString(),
    answeredAt: row.answeredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

export const FeedbackServiceLive = Layer.effect(
  FeedbackService,
  Effect.gen(function*() {
    const db = yield* DbClient

    const setExamOutcome: FeedbackServiceApi["setExamOutcome"] = (userId, examId, input) =>
      Effect.gen(function*() {
        const ownedExams = yield* runDb(
          db.select({ id: exams.id })
            .from(exams)
            .where(and(eq(exams.id, examId), eq(exams.userId, userId)))
            .limit(1)
        )
        if (ownedExams.length === 0) {
          return yield* Effect.fail(new FeedbackExamNotFoundError({ examId }))
        }

        const now = new Date()
        const rows = yield* runDb(
          db.insert(examPilotOutcomes)
            .values({
              userId,
              examId,
              trigger: input.trigger,
              readiness: input.readiness,
              answeredAt: input.readiness === null ? null : now,
              firstExportAt: now,
              createdAt: now,
              updatedAt: now
            })
            .onConflictDoUpdate({
              target: examPilotOutcomes.examId,
              set: {
                readiness: sql`coalesce(excluded.readiness, ${examPilotOutcomes.readiness})`,
                answeredAt:
                  sql`case when excluded.readiness is not null then coalesce(${examPilotOutcomes.answeredAt}, now()) else ${examPilotOutcomes.answeredAt} end`,
                updatedAt: sql`now()`
              }
            })
            .returning()
        )
        const row = rows[0]
        if (row === undefined) {
          return yield* Effect.fail(new FeedbackExamNotFoundError({ examId }))
        }
        return toOutcome(row)
      }).pipe(Effect.provideService(DbClient, db))

    return { setExamOutcome }
  })
)
