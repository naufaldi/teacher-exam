import type {
  BankQuestion,
  BrowseBankQuery,
  BuildExamFromBankInput,
  BuildExamFromBankResponse,
  CurriculumCatalogResponse,
  ExamDetailResponse,
  ExamShareResponse,
  ExamWithQuestions,
  GenerateExamInput,
  PaginatedBankResponse,
  PaginatedPublicBankResponse,
  PublicExamDetailResponse,
  RegenerateQuestionInput,
  SaveToBankInput,
  UpdateBankQuestionInput,
  UpdateExamInput,
  UpdateProfileInput,
  UpdateQuestionInput
} from "@teacher-exam/shared"
import {
  BankQuestionSchema,
  BuildExamFromBankResponseSchema,
  CurriculumCatalogResponseSchema,
  ExamSchema,
  ExamShareResponseSchema,
  ExamWithQuestionsSchema,
  HealthResponseSchema,
  PaginatedBankResponseSchema,
  PaginatedPublicBankResponseSchema,
  PublicExamWithQuestionsSchema,
  QuestionSchema,
  UserProfileSchema
} from "@teacher-exam/shared"
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
} from "./api-errors.js"
import { logClientError } from "./client-log.js"
import { devLog } from "./dev-log.js"

export {
  ApiClientError,
  type ApiClientFailure,
  ApiError,
  DecodeClientError,
  NetworkClientError,
  RateLimitedClientError,
  RateLimitedError,
  UnauthorizedClientError,
  UnauthorizedError
}

const API_BASE = import.meta.env["VITE_API_URL"] ?? "/api"

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
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
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

function decodeEither<A, I>(
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

async function fetchDecoded<A, I>(
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

function buildBankQueryParams(query: BrowseBankQuery = {}): string {
  const params = new URLSearchParams()
  if (query.subject) params.set("subject", query.subject)
  if (query.grade !== undefined) params.set("grade", String(query.grade))
  if (query.difficulty) params.set("difficulty", query.difficulty)
  if (query.topic) params.set("topic", query.topic)
  if (query.type) params.set("type", query.type)
  if (query.author) params.set("author", query.author)
  if (query.search) params.set("search", query.search)
  if (query.sort) params.set("sort", query.sort)
  if (query.page !== undefined) params.set("page", String(query.page))
  if (query.limit !== undefined) params.set("limit", String(query.limit))
  return params.toString()
}

export const api = {
  health: {
    get: () => fetchDecoded("/health", HealthResponseSchema)
  },
  exams: {
    list: () => fetchDecoded("/exams", Schema.Array(ExamSchema)),
    get: (id: string) => fetchDecoded(`/exams/${id}`, ExamWithQuestionsSchema),
    patch: (id: string, body: Partial<UpdateExamInput>) =>
      fetchDecoded(`/exams/${id}`, ExamWithQuestionsSchema, {
        method: "PATCH",
        body: JSON.stringify(body)
      }),
    remove: (id: string) => apiFetchEither<void>(`/exams/${id}`, { method: "DELETE" }),
    duplicate: (id: string) => fetchDecoded(`/exams/${id}/duplicate`, ExamSchema, { method: "POST" }),
    share: async (id: string): Promise<Either.Either<ExamShareResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/exams/${id}/share`, { method: "POST" })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ExamShareResponse, ApiClientFailure>
      }
      return decodeEither(ExamShareResponseSchema, raw.right)
    },
    finalize: (id: string) => fetchDecoded(`/exams/${id}/finalize`, ExamWithQuestionsSchema, { method: "POST" }),
    validateCurriculum: async (id: string): Promise<Either.Either<ExamWithQuestions, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/exams/${id}/validate-curriculum`, { method: "POST" })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ExamWithQuestions, ApiClientFailure>
      }
      return decodeEither(ExamWithQuestionsSchema, raw.right)
    },
    generateDiscussion: (id: string) =>
      fetchDecoded(`/exams/${id}/discussion`, ExamWithQuestionsSchema, { method: "POST" }),
    streamDiscussion: async (
      id: string,
      onDone: (exam: ExamDetailResponse) => void,
      onError: (message: string) => void
    ): Promise<Either.Either<void, ApiClientFailure>> => {
      let response: Response
      try {
        response = await fetch(`${API_BASE}/exams/${id}/discussion`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Length": "0" }
        })
      } catch {
        return Either.left(new NetworkClientError({ message: "Failed to fetch" }))
      }

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({})) as { message?: string; error?: string }
        return Either.left(
          new ApiClientError({
            message: body.message ?? body.error ?? `Request failed (${response.status})`,
            code: "DISCUSSION_ERROR",
            status: response.status
          })
        )
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split("\n\n")
          buffer = parts.pop() ?? ""
          for (const part of parts) {
            if (!part.trim()) continue
            let eventType = ""
            let data = ""
            for (const line of part.split("\n")) {
              if (line.startsWith("event: ")) eventType = line.slice(7)
              else if (line.startsWith("data: ")) data = line.slice(6)
            }
            if (eventType === "done") {
              const decoded = decodeEither(ExamWithQuestionsSchema, JSON.parse(data))
              if (Either.isLeft(decoded)) {
                return Either.left(decoded.left)
              }
              onDone(decoded.right as ExamDetailResponse)
              return Either.right(undefined)
            }
            if (eventType === "error") {
              const err = JSON.parse(data) as { message: string }
              onError(err.message)
              return Either.left(
                new ApiClientError({
                  message: err.message,
                  code: "DISCUSSION_STREAM_ERROR",
                  status: 500
                })
              )
            }
          }
        }
      } catch {
        return Either.left(new NetworkClientError({ message: "Failed to fetch" }))
      }
      return Either.right(undefined)
    }
  },
  ai: {
    generate: async (input: GenerateExamInput): Promise<Either.Either<ExamWithQuestions, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>("/ai/generate", {
        method: "POST",
        body: JSON.stringify(input)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ExamWithQuestions, ApiClientFailure>
      }
      return decodeEither(ExamWithQuestionsSchema, raw.right)
    }
  },
  curriculum: {
    catalog: async (): Promise<Either.Either<CurriculumCatalogResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>("/curriculum/catalog")
      if (Either.isLeft(raw)) {
        return raw as Either.Either<CurriculumCatalogResponse, ApiClientFailure>
      }
      return decodeEither(CurriculumCatalogResponseSchema, raw.right)
    }
  },
  questions: {
    patch: (id: string, body: UpdateQuestionInput) =>
      fetchDecoded(`/questions/${id}`, QuestionSchema, {
        method: "PATCH",
        body: JSON.stringify(body)
      }),
    regenerate: (id: string, body?: RegenerateQuestionInput) =>
      fetchDecoded(`/questions/${id}/regenerate`, QuestionSchema, {
        method: "POST",
        body: JSON.stringify(body ?? {})
      })
  },
  me: {
    get: () => fetchDecoded("/me", UserProfileSchema),
    update: (body: UpdateProfileInput) =>
      fetchDecoded("/me", UserProfileSchema, {
        method: "PATCH",
        body: JSON.stringify(body)
      })
  },
  publicExams: {
    get: async (slug: string): Promise<Either.Either<PublicExamDetailResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/public/exams/${slug}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<PublicExamDetailResponse, ApiClientFailure>
      }
      return decodeEither(PublicExamWithQuestionsSchema, raw.right)
    }
  },
  bank: {
    save: async (input: SaveToBankInput): Promise<Either.Either<BankQuestion, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>("/bank", {
        method: "POST",
        body: JSON.stringify(input)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<BankQuestion, ApiClientFailure>
      }
      return decodeEither(BankQuestionSchema, raw.right)
    },
    browse: async (
      query: BrowseBankQuery = {}
    ): Promise<Either.Either<PaginatedBankResponse, ApiClientFailure>> => {
      const qs = buildBankQueryParams(query)
      const raw = await apiFetchEither<unknown>(`/bank${qs ? `?${qs}` : ""}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<PaginatedBankResponse, ApiClientFailure>
      }
      return decodeEither(PaginatedBankResponseSchema, raw.right)
    },
    browsePublic: async (
      query: BrowseBankQuery = {}
    ): Promise<Either.Either<PaginatedPublicBankResponse, ApiClientFailure>> => {
      const qs = buildBankQueryParams(query)
      const raw = await apiFetchEither<unknown>(`/bank/public${qs ? `?${qs}` : ""}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<PaginatedPublicBankResponse, ApiClientFailure>
      }
      return decodeEither(PaginatedPublicBankResponseSchema, raw.right)
    },
    buildExam: async (
      input: BuildExamFromBankInput
    ): Promise<Either.Either<BuildExamFromBankResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>("/bank/build-exam", {
        method: "POST",
        body: JSON.stringify(input)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<BuildExamFromBankResponse, ApiClientFailure>
      }
      return decodeEither(BuildExamFromBankResponseSchema, raw.right)
    },
    update: async (
      id: string,
      body: UpdateBankQuestionInput
    ): Promise<Either.Either<BankQuestion, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/bank/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<BankQuestion, ApiClientFailure>
      }
      return decodeEither(BankQuestionSchema, raw.right)
    },
    remove: (id: string) => apiFetchEither<void>(`/bank/${id}`, { method: "DELETE" })
  }
}
