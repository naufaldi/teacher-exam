import type {
  BankSheet,
  BrowseBankSheetsQuery,
  PaginatedBankSheetsResponse,
  PaginatedPublicBankSheetsResponse,
  UpdateBankSheetInput,
  UseBankSheetInput,
  UseBankSheetResponse
} from "@teacher-exam/shared"
import {
  BankSheetSchema,
  PaginatedBankSheetsResponseSchema,
  PaginatedPublicBankSheetsResponseSchema,
  UseBankSheetResponseSchema
} from "@teacher-exam/shared"
import { Either } from "effect"
import type { ApiClientFailure } from "../api-errors.js"
import { apiFetchEither, decodeEither } from "./core.js"

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

export const bankApi = {
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
}
