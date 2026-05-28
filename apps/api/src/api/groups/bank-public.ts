import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { BrowseBankUrlParamsSchema, PaginatedPublicBankResponseSchema } from '@teacher-exam/shared'
import { PublicBankIpRateLimit } from '../middleware/ip-rate-limit'

export const BankPublicGroup = HttpApiGroup.make('bankPublic').add(
  HttpApiEndpoint.get('browsePublicBank', '/bank/public')
    .setUrlParams(BrowseBankUrlParamsSchema)
    .addSuccess(PaginatedPublicBankResponseSchema),
).middleware(PublicBankIpRateLimit)
