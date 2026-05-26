import { HttpApiMiddleware, HttpServerRequest } from '@effect/platform'
import { Context, Effect, Layer } from 'effect'
import { ApiUnauthorizedSimple } from '../errors/http'
import { AuthService } from '../services/auth-service'

export class CurrentUser extends Context.Tag('CurrentUser')<CurrentUser, { readonly userId: string }>() {}

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()('Authorization', {
  failure: ApiUnauthorizedSimple,
  provides: CurrentUser,
}) {}

export const AuthorizationLive = Layer.succeed(
  Authorization,
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const authService = yield* AuthService
    const headers = new Headers()
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        headers.set(key, value)
      }
    }
    const session = yield* authService.getSession(headers).pipe(
      Effect.mapError(() => new ApiUnauthorizedSimple({ error: 'Unauthorized' })),
    )
    if (!session?.user) {
      return yield* Effect.fail(new ApiUnauthorizedSimple({ error: 'Unauthorized' }))
    }
    return { userId: session.user.id }
  }),
)

export const TestAuthorizationLive = (userId: string) =>
  Layer.succeed(
    Authorization,
    Effect.succeed({ userId }),
  )
