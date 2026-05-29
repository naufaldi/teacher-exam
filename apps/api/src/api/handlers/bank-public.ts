import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import { Effect } from "effect"
import { TeacherExamApi } from "../definition"
import { AuthService } from "../services/auth-service"
import { BankService } from "../services/bank-service"

export const BankPublicLive = HttpApiBuilder.group(
  TeacherExamApi,
  "bankPublic",
  (handlers) =>
    handlers.handle("browsePublicBank", ({ urlParams }) =>
      Effect.gen(function*() {
        const request = yield* HttpServerRequest.HttpServerRequest
        const authService = yield* AuthService
        const headers = new Headers()
        for (const [key, value] of Object.entries(request.headers)) {
          if (value !== undefined) {
            headers.set(key, value)
          }
        }
        const session = yield* authService.getSession(headers).pipe(
          Effect.catchAll(() => Effect.succeed(null))
        )
        const excludeUserId = session?.user?.id
        const bankService = yield* BankService
        return yield* bankService.browsePublic(urlParams, excludeUserId)
      }))
)
