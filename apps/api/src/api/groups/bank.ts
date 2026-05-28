import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from '@effect/platform'
import {
  BankQuestionSchema,
  BrowseBankUrlParamsSchema,
  PaginatedBankResponseSchema,
  SaveToBankInputSchema,
  UpdateBankQuestionInputSchema,
} from '@teacher-exam/shared'
import { Schema } from 'effect'
import { ApiNotFound, ApiValidationError422 } from '../errors/http'
import { Authorization } from '../middleware/auth'
import { GlobalRateLimit } from '../middleware/rate-limit'

const idParam = HttpApiSchema.param('id', Schema.String)

export const BankGroup = HttpApiGroup.make('bank')
  .add(
    HttpApiEndpoint.post('saveQuestion', '/bank')
      .setPayload(SaveToBankInputSchema)
      .addSuccess(BankQuestionSchema, { status: 201 })
      .addError(ApiNotFound, { status: 404 }),
  )
  .add(
    HttpApiEndpoint.get('browseBank', '/bank')
      .setUrlParams(BrowseBankUrlParamsSchema)
      .addSuccess(PaginatedBankResponseSchema),
  )
  .add(
    HttpApiEndpoint.patch('updateBankQuestion')`/bank/${idParam}`
      .setPayload(UpdateBankQuestionInputSchema)
      .addSuccess(BankQuestionSchema)
      .addError(ApiNotFound, { status: 404 })
      .addError(ApiValidationError422, { status: 422 }),
  )
  .add(
    HttpApiEndpoint.del('removeBankQuestion')`/bank/${idParam}`
      .addSuccess(Schema.Void)
      .addError(ApiNotFound, { status: 404 }),
  )
  .middleware(Authorization)
  .middleware(GlobalRateLimit)
