import type { PdfUploadDetail, PdfUploadListResponse, PdfUploadResponse } from "@teacher-exam/shared"
import { PdfUploadDetailSchema, PdfUploadListResponseSchema, PdfUploadResponseSchema } from "@teacher-exam/shared"
import { Either } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither } from "./core.js"

export const pdfUploadsApi = {
  get: async (id: string): Promise<Either.Either<PdfUploadDetail, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>(`/pdf-uploads/${id}`)
    if (Either.isLeft(raw)) {
      return raw as Either.Either<PdfUploadDetail, ApiClientFailure>
    }
    return decodeEither(PdfUploadDetailSchema, raw.right)
  },
  list: async (): Promise<Either.Either<PdfUploadListResponse, ApiClientFailure>> => {
    const raw = await apiFetchEither<unknown>("/pdf-uploads")
    if (Either.isLeft(raw)) {
      return raw as Either.Either<PdfUploadListResponse, ApiClientFailure>
    }
    return decodeEither(PdfUploadListResponseSchema, raw.right)
  },
  create: async (file: File): Promise<Either.Either<PdfUploadResponse, ApiClientFailure>> => {
    const form = new FormData()
    form.append("file", file)
    const raw = await apiFetchEither<unknown>("/pdf-uploads", {
      method: "POST",
      body: form
    })
    if (Either.isLeft(raw)) {
      return raw as Either.Either<PdfUploadResponse, ApiClientFailure>
    }
    return decodeEither(PdfUploadResponseSchema, raw.right)
  },
  remove: (id: string) => apiFetchEither<void>(`/pdf-uploads/${id}`, { method: "DELETE" })
}
