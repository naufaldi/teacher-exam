import { NodeContext } from "@effect/platform-node"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServer from "@effect/platform/HttpServer"
import { Layer } from "effect"
import { createCorsLayer } from "../api/cors"
import { TeacherExamApi } from "../api/definition"
import { AiLive } from "../api/handlers/ai"
import { BankLive } from "../api/handlers/bank"
import { BankPublicLive } from "../api/handlers/bank-public"
import { CurriculumLive } from "../api/handlers/curriculum"
import { DevAuthLive } from "../api/handlers/dev-auth"
import { ExamsLive } from "../api/handlers/exams"
import { HealthLive } from "../api/handlers/health"
import { MeLive } from "../api/handlers/me"
import { PublicExamsLive } from "../api/handlers/public-exams"
import { QuestionsLive } from "../api/handlers/questions"
import { AuthorizationLive } from "../api/middleware/auth"
import { PublicBankIpRateLimitLive } from "../api/middleware/ip-rate-limit"
import { AiGenerateRateLimitLive, GlobalRateLimitLive } from "../api/middleware/rate-limit"
import { AiLayer } from "../api/services/ai"
import { AppConfigLive } from "../api/services/app-config"
import { AuthServiceLive } from "../api/services/auth-service"
import { BankServiceLive } from "../api/services/bank-service"
import { getSharedDatabaseLayer } from "../api/services/bootstrap-db"
import { CurriculumServiceLive } from "../api/services/curriculum-service"
import { createTelemetryLayer } from "../api/telemetry"

const BankServiceWithDbLive = BankServiceLive.pipe(Layer.provide(getSharedDatabaseLayer()))

const CoreLive = Layer.mergeAll(
  AppConfigLive,
  NodeContext.layer,
  getSharedDatabaseLayer(),
  AuthServiceLive,
  BankServiceWithDbLive
)

const MiddlewareLive = Layer.mergeAll(
  AuthorizationLive,
  GlobalRateLimitLive,
  AiGenerateRateLimitLive,
  PublicBankIpRateLimitLive
).pipe(Layer.provideMerge(CoreLive))

const SupportingLive = Layer.mergeAll(
  CurriculumServiceLive,
  createTelemetryLayer()
)

const HandlersLive = Layer.mergeAll(
  HealthLive,
  DevAuthLive,
  PublicExamsLive,
  CurriculumLive,
  MeLive,
  ExamsLive,
  QuestionsLive,
  AiLive,
  BankLive,
  BankPublicLive
)

const ApiLive = HttpApiBuilder.api(TeacherExamApi).pipe(
  Layer.provide(HandlersLive),
  Layer.provide(MiddlewareLive),
  Layer.provide(AiLayer),
  Layer.provideMerge(createCorsLayer())
)

export const HttpApiLayer = ApiLive.pipe(
  Layer.provideMerge(SupportingLive),
  Layer.provideMerge(CoreLive)
)

export function createWebHandlerLayer(extraLayers: Layer.Layer<never> = Layer.empty) {
  return HttpApiLayer.pipe(
    Layer.provideMerge(extraLayers),
    Layer.provideMerge(HttpServer.layerContext)
  )
}
