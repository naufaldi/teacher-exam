import type {
  ExamDetailResponse,
  ExamShareResponse,
  ExamWithQuestions,
  GenerateStreamResponse,
  UpdateExamInput
} from "@teacher-exam/shared"
import {
  ExamSchema,
  ExamShareResponseSchema,
  ExamWithQuestionsSchema,
  GenerateStreamResponseSchema
} from "@teacher-exam/shared"
import { Either, Schema } from "effect"
import { ApiClientError, type ApiClientFailure, NetworkClientError } from "../api-errors.js"
import { API_BASE, apiFetchEither, decodeEither, downloadExport, fetchDecoded } from "./core.js"

export const examsApi = {
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
  pollGenerateStream: async (
    examId: string
  ): Promise<Either.Either<GenerateStreamResponse, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>(`/exams/${examId}/generate-stream`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<GenerateStreamResponse, ApiClientFailure>
    }
    return decodeEither(GenerateStreamResponseSchema, raw.right)
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
}
