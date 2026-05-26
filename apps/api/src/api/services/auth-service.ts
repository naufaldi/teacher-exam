import { Context, Data, Effect, Layer } from 'effect'
import type { AppDb } from './db'
import { DbClient } from './db'
import { getAuth } from '../../lib/auth'

export class AuthError extends Data.TaggedError('AuthError')<{
  cause: unknown
}> {}

export interface AuthSession {
  readonly user: { readonly id: string; readonly email: string }
  readonly session: { readonly id: string; readonly userId: string }
}

export interface AuthServiceApi {
  readonly getSession: (
    headers: Headers,
  ) => Effect.Effect<AuthSession | null, AuthError>
  readonly signInEmail: (input: {
    email: string
    password: string
    callbackURL?: string
    headers?: Headers
  }) => Effect.Effect<Response, AuthError>
}

export class AuthService extends Context.Tag('AuthService')<AuthService, AuthServiceApi>() {}

export type AuthEffectRunner = <A, E>(
  effect: Effect.Effect<A, E, DbClient>,
) => Promise<A>

let authEffectRunner: AuthEffectRunner | undefined

export function setAuthEffectRunner(runner: AuthEffectRunner): void {
  authEffectRunner = runner
}

export function runAuthDbEffect<A, E>(
  db: AppDb,
  effect: Effect.Effect<A, E, DbClient>,
): Promise<A> {
  if (authEffectRunner) {
    return authEffectRunner(effect)
  }
  return Effect.runPromise(effect.pipe(Effect.provide(Layer.succeed(DbClient, db))))
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}

export function TestAuthServiceLayer(api: Partial<AuthServiceApi> = {}): Layer.Layer<AuthService> {
  return Layer.succeed(AuthService, {
    getSession: () => Effect.succeed(null),
    signInEmail: () =>
      Effect.succeed(new Response(JSON.stringify({}), { status: 200 })),
    ...api,
  })
}

export const AuthServiceLive = Layer.sync(AuthService, () => {
  const auth = getAuth()

  return {
    getSession: (headers) =>
      Effect.tryPromise({
        try: () => auth.api.getSession({ headers: headersToRecord(headers) }),
        catch: (cause) => new AuthError({ cause }),
      }),

    signInEmail: (input) =>
      Effect.tryPromise({
        try: () =>
          auth.api.signInEmail({
            body: {
              email: input.email,
              password: input.password,
            },
            ...(input.headers !== undefined
              ? { headers: headersToRecord(input.headers) }
              : {}),
            asResponse: true,
            ...(input.callbackURL !== undefined && input.callbackURL.length > 0
              ? { callbackURL: input.callbackURL }
              : {}),
          }),
        catch: (cause) => new AuthError({ cause }),
      }),
  } satisfies AuthServiceApi
})
