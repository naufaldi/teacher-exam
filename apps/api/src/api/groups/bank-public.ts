import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import { BrowseBankUrlParamsSchema, PaginatedPublicBankResponseSchema } from "@teacher-exam/shared"
import { PublicBankIpRateLimit } from "../middleware/ip-rate-limit"

export const BankPublicGroup = HttpApiGroup.make("bankPublic").add(
  HttpApiEndpoint.get("browsePublicBank", "/bank/public")
    .setUrlParams(BrowseBankUrlParamsSchema)
    .addSuccess(PaginatedPublicBankResponseSchema)
).middleware(PublicBankIpRateLimit)
