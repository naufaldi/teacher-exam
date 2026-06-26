import { examTemplates } from "@teacher-exam/db"
import type {
  CreateTemplateInput,
  ExamTemplate,
  TemplateApplyResponse,
  TemplateConfig,
  UpdateTemplateInput
} from "@teacher-exam/shared"
import { and, desc, eq } from "drizzle-orm"
import { Context, Data, Effect, Layer } from "effect"
import type { ApiDatabaseError } from "../errors/http"
import { runDb } from "../lib/db-effect"
import { DbClient } from "./db"

export class TemplateNotFoundError extends Data.TaggedError("TemplateNotFoundError")<{
  id: string
}> {}

export class TemplateSaveError extends Data.TaggedError("TemplateSaveError")<{
  cause: unknown
}> {}

export interface TemplateServiceApi {
  readonly list: (userId: string) => Effect.Effect<ReadonlyArray<ExamTemplate>, ApiDatabaseError>
  readonly create: (
    userId: string,
    input: CreateTemplateInput
  ) => Effect.Effect<ExamTemplate, TemplateSaveError | ApiDatabaseError>
  readonly update: (
    userId: string,
    id: string,
    input: UpdateTemplateInput
  ) => Effect.Effect<ExamTemplate, TemplateNotFoundError | ApiDatabaseError>
  readonly remove: (
    userId: string,
    id: string
  ) => Effect.Effect<void, TemplateNotFoundError | ApiDatabaseError>
  readonly apply: (
    userId: string,
    id: string
  ) => Effect.Effect<TemplateApplyResponse, TemplateNotFoundError | ApiDatabaseError>
}

export class TemplateService extends Context.Tag("TemplateService")<
  TemplateService,
  TemplateServiceApi
>() {}

type TemplateRow = typeof examTemplates.$inferSelect

function toExamTemplate(row: TemplateRow): ExamTemplate {
  return {
    id: row.id as ExamTemplate["id"],
    userId: row.userId as ExamTemplate["userId"],
    name: row.name,
    description: row.description,
    config: row.config as TemplateConfig,
    usageCount: row.usageCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

function toApplyResponse(row: TemplateRow): TemplateApplyResponse {
  const config = row.config as TemplateConfig
  return {
    subject: config.subject,
    grade: config.grade,
    difficulty: config.difficulty,
    topics: config.topics,
    reviewMode: config.reviewMode,
    ...(config.examType !== undefined ? { examType: config.examType } : {}),
    ...(config.classContext !== undefined ? { classContext: config.classContext } : {}),
    ...(config.exampleQuestions !== undefined
      ? { exampleQuestions: config.exampleQuestions }
      : {}),
    ...(config.totalSoal !== undefined ? { totalSoal: config.totalSoal } : {}),
    ...(config.composition !== undefined ? { composition: config.composition } : {}),
    templateId: row.id as TemplateApplyResponse["templateId"]
  }
}

export const TemplateServiceLive = Layer.effect(
  TemplateService,
  Effect.gen(function*() {
    const db = yield* DbClient

    const list = (
      userId: string
    ): Effect.Effect<ReadonlyArray<ExamTemplate>, ApiDatabaseError> =>
      Effect.gen(function*() {
        const rows = yield* runDb(
          db.select().from(examTemplates).where(eq(examTemplates.userId, userId)).orderBy(desc(examTemplates.createdAt))
        )
        return rows.map(toExamTemplate)
      }).pipe(Effect.provideService(DbClient, db))

    const create = (
      userId: string,
      input: CreateTemplateInput
    ): Effect.Effect<ExamTemplate, TemplateSaveError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const now = new Date()
        const inserted = yield* runDb(
          db
            .insert(examTemplates)
            .values({
              id: crypto.randomUUID(),
              userId,
              name: input.name,
              description: input.description ?? null,
              config: input.config,
              usageCount: 0,
              createdAt: now,
              updatedAt: now
            })
            .returning()
        )
        const row = inserted[0]
        if (!row) {
          return yield* Effect.fail(new TemplateSaveError({ cause: "No row returned" }))
        }
        return toExamTemplate(row)
      }).pipe(Effect.provideService(DbClient, db))

    const fetchOwned = (
      userId: string,
      id: string
    ): Effect.Effect<TemplateRow, TemplateNotFoundError | ApiDatabaseError, DbClient> =>
      Effect.gen(function*() {
        const rows = yield* runDb(
          db.select().from(examTemplates).where(and(eq(examTemplates.id, id), eq(examTemplates.userId, userId))).limit(
            1
          )
        )
        const row = rows[0]
        if (!row) {
          return yield* Effect.fail(new TemplateNotFoundError({ id }))
        }
        return row
      })

    const update = (
      userId: string,
      id: string,
      input: UpdateTemplateInput
    ): Effect.Effect<ExamTemplate, TemplateNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const row = yield* fetchOwned(userId, id)
        const set: Record<string, unknown> = { updatedAt: new Date() }
        if (input.name !== undefined) set.name = input.name
        if (input.description !== undefined) set.description = input.description
        if (input.config !== undefined) set.config = input.config
        yield* runDb(db.update(examTemplates).set(set).where(eq(examTemplates.id, row.id)))
        const updated = yield* runDb(
          db.select().from(examTemplates).where(eq(examTemplates.id, row.id)).limit(1)
        )
        const updatedRow = updated[0]
        if (!updatedRow) {
          return yield* Effect.fail(new TemplateNotFoundError({ id }))
        }
        return toExamTemplate(updatedRow)
      }).pipe(Effect.provideService(DbClient, db))

    const remove = (
      userId: string,
      id: string
    ): Effect.Effect<void, TemplateNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const row = yield* fetchOwned(userId, id)
        yield* runDb(db.delete(examTemplates).where(eq(examTemplates.id, row.id)))
      }).pipe(Effect.provideService(DbClient, db))

    const apply = (
      userId: string,
      id: string
    ): Effect.Effect<TemplateApplyResponse, TemplateNotFoundError | ApiDatabaseError> =>
      Effect.gen(function*() {
        const row = yield* fetchOwned(userId, id)
        yield* runDb(
          db.update(examTemplates).set({ usageCount: row.usageCount + 1 }).where(eq(examTemplates.id, row.id))
        )
        return toApplyResponse(row)
      }).pipe(Effect.provideService(DbClient, db))

    return { list, create, update, remove, apply }
  })
)
