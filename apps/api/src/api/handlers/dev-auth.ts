import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { Data, Effect } from "effect"
import { assertDevAuthAllowed, DevAuthForbiddenError, getDevCredentials } from "../../lib/dev-auth"
import { TeacherExamApi } from "../definition"
import { ApiForbidden } from "../errors/http"
import { AuthService } from "../services/auth-service"

class DevAuthUnexpectedError extends Data.TaggedError("DevAuthUnexpectedError")<{
  cause: unknown
}> {}

export const DevAuthLive = HttpApiBuilder.group(
  TeacherExamApi,
  "devAuth",
  (handlers) =>
    handlers.handleRaw("devLogin", () =>
      Effect.gen(function*() {
        const request = yield* HttpServerRequest.HttpServerRequest
        const host = request.headers["host"] ?? ""

        yield* Effect.try({
          try: () => assertDevAuthAllowed(host),
          catch: (err): DevAuthForbiddenError | DevAuthUnexpectedError =>
            err instanceof DevAuthForbiddenError
              ? err
              : new DevAuthUnexpectedError({ cause: err })
        }).pipe(
          Effect.catchIf(
            (err): err is DevAuthForbiddenError => err instanceof DevAuthForbiddenError,
            () =>
              Effect.fail(
                new ApiForbidden({ error: "Forbidden", message: "Dev auth is not available" })
              )
          ),
          Effect.catchAll((err) => Effect.die(err))
        )

        const { email, password } = getDevCredentials()
        const authService = yield* AuthService
        const headers = new Headers()
        for (const [key, value] of Object.entries(request.headers)) {
          if (value !== undefined) {
            headers.set(key, value)
          }
        }
        const upstream = yield* authService
          .signInEmail({ email, password, headers })
          .pipe(
            Effect.mapError(
              () => new ApiForbidden({ error: "Forbidden", message: "Dev auth is not available" })
            )
          )

        return HttpServerResponse.fromWeb(upstream)
      }))
)
