import { HttpApiMiddleware, HttpServerRequest } from '@effect/platform'
import { Context, Effect, Layer } from 'effect'
import { auth } from '../../lib/auth'
import { ApiUnauthorizedSimple } from '../errors/http'

export class CurrentUser extends Context.Tag('CurrentUser')<CurrentUser, { readonly userId: string }>() {}

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()('Authorization', {
  failure: ApiUnauthorizedSimple,
  provides: CurrentUser,
}) {}

export const AuthorizationLive = Layer.succeed(
  Authorization,
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const session = yield* Effect.tryPromise({
      try: () => auth.api.getSession({ headers: request.headers }),
      catch: () => new ApiUnauthorizedSimple({ error: 'Unauthorized' }),
    })
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
