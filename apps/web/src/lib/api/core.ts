import { Either, Match, Schema } from "effect"
import {
  ApiClientError,
  type ApiClientFailure,
  ApiError,
  DecodeClientError,
  NetworkClientError,
  RateLimitedClientError,
  RateLimitedError,
  UnauthorizedClientError,
  UnauthorizedError
} from "../api-errors.js"
import { logClientError } from "../client-log.js"
import { devLog } from "../dev-log.js"

export const API_BASE = import.meta.env["VITE_API_URL"] ?? "/api"

type AuthErrorHandler = (err: UnauthorizedClientError) => void
let onUnauthorized: AuthErrorHandler | null = null

export function setUnauthorizedHandler(handler: AuthErrorHandler | null): void {
  onUnauthorized = handler
}

export function throwClientError(err: ApiClientFailure): never {
  return Match.value(err).pipe(
    Match.tag("UnauthorizedClientError", (e) => {
      const legacy = new UnauthorizedError(e.message)
      if (onUnauthorized) onUnauthorized(e)
      throw legacy
    }),
    Match.tag("RateLimitedClientError", (e) => {
      throw new RateLimitedError(e.retryAfterSec, e.message)
    }),
    Match.tag("ApiClientError", (e) => {
      throw new ApiError({
        message: e.message,
        code: e.code,
        status: e.status,
        details: e.details
      })
    }),
    Match.tag("NetworkClientError", (e) => {
      throw new Error(e.message)
    }),
    Match.tag("DecodeClientError", (e) => {
      throw new ApiError({
        message: e.message,
        code: "DECODE_ERROR",
        status: 0
      })
    }),
    Match.exhaustive
  ) as never
}

export function unwrapApiEither<A>(result: Either.Either<A, ApiClientFailure>): A {
  if (Either.isLeft(result)) {
    throwClientError(result.left)
  }
  return result.right
}

export async function apiFetchEither<T>(
  path: string,
  init?: RequestInit
): Promise<Either.Either<T, ApiClientFailure>> {
  const method = init?.method ?? "GET"
  const t0 = performance.now()
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData
  const headers = isFormData
    ? { ...init?.headers }
    : { "Content-Type": "application/json", ...init?.headers }
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers,
      ...init
    })
  } catch (err) {
    const failure = new NetworkClientError({
      message: err instanceof Error ? err.message : String(err)
    })
    devLog("api.fetch", {
      path,
      method,
      ok: false,
      durationMs: Math.round(performance.now() - t0),
      error: err instanceof Error ? err.message : String(err)
    })
    logClientError(failure, { scope: "api.network", path, method })
    return Either.left(failure)
  }

  const durationMs = Math.round(performance.now() - t0)
  if (!res.ok) {
    devLog("api.fetch", { path, method, status: res.status, ok: false, durationMs })
  } else {
    devLog("api.fetch", { path, method, status: res.status, ok: true, durationMs })
  }

  if (res.status === 401) {
    const err = new UnauthorizedClientError({})
    if (onUnauthorized) onUnauthorized(err)
    logClientError(err, { scope: "api.unauthorized", path, method })
    return Either.left(err)
  }

  if (res.status === 429) {
    const header = res.headers.get("Retry-After")
    const retryAfterSec = header ? Number(header) : 60
    const err = new RateLimitedClientError({
      retryAfterSec: Number.isFinite(retryAfterSec) ? retryAfterSec : 60
    })
    logClientError(err, { scope: "api.rate_limited", path, method })
    return Either.left(err)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText, code: "UNKNOWN" }))
    const errorBody = body as { error?: string; message?: string; code?: string; details?: unknown }
    const err = new ApiClientError({
      message: errorBody.message ?? errorBody.error ?? res.statusText,
      code: errorBody.code ?? "UNKNOWN",
      status: res.status,
      details: errorBody.details
    })
    logClientError(err, { scope: "api.api_error", path, method })
    return Either.left(err)
  }

  const json = (await res.json()) as T
  return Either.right(json)
}

/** Throws legacy errors — use in TanStack loaders or legacy call sites. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return unwrapApiEither(await apiFetchEither<T>(path, init))
}

/** Fetches a binary export (PDF/DOCX) and triggers a client-side download. Returns the Blob. */
export async function downloadExport(
  path: string,
  fallbackFileName: string
): Promise<void> {
  const t0 = performance.now()
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { credentials: "include" })
  } catch (err) {
    const failure = new NetworkClientError({
      message: err instanceof Error ? err.message : String(err)
    })
    logClientError(failure, { scope: "api.network", path, method: "GET" })
    throw failure
  }

  const durationMs = Math.round(performance.now() - t0)
  devLog("api.fetch", { path, method: "GET", status: res.status, ok: res.ok, durationMs })

  if (res.status === 401) {
    const err = new UnauthorizedClientError({})
    if (onUnauthorized) onUnauthorized(err)
    logClientError(err, { scope: "api.unauthorized", path, method: "GET" })
    throw err
  }
  if (res.status === 429) {
    const header = res.headers.get("Retry-After")
    const retryAfterSec = header ? Number(header) : 60
    const err = new RateLimitedClientError({
      retryAfterSec: Number.isFinite(retryAfterSec) ? retryAfterSec : 60
    })
    logClientError(err, { scope: "api.rate_limited", path, method: "GET" })
    throw err
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText, code: "UNKNOWN" }))
    const errorBody = body as { error?: string; message?: string; code?: string }
    const err = new ApiClientError({
      message: errorBody.message ?? errorBody.error ?? res.statusText,
      code: errorBody.code ?? "UNKNOWN",
      status: res.status
    })
    logClientError(err, { scope: "api.api_error", path, method: "GET" })
    throw err
  }

  const blob = await res.blob()
  const disposition = res.headers.get("content-disposition") ?? ""
  const fileNameMatch = disposition.match(/filename="?([^";]+)"?/i)
  const fileName = fileNameMatch?.[1] ?? fallbackFileName
  triggerBrowserDownload(blob, fileName)
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function decodeEither<A, I>(
  schema: Schema.Schema<A, I, never>,
  raw: unknown
): Either.Either<A, ApiClientFailure> {
  const decoded = Schema.decodeUnknownEither(schema)(raw)
  if (Either.isLeft(decoded)) {
    return Either.left(
      new DecodeClientError({ message: "Invalid response from server" })
    )
  }
  return Either.right(decoded.right)
}

export async function fetchDecoded<A, I>(
  path: string,
  schema: Schema.Schema<A, I, never>,
  init?: RequestInit
): Promise<Either.Either<A, ApiClientFailure>> {
  const raw = await apiFetchEither<unknown>(path, init)
  if (Either.isLeft(raw)) {
    return raw as Either.Either<A, ApiClientFailure>
  }
  return decodeEither(schema, raw.right)
}
