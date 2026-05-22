import { HttpApiBuilder } from '@effect/platform'
import { Layer } from 'effect'
import { resolveAllowedCorsOrigins } from '../lib/auth-origins'

export function createCorsLayer(env: NodeJS.ProcessEnv = process.env): Layer.Layer<never> {
  const allowed = new Set(resolveAllowedCorsOrigins(env))
  return HttpApiBuilder.middlewareCors({
    allowedOrigins: (origin) => allowed.has(origin),
    credentials: true,
  })
}
