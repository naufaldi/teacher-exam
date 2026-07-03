import type {
  CreateTemplateInput,
  ExamTemplate,
  TemplateApplyResponse,
  UpdateTemplateInput
} from "@teacher-exam/shared"
import { ExamTemplateSchema, TemplateApplyResponseSchema } from "@teacher-exam/shared"
import { Either, Schema } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither } from "./core.js"

export const templatesApi = {
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
}
