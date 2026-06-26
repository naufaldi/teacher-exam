import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { ApiDatabaseError, ApiNotFound } from "../errors/http"
import { CurrentUser } from "../middleware/auth"
import { ClassService } from "../services/class-service"

export const ClassesLive = HttpApiBuilder.group(TeacherExamApi, "classes", (handlers) =>
  handlers
    .handle("listClasses", ({ urlParams }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* ClassService
        return yield* service.list(userId, urlParams.withStudents === true)
      }))
    .handle("createClass", ({ payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* ClassService
        return yield* service.create(userId, payload)
      }).pipe(
        Effect.catchTags({
          ClassSaveError: (e) =>
            Effect.fail(
              new ApiDatabaseError({
                error: `Class save failed: ${String(e.cause)}`,
                code: "DATABASE_ERROR"
              })
            )
        })
      ))
    .handle("updateClass", ({ path, payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* ClassService
        return yield* service.update(userId, path.id, payload)
      }).pipe(
        Effect.catchTags({
          ClassNotFoundError: (e) =>
            Effect.fail(new ApiNotFound({ error: `Class ${e.id} not found`, code: "NOT_FOUND" }))
        })
      ))
    .handle("deleteClass", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* ClassService
        yield* service.remove(userId, path.id)
      }).pipe(
        Effect.catchTags({
          ClassNotFoundError: (e) =>
            Effect.fail(new ApiNotFound({ error: `Class ${e.id} not found`, code: "NOT_FOUND" }))
        })
      ))
    .handle("listStudents", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* ClassService
        return yield* service.listStudents(userId, path.id)
      }).pipe(
        Effect.catchTags({
          ClassNotFoundError: (e) =>
            Effect.fail(new ApiNotFound({ error: `Class ${e.id} not found`, code: "NOT_FOUND" }))
        })
      ))
    .handle("bulkCreateStudents", ({ path, payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* ClassService
        return yield* service.bulkCreateStudents(userId, path.id, payload)
      }).pipe(
        Effect.catchTags({
          ClassNotFoundError: (e) =>
            Effect.fail(new ApiNotFound({ error: `Class ${e.id} not found`, code: "NOT_FOUND" }))
        })
      ))
    .handle("removeStudent", ({ path }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* ClassService
        yield* service.removeStudent(userId, path.id, path.studentId)
      }).pipe(
        Effect.catchTags({
          ClassNotFoundError: (e) =>
            Effect.fail(new ApiNotFound({ error: `Class ${e.id} not found`, code: "NOT_FOUND" })),
          StudentNotFoundError: (e) =>
            Effect.fail(new ApiNotFound({ error: `Student ${e.id} not found`, code: "NOT_FOUND" }))
        })
      )))
