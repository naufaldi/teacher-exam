import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { ApiDatabaseError, ApiNotFound } from "../errors/http"
import { CurrentUser } from "../middleware/auth"
import { TemplateService } from "../services/template-service"

export const TemplatesLive = HttpApiBuilder.group(TeacherExamApi, "templates", (handlers) =>
  handlers
    .handle("listTemplates", () =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* TemplateService
        return yield* service.list(userId)
      }))
    .handle("createTemplate", ({ payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* TemplateService
        return yield* service.create(userId, payload)
      }).pipe(
        Effect.catchTags({
          TemplateSaveError: (e) =>
            Effect.fail(
              new ApiDatabaseError({
                error: `Template save failed: ${String(e.cause)}`,
                code: "DATABASE_ERROR"
              })
            )
        })
      ))
    .handle("updateTemplate", ({ path, payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* TemplateService
        return yield* service.update(userId, path.id, payload)
      }).pipe(
        Effect.catchTags({
          TemplateNotFoundError: (e) =>
            Effect.fail(
              new ApiNotFound({
                error: `Template ${e.id} not found`,
                code: "NOT_FOUND"
              })
            )
        })
      ))
    .handle("deleteTemplate", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* TemplateService
        yield* service.remove(userId, path.id)
      }).pipe(
        Effect.catchTags({
          TemplateNotFoundError: (e) =>
            Effect.fail(
              new ApiNotFound({
                error: `Template ${e.id} not found`,
                code: "NOT_FOUND"
              })
            )
        })
      ))
    .handle("applyTemplate", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* TemplateService
        return yield* service.apply(userId, path.id)
      }).pipe(
        Effect.catchTags({
          TemplateNotFoundError: (e) =>
            Effect.fail(
              new ApiNotFound({
                error: `Template ${e.id} not found`,
                code: "NOT_FOUND"
              })
            )
        })
      )))
