import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'

export const HealthResponseSchema = Schema.Struct({
  status: Schema.String,
  service: Schema.String,
  timestamp: Schema.String,
})

export const HealthGroup = HttpApiGroup.make('health').add(
  HttpApiEndpoint.get('getHealth', '/health').addSuccess(HealthResponseSchema),
)
