import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import {
  BrowseBankSheetsUrlParamsSchema,
  PaginatedPublicBankSheetsResponseSchema,
  PublicBankSheetSchema
} from "@teacher-exam/shared"
import { Schema } from "effect"
import { ApiNotFound } from "../errors/http"
import { PublicBankIpRateLimit } from "../middleware/ip-rate-limit"

const idParam = HttpApiSchema.param("id", Schema.String)

export const BankPublicGroup = HttpApiGroup.make("bankPublic")
  .add(
    HttpApiEndpoint.get("browsePublicBankSheets", "/bank/sheets/public")
      .setUrlParams(BrowseBankSheetsUrlParamsSchema)
      .addSuccess(PaginatedPublicBankSheetsResponseSchema)
  )
  .add(
    HttpApiEndpoint.get("getPublicBankSheet")`/bank/sheets/public/${idParam}`
      .addSuccess(PublicBankSheetSchema)
      .addError(ApiNotFound, { status: 404 })
  )
  .middleware(PublicBankIpRateLimit)
