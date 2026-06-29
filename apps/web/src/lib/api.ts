import type {
  BankSheet,
  BrowseBankSheetsQuery,
  ClassAnalyticsResponse,
  ClassEntity,
  ClassWithStudents,
  CreateClassInput,
  CreateTemplateInput,
  CurriculumBabTopicsResponse,
  CurriculumCatalogResponse,
  ExamAnalyticsResponse,
  ExamDetailResponse,
  ExamShareResponse,
  ExamTemplate,
  ExamWithQuestions,
  GenerateExamInput,
  PaginatedBankSheetsResponse,
  PaginatedPublicBankSheetsResponse,
  PublicExamDetailResponse,
  RegenerateQuestionInput,
  SessionDetailResponse,
  SessionResult,
  SessionResultsResponse,
  SessionStudent,
  StartSessionInput,
  StudentEntity,
  SubmitSessionInput,
  SubmitSessionResponse,
  TemplateApplyResponse,
  UpdateBankSheetInput,
  UpdateClassInput,
  UpdateExamInput,
  UpdateProfileInput,
  UpdateQuestionInput,
  UpdateTemplateInput,
  UseBankSheetInput,
  UseBankSheetResponse
} from "@teacher-exam/shared"
import {
  BankSheetSchema,
  ClassAnalyticsResponseSchema,
  ClassSchema,
  ClassWithStudentsSchema,
  CurriculumBabTopicsResponseSchema,
  CurriculumCatalogResponseSchema,
  ExamAnalyticsResponseSchema,
  ExamSchema,
  ExamShareResponseSchema,
  ExamTemplateSchema,
  ExamWithQuestionsSchema,
  HealthResponseSchema,
  PaginatedBankSheetsResponseSchema,
  PaginatedPublicBankSheetsResponseSchema,
  PublicExamWithQuestionsSchema,
  QuestionSchema,
  SessionDetailResponseSchema,
  SessionResultSchema,
  SessionResultsResponseSchema,
  SessionStudentSchema,
  StudentSchema,
  SubmitSessionResponseSchema,
  TemplateApplyResponseSchema,
  UseBankSheetResponseSchema,
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

function buildBankSheetsQueryParams(query: BrowseBankSheetsQuery = {}): string {
  const params = new URLSearchParams()
  if (query.subject) params.set("subject", query.subject)
  if (query.grade !== undefined) params.set("grade", String(query.grade))
  if (query.difficulty) params.set("difficulty", query.difficulty)
  if (query.topic) params.set("topic", query.topic)
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
    export: (id: string, format: "pdf" | "docx", variant: "soal" | "kunci" | "pembahasan") => {
      const params = new URLSearchParams({ format, variant })
      return downloadExport(`/exams/${id}/export?${params.toString()}`, `ujian.${format}`)
    },
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
    },
    babTopics: async (
      subject: GenerateExamInput["subject"],
      grade: GenerateExamInput["grade"]
    ): Promise<Either.Either<CurriculumBabTopicsResponse, ApiClientFailure>> => {
      const params = new URLSearchParams({ subject, grade: String(grade) })
      const raw = await apiFetchEither<unknown>(`/curriculum/bab-topics?${params.toString()}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<CurriculumBabTopicsResponse, ApiClientFailure>
      }
      return decodeEither(CurriculumBabTopicsResponseSchema, raw.right)
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
    },
    export: (slug: string, format: "pdf" | "docx", variant: "soal" | "kunci" | "pembahasan") => {
      const params = new URLSearchParams({ format, variant })
      return downloadExport(`/public/exams/${slug}/export?${params.toString()}`, `ujian.${format}`)
    }
  },
  bank: {
    browseSheets: async (
      query: BrowseBankSheetsQuery = {}
    ): Promise<Either.Either<PaginatedBankSheetsResponse, ApiClientFailure>> => {
      const qs = buildBankSheetsQueryParams(query)
      const raw = await apiFetchEither<unknown>(`/bank/sheets${qs ? `?${qs}` : ""}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<PaginatedBankSheetsResponse, ApiClientFailure>
      }
      return decodeEither(PaginatedBankSheetsResponseSchema, raw.right)
    },
    browsePublicSheets: async (
      query: BrowseBankSheetsQuery = {}
    ): Promise<Either.Either<PaginatedPublicBankSheetsResponse, ApiClientFailure>> => {
      const qs = buildBankSheetsQueryParams(query)
      const raw = await apiFetchEither<unknown>(`/bank/sheets/public${qs ? `?${qs}` : ""}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<PaginatedPublicBankSheetsResponse, ApiClientFailure>
      }
      return decodeEither(PaginatedPublicBankSheetsResponseSchema, raw.right)
    },
    useSheet: async (
      input: UseBankSheetInput
    ): Promise<Either.Either<UseBankSheetResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>("/bank/use-sheet", {
        method: "POST",
        body: JSON.stringify(input)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<UseBankSheetResponse, ApiClientFailure>
      }
      return decodeEither(UseBankSheetResponseSchema, raw.right)
    },
    updateSheet: async (
      id: string,
      body: UpdateBankSheetInput
    ): Promise<Either.Either<BankSheet, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/bank/sheets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<BankSheet, ApiClientFailure>
      }
      return decodeEither(BankSheetSchema, raw.right)
    }
  },
  templates: {
    list: async (): Promise<Either.Either<ReadonlyArray<ExamTemplate>, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>("/templates")
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ReadonlyArray<ExamTemplate>, ApiClientFailure>
      }
      return decodeEither(Schema.Array(ExamTemplateSchema), raw.right)
    },
    create: async (
      input: CreateTemplateInput
    ): Promise<Either.Either<ExamTemplate, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>("/templates", {
        method: "POST",
        body: JSON.stringify(input)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ExamTemplate, ApiClientFailure>
      }
      return decodeEither(ExamTemplateSchema, raw.right)
    },
    update: async (
      id: string,
      body: UpdateTemplateInput
    ): Promise<Either.Either<ExamTemplate, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ExamTemplate, ApiClientFailure>
      }
      return decodeEither(ExamTemplateSchema, raw.right)
    },
    remove: (id: string) => apiFetchEither<void>(`/templates/${id}`, { method: "DELETE" }),
    apply: async (id: string): Promise<Either.Either<TemplateApplyResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/templates/${id}/apply`, { method: "POST" })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<TemplateApplyResponse, ApiClientFailure>
      }
      return decodeEither(TemplateApplyResponseSchema, raw.right)
    }
  },
  classes: {
    list: async (
      withStudents = false
    ): Promise<Either.Either<ReadonlyArray<ClassEntity | ClassWithStudents>, ApiClientFailure>> => {
      const qs = withStudents ? "?withStudents=true" : ""
      const raw = await apiFetchEither<unknown>(`/classes${qs}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ReadonlyArray<ClassEntity | ClassWithStudents>, ApiClientFailure>
      }
      return decodeEither(Schema.Array(Schema.Union(ClassWithStudentsSchema, ClassSchema)), raw.right)
    },
    create: async (
      input: CreateClassInput
    ): Promise<Either.Either<ClassEntity, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>("/classes", {
        method: "POST",
        body: JSON.stringify(input)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ClassEntity, ApiClientFailure>
      }
      return decodeEither(ClassSchema, raw.right)
    },
    update: async (
      id: string,
      body: UpdateClassInput
    ): Promise<Either.Either<ClassEntity, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/classes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      })
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ClassEntity, ApiClientFailure>
      }
      return decodeEither(ClassSchema, raw.right)
    },
    remove: (id: string) => apiFetchEither<void>(`/classes/${id}`, { method: "DELETE" }),
    students: {
      list: async (
        classId: string
      ): Promise<Either.Either<ReadonlyArray<StudentEntity>, ApiClientFailure>> => {
        const raw = await apiFetchEither<unknown>(`/classes/${classId}/students`)
        if (Either.isLeft(raw)) {
          return raw as Either.Either<ReadonlyArray<StudentEntity>, ApiClientFailure>
        }
        return decodeEither(Schema.Array(StudentSchema), raw.right)
      },
      bulkCreate: async (
        classId: string,
        input: { students: ReadonlyArray<{ name: string; identifier?: string }> }
      ): Promise<Either.Either<ReadonlyArray<StudentEntity>, ApiClientFailure>> => {
        const raw = await apiFetchEither<unknown>(`/classes/${classId}/students`, {
          method: "POST",
          body: JSON.stringify(input)
        })
        if (Either.isLeft(raw)) {
          return raw as Either.Either<ReadonlyArray<StudentEntity>, ApiClientFailure>
        }
        return decodeEither(Schema.Array(StudentSchema), raw.right)
      },
      remove: (classId: string, studentId: string) =>
        apiFetchEither<void>(`/classes/${classId}/students/${studentId}`, { method: "DELETE" })
    }
  },
  sessions: {
    public: {
      get: async (
        code: string
      ): Promise<Either.Either<SessionDetailResponse, ApiClientFailure>> => {
        const raw = await apiFetchEither<unknown>(`/sessions/${code}`)
        if (Either.isLeft(raw)) {
          return raw as Either.Either<SessionDetailResponse, ApiClientFailure>
        }
        return decodeEither(SessionDetailResponseSchema, raw.right)
      },
      start: async (
        code: string,
        input: StartSessionInput
      ): Promise<Either.Either<SessionStudent, ApiClientFailure>> => {
        const raw = await apiFetchEither<unknown>(`/sessions/${code}/start`, {
          method: "POST",
          body: JSON.stringify(input)
        })
        if (Either.isLeft(raw)) {
          return raw as Either.Either<SessionStudent, ApiClientFailure>
        }
        return decodeEither(SessionStudentSchema, raw.right)
      },
      submit: async (
        code: string,
        input: SubmitSessionInput
      ): Promise<Either.Either<SubmitSessionResponse, ApiClientFailure>> => {
        const raw = await apiFetchEither<unknown>(`/sessions/${code}/submit`, {
          method: "POST",
          body: JSON.stringify(input)
        })
        if (Either.isLeft(raw)) {
          return raw as Either.Either<SubmitSessionResponse, ApiClientFailure>
        }
        return decodeEither(SubmitSessionResponseSchema, raw.right)
      }
    }
  },
  results: {
    listByExam: async (
      examId: string
    ): Promise<Either.Either<SessionResultsResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/exams/${examId}/results`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<SessionResultsResponse, ApiClientFailure>
      }
      return decodeEither(SessionResultsResponseSchema, raw.right)
    },
    list: async (
      sessionId: string
    ): Promise<Either.Either<SessionResultsResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/sessions/${sessionId}/results`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<SessionResultsResponse, ApiClientFailure>
      }
      return decodeEither(SessionResultsResponseSchema, raw.right)
    },
    get: async (id: string): Promise<Either.Either<SessionResult, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/results/${id}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<SessionResult, ApiClientFailure>
      }
      return decodeEither(SessionResultSchema, raw.right)
    }
  },
  analytics: {
    getByExam: async (
      examId: string
    ): Promise<Either.Either<ExamAnalyticsResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/analytics/exams/${examId}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ExamAnalyticsResponse, ApiClientFailure>
      }
      return decodeEither(ExamAnalyticsResponseSchema, raw.right)
    },
    getByClass: async (
      classId: string
    ): Promise<Either.Either<ClassAnalyticsResponse, ApiClientFailure>> => {
      const raw = await apiFetchEither<unknown>(`/analytics/classes/${classId}`)
      if (Either.isLeft(raw)) {
        return raw as Either.Either<ClassAnalyticsResponse, ApiClientFailure>
      }
      return decodeEither(ClassAnalyticsResponseSchema, raw.right)
    }
  }
}
