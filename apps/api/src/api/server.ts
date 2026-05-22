import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { NodeContext, NodeHttpServer } from '@effect/platform-node'
import { Layer } from 'effect'
import { createServer } from 'node:http'
import { resolveApiPort } from '../lib/auth-origins'
import { createCorsLayer } from './cors'
import { TeacherExamApi } from './definition'
import { HealthLive } from './handlers/health'
import { DevAuthLive } from './handlers/dev-auth'
import { PublicExamsLive } from './handlers/public-exams'
import { MeLive } from './handlers/me'
import { ExamsLive } from './handlers/exams'
import { QuestionsLive } from './handlers/questions'
import { AiLive } from './handlers/ai'
import { DbLayer } from './services/db'
import { AiLayer } from './services/ai'
import { AuthorizationLive } from './middleware/auth'
import { AiGenerateRateLimitLive, GlobalRateLimitLive } from './middleware/rate-limit'

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
  Layer.provide(DbLayer),
  Layer.provide(AiLayer),
)

export const ServerLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiLayer),
  HttpServer.withLogAddress,
  Layer.provide(
    NodeHttpServer.layer(createServer, { port: resolveApiPort() }),
  ),
)

export function createWebHandlerLayer(extraLayers: Layer.Layer<never> = Layer.empty) {
  return Layer.mergeAll(
    HttpApiLayer,
    extraLayers,
    HttpServer.layerContext,
    NodeContext.layer,
  )
}
