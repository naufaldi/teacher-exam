import { NodeContext } from "@effect/platform-node"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServer from "@effect/platform/HttpServer"
import { Layer } from "effect"
import { createCorsLayer } from "../api/cors"
import { TeacherExamApi } from "../api/definition"
import { AiLive } from "../api/handlers/ai"
import { AnalyticsLive } from "../api/handlers/analytics"
import { BankLive } from "../api/handlers/bank"
import { BankPublicLive } from "../api/handlers/bank-public"
import { ClassesLive } from "../api/handlers/classes"
import { CurriculumLive } from "../api/handlers/curriculum"
import { DevAuthLive } from "../api/handlers/dev-auth"
import { ExamsLive } from "../api/handlers/exams"
import { ExportsLive, PublicExportsLive } from "../api/handlers/export"
import { HealthLive } from "../api/handlers/health"
import { MeLive } from "../api/handlers/me"
import { PublicExamsLive } from "../api/handlers/public-exams"
import { QuestionsLive } from "../api/handlers/questions"
import { ResultsLive } from "../api/handlers/results"
import { PublicSessionsLive, SessionsLive } from "../api/handlers/sessions"
import { TemplatesLive } from "../api/handlers/templates"
import { AuthorizationLive } from "../api/middleware/auth"
import { PublicBankIpRateLimitLive } from "../api/middleware/ip-rate-limit"
import { AiGenerateRateLimitLive, GlobalRateLimitLive } from "../api/middleware/rate-limit"
import { AiLayer } from "../api/services/ai"
import { AnalyticsServiceLive } from "../api/services/analytics-service"
import { AppConfigLive } from "../api/services/app-config"
import { AuthServiceLive } from "../api/services/auth-service"
import { BankServiceLive } from "../api/services/bank-service"
import { getSharedDatabaseLayer } from "../api/services/bootstrap-db"
import { ClassServiceLive } from "../api/services/class-service"
import { CurriculumServiceLive } from "../api/services/curriculum-service"
import { ExportServiceLive } from "../api/services/export-service"
import { GradingServiceLive } from "../api/services/grading-service"
import { FilesystemObjectStorageLive } from "../api/services/object-storage-filesystem"
import { SessionServiceLive } from "../api/services/session-service"
import { TemplateServiceLive } from "../api/services/template-service"
import { createTelemetryLayer } from "../api/telemetry"

const BankServiceWithDbLive = BankServiceLive.pipe(Layer.provide(getSharedDatabaseLayer()))
const TemplateServiceWithDbLive = TemplateServiceLive.pipe(Layer.provide(getSharedDatabaseLayer()))
const ClassServiceWithDbLive = ClassServiceLive.pipe(Layer.provide(getSharedDatabaseLayer()))
const SessionServiceWithDbLive = SessionServiceLive.pipe(Layer.provide(getSharedDatabaseLayer()))
const GradingServiceWithDbLive = GradingServiceLive.pipe(Layer.provide(getSharedDatabaseLayer()))
const AnalyticsServiceWithDbLive = AnalyticsServiceLive.pipe(Layer.provide(getSharedDatabaseLayer()))

const CoreLive = Layer.mergeAll(
  AppConfigLive,
  NodeContext.layer,
  getSharedDatabaseLayer(),
  AuthServiceLive,
  BankServiceWithDbLive,
  TemplateServiceWithDbLive,
  ClassServiceWithDbLive,
  SessionServiceWithDbLive,
  GradingServiceWithDbLive,
  AnalyticsServiceWithDbLive,
  ExportServiceLive
)

const MiddlewareLive = Layer.mergeAll(
  AuthorizationLive,
  GlobalRateLimitLive,
  AiGenerateRateLimitLive,
  PublicBankIpRateLimitLive
).pipe(Layer.provideMerge(CoreLive))

const SupportingLive = Layer.mergeAll(
  CurriculumServiceLive,
  FilesystemObjectStorageLive.pipe(Layer.provide(NodeContext.layer)),
  createTelemetryLayer()
)

const HandlersLive = Layer.mergeAll(
  HealthLive,
  DevAuthLive,
  PublicExamsLive,
  PublicExportsLive,
  CurriculumLive,
  MeLive,
  ExamsLive,
  ExportsLive,
  QuestionsLive,
  AiLive,
  BankLive,
  BankPublicLive,
  TemplatesLive,
  ClassesLive,
  SessionsLive,
  PublicSessionsLive,
  ResultsLive,
  AnalyticsLive
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
