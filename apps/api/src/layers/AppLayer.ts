import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { NodeContext } from '@effect/platform-node'
import { Layer } from 'effect'
import { createCorsLayer } from '../api/cors'
import { TeacherExamApi } from '../api/definition'
import { HealthLive } from '../api/handlers/health'
import { DevAuthLive } from '../api/handlers/dev-auth'
import { PublicExamsLive } from '../api/handlers/public-exams'
import { MeLive } from '../api/handlers/me'
import { ExamsLive } from '../api/handlers/exams'
import { QuestionsLive } from '../api/handlers/questions'
import { AiLive } from '../api/handlers/ai'
import { getSharedDatabaseLayer } from '../api/services/bootstrap-db'
import { CurriculumServiceLive } from '../api/services/curriculum-service'
import { AppConfigLive } from '../api/services/app-config'
import { AuthServiceLive } from '../api/services/auth-service'
import { createTelemetryLayer } from '../api/telemetry'
import { AiLayer } from '../api/services/ai'
import { AuthorizationLive } from '../api/middleware/auth'
import { AiGenerateRateLimitLive, GlobalRateLimitLive } from '../api/middleware/rate-limit'

const MiddlewareLive = Layer.mergeAll(
  AuthorizationLive,
  GlobalRateLimitLive,
  AiGenerateRateLimitLive,
)

const HandlersLive = Layer.mergeAll(
  HealthLive,
  DevAuthLive,
  PublicExamsLive,
  MeLive,
  ExamsLive,
  QuestionsLive,
  AiLive,
)

const ApiLive = HttpApiBuilder.api(TeacherExamApi).pipe(
  Layer.provide(HandlersLive),
  Layer.provide(MiddlewareLive),
)

export const HttpApiLayer = Layer.mergeAll(ApiLive, createCorsLayer()).pipe(
  Layer.provide(AiLayer),
)

export function createWebHandlerLayer(extraLayers: Layer.Layer<never> = Layer.empty) {
  const CoreLive = Layer.mergeAll(
    AppConfigLive,
    NodeContext.layer,
    getSharedDatabaseLayer(),
    AuthServiceLive,
  )

  const SupportingLive = Layer.mergeAll(
    CurriculumServiceLive,
    createTelemetryLayer(),
  ).pipe(Layer.provide(CoreLive))

  return Layer.mergeAll(
    HttpApiLayer,
    CoreLive,
    SupportingLive,
    extraLayers,
    HttpServer.layerContext,
  )
}
