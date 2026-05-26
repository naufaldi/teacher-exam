import { HttpApiBuilder, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { AuthService } from '../services/auth-service'
import {
  DevAuthForbiddenError,
  assertDevAuthAllowed,
  getDevCredentials,
} from '../../lib/dev-auth'
import { TeacherExamApi } from '../definition'
import { ApiForbidden } from '../errors/http'

export const DevAuthLive = HttpApiBuilder.group(TeacherExamApi, 'devAuth', (handlers) =>
  handlers.handleRaw('devLogin', () =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const host = request.headers['host'] ?? ''

      try {
        assertDevAuthAllowed(host)
      } catch (err) {
        if (err instanceof DevAuthForbiddenError) {
          return yield* Effect.fail(
            new ApiForbidden({ error: 'Forbidden', message: 'Dev auth is not available' }),
          )
        }
        throw err
      }

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
            () => new ApiForbidden({ error: 'Forbidden', message: 'Dev auth is not available' }),
          ),
        )

      return HttpServerResponse.fromWeb(upstream)
    }),
  ),
)
