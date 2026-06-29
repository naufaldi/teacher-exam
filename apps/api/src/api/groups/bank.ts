import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as HttpApiSchema from "@effect/platform/HttpApiSchema"
import {
  BankSheetSchema,
  BrowseBankSheetsUrlParamsSchema,
  PaginatedBankSheetsResponseSchema,
  UpdateBankSheetInputSchema,
  UseBankSheetInputSchema,
  UseBankSheetResponseSchema
} from "@teacher-exam/shared"
import { Schema } from "effect"
import { ApiNotFound, ApiValidationError422 } from "../errors/http"
import { Authorization } from "../middleware/auth"
import { GlobalRateLimit } from "../middleware/rate-limit"

const idParam = HttpApiSchema.param("id", Schema.String)

export const BankGroup = HttpApiGroup.make("bank")
  .add(
    HttpApiEndpoint.get("browseBankSheets", "/bank/sheets")
      .setUrlParams(BrowseBankSheetsUrlParamsSchema)
      .addSuccess(PaginatedBankSheetsResponseSchema)
  )
  .add(
    HttpApiEndpoint.patch("updateBankSheet")`/bank/sheets/${idParam}`
      .setPayload(UpdateBankSheetInputSchema)
      .addSuccess(BankSheetSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiValidationError422, { status: 422 })
  )
  .add(
    HttpApiEndpoint.get("getBankSheet")`/bank/sheets/${idParam}`
      .addSuccess(BankSheetSchema)
      .addError(ApiNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("useBankSheet", "/bank/use-sheet")
      .setPayload(UseBankSheetInputSchema)
      .addSuccess(UseBankSheetResponseSchema, { status: 201 })
      .addError(ApiValidationError422, { status: 422 })
  )
  .middleware(Authorization)
  .middleware(GlobalRateLimit)
