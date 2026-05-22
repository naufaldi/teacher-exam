import { HttpApiBuilder, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { auth } from '../../lib/auth'
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
      const upstream = yield* Effect.tryPromise({
        try: () =>
          auth.api.signInEmail({
            body: { email, password },
            headers: request.headers,
            asResponse: true,
          }),
        catch: () => new ApiForbidden({ error: 'Forbidden', message: 'Dev auth is not available' }),
      })

      return HttpServerResponse.fromWeb(upstream)
    }),
  ),
)
