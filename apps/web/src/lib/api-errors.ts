import { Data, Match } from "effect"

export class UnauthorizedClientError extends Data.TaggedError("UnauthorizedClientError")<{
  message?: string
}> {}

export class RateLimitedClientError extends Data.TaggedError("RateLimitedClientError")<{
  retryAfterSec: number
  message?: string
}> {}

export class ApiClientError extends Data.TaggedError("ApiClientError")<{
  message: string
  code: string
  status: number
  details?: unknown
}> {}

export class NetworkClientError extends Data.TaggedError("NetworkClientError")<{
  message: string
}> {}

export class DecodeClientError extends Data.TaggedError("DecodeClientError")<{
  message: string
}> {}

export type ApiClientFailure =
  | UnauthorizedClientError
  | RateLimitedClientError
  | ApiClientError
  | NetworkClientError
  | DecodeClientError

/** @deprecated Use UnauthorizedClientError — kept for instanceof checks in tests during migration */
export class UnauthorizedError extends UnauthorizedClientError {
  constructor(message = "Unauthorized") {
    super({ message })
    this.name = "UnauthorizedError"
  }
}

/** @deprecated Use RateLimitedClientError */
export class RateLimitedError extends RateLimitedClientError {
  readonly retryAfterSec: number
  constructor(retryAfterSec: number, message = "Terlalu banyak permintaan. Coba lagi sebentar.") {
    super({ retryAfterSec, message })
    this.name = "RateLimitedError"
    this.retryAfterSec = retryAfterSec
  }
}

/** @deprecated Use ApiClientError */
export class ApiError extends ApiClientError {
  constructor({
    code,
    details,
    message,
    status
  }: {
    message: string
    code: string
    status: number
    details?: unknown
  }) {
    super({ message, code, status, details })
    this.name = "ApiError"
  }
}

export function clientErrorMessage(err: ApiClientFailure): string {
  return Match.value(err).pipe(
    Match.tag("UnauthorizedClientError", (e) => e.message ?? "Unauthorized"),
    Match.tag("RateLimitedClientError", (e) => e.message ?? "Terlalu banyak permintaan. Coba lagi sebentar."),
    Match.tag("ApiClientError", (e) => e.message),
    Match.tag("NetworkClientError", (e) => e.message),
    Match.tag("DecodeClientError", (e) => e.message),
    Match.exhaustive
  )
}
