import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import { ApiForbidden } from '../errors/http'

export const DevAuthGroup = HttpApiGroup.make('devAuth')
  .add(
    HttpApiEndpoint.post('devLogin', '/dev/login')
      .addSuccess(Schema.Unknown)
      .addError(ApiForbidden, { status: 403 }),
  )
