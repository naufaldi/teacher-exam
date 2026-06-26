import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { ApiBadRequest, ApiConflict, ApiDatabaseError, ApiExamNotFinal, ApiNotFound } from "../errors/http"
import { CurrentUser } from "../middleware/auth"
import { SessionService } from "../services/session-service"

export const SessionsLive = HttpApiBuilder.group(
  TeacherExamApi,
  "sessions",
  (handlers) =>
    handlers.handle("createSession", ({ path, payload }) =>
      Effect.gen(function*() {
        const { userId } = yield* CurrentUser
        const service = yield* SessionService
        return yield* service.createSession(userId, path.id, payload)
      }).pipe(
        Effect.catchTags({
          ExamNotFoundError: (e) =>
            Effect.fail(new ApiNotFound({ error: `Exam ${e.examId} not found`, code: "NOT_FOUND" })),
          ExamNotFinalError: (e) =>
            Effect.fail(
              new ApiExamNotFinal({ error: `Exam ${e.examId} is not final`, code: "EXAM_NOT_FINAL" })
            ),
          SessionSaveError: (e) =>
            Effect.fail(
              new ApiDatabaseError({
                error: `Session save failed: ${String(e.cause)}`,
                code: "DATABASE_ERROR"
              })
            )
        })
      ))
)

export const PublicSessionsLive = HttpApiBuilder.group(
  TeacherExamApi,
  "publicSessions",
  (handlers) =>
    handlers
      .handle("getPublicSession", ({ path }) =>
        Effect.gen(function*() {
          const service = yield* SessionService
          const detail = yield* service.getPublicSession(path.code)
          if (detail === null) {
            return yield* Effect.fail(
              new ApiNotFound({ error: "Session not found", code: "NOT_FOUND" })
            )
          }
          return detail
        }))
      .handle("startSession", ({ path, payload }) =>
        Effect.gen(function*() {
          const service = yield* SessionService
          return yield* service.startSession(path.code, payload)
        }).pipe(
          Effect.catchTags({
            SessionNotFoundError: (e) =>
              Effect.fail(new ApiNotFound({ error: `Session ${e.code} not found`, code: "NOT_FOUND" })),
            SessionSaveError: (e) =>
              Effect.fail(
                new ApiBadRequest({
                  error: `Enroll failed: ${String(e.cause)}`,
                  code: "BAD_REQUEST"
                })
              )
          })
        ))
      .handle("submitSession", ({ path, payload }) =>
        Effect.gen(function*() {
          const service = yield* SessionService
          yield* service.submitSession(path.code, payload)
          return { ok: true }
        }).pipe(
          Effect.catchTags({
            SessionNotFoundError: (e) =>
              Effect.fail(new ApiNotFound({ error: `Session ${e.code} not found`, code: "NOT_FOUND" })),
            SessionStudentNotFoundError: (e) =>
              Effect.fail(
                new ApiNotFound({ error: `Enrollment ${e.token} not found`, code: "NOT_FOUND" })
              ),
            SessionAlreadySubmittedError: () => Effect.fail(new ApiConflict({ error: "Session already submitted" }))
          })
        ))
)
