import { Effect } from "effect"
import { logError, logWarn } from "./server-log.js"

export type LogKind = "expected" | "unexpected"

/**
 * Extract a safe, PII-free payload from an Effect error.
 * Stacks and full cause messages are intentionally omitted to avoid leaking
 * sensitive content; callers that need cause detail should pass it via
 * `extra` explicitly.
 */
function errorPayload(e: unknown): Record<string, unknown> {
  if (typeof e === "object" && e !== null && "_tag" in e) {
    const tag = String((e as { _tag: unknown })._tag)
    const rest: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(e as Record<string, unknown>)) {
      if (key === "_tag" || key === "cause" || key === "stack") continue
      if (value === undefined) continue
      rest[key] = value
    }
    return { tag, ...rest, cause: String(e) }
  }
  return { tag: "unknown", cause: String(e) }
}

function emit(scope: string, kind: LogKind, e: unknown, extra?: Record<string, unknown>): void {
  const payload: Record<string, unknown> = { kind, ...errorPayload(e) }
  if (extra !== undefined) {
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined) continue
      payload[key] = value
    }
  }
  const msg = `${scope}_failed`
  if (kind === "expected") {
    logWarn(msg, payload)
  } else {
    logError(msg, payload)
  }
}

/**
 * Log a swallowed error and return a recovery Effect that succeeds with `void`.
 * Use this in catchAll / catchTag branches where the product UX requires
 * continuing after a partial failure but the failure must still be observable.
 */
export function logDomainError<E>(
  scope: string,
  error: E,
  options: { kind?: LogKind; extra?: Record<string, unknown> } = {}
): Effect.Effect<void, never, never> {
  return Effect.sync(() => {
    emit(scope, options.kind ?? "unexpected", error, options.extra)
  })
}

/**
 * Wrap a handler effect so any typed failure is logged at the handler boundary
 * before being re-raised to the HttpApi layer. The error channel is preserved.
 */
export function withLoggedErrors<A, E, R>(
  scope: string,
  effect: Effect.Effect<A, E, R>,
  options: { kind?: LogKind; extra?: Record<string, unknown> } = {}
): Effect.Effect<A, E, R> {
  return effect.pipe(
    Effect.tapError((e) =>
      Effect.sync(() => {
        emit(scope, options.kind ?? "unexpected", e, options.extra)
      })
    )
  )
}
