import { Data } from 'effect'

export class UnauthorizedClientError extends Data.TaggedError('UnauthorizedClientError')<{
  message?: string
}> {}

export class RateLimitedClientError extends Data.TaggedError('RateLimitedClientError')<{
  retryAfterSec: number
  message?: string
}> {}

export class ApiClientError extends Data.TaggedError('ApiClientError')<{
  message: string
  code: string
  status: number
  details?: unknown
}> {}

export class NetworkClientError extends Data.TaggedError('NetworkClientError')<{
  message: string
}> {}

export class DecodeClientError extends Data.TaggedError('DecodeClientError')<{
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
  constructor(message = 'Unauthorized') {
    super({ message })
    this.name = 'UnauthorizedError'
  }
}

/** @deprecated Use RateLimitedClientError */
export class RateLimitedError extends RateLimitedClientError {
  readonly retryAfterSec: number
  constructor(retryAfterSec: number, message = 'Terlalu banyak permintaan. Coba lagi sebentar.') {
    super({ retryAfterSec, message })
    this.name = 'RateLimitedError'
    this.retryAfterSec = retryAfterSec
  }
}

/** @deprecated Use ApiClientError */
export class ApiError extends ApiClientError {
  constructor({
    message,
    code,
    status,
    details,
  }: {
    message: string
    code: string
    status: number
    details?: unknown
  }) {
    super({ message, code, status, details })
    this.name = 'ApiError'
  }
}

export function clientErrorMessage(err: ApiClientFailure): string {
  switch (err._tag) {
    case 'UnauthorizedClientError':
      return err.message ?? 'Unauthorized'
    case 'RateLimitedClientError':
      return err.message ?? 'Terlalu banyak permintaan. Coba lagi sebentar.'
    case 'ApiClientError':
      return err.message
    case 'NetworkClientError':
      return err.message
    case 'DecodeClientError':
      return err.message
  }
}
