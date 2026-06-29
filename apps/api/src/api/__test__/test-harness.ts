import { NodeContext } from "@effect/platform-node"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServer from "@effect/platform/HttpServer"
import { db } from "@teacher-exam/db"
import { Effect, Layer, Stream } from "effect"
import { createCorsLayer } from "../cors"
import { TeacherExamApi } from "../definition"
import { AiLive } from "../handlers/ai"
import { AnalyticsLive } from "../handlers/analytics"
import { BankLive } from "../handlers/bank"
import { BankPublicLive } from "../handlers/bank-public"
import { ClassesLive } from "../handlers/classes"
import { CurriculumLive } from "../handlers/curriculum"
import { DevAuthLive } from "../handlers/dev-auth"
import { ExamsLive } from "../handlers/exams"
import { ExportsLive, PublicExportsLive } from "../handlers/export"
import { HealthLive } from "../handlers/health"
import { MeLive } from "../handlers/me"
import { PublicExamsLive } from "../handlers/public-exams"
import { QuestionsLive } from "../handlers/questions"
import { ResultsLive } from "../handlers/results"
import { PublicSessionsLive, SessionsLive } from "../handlers/sessions"
import { TemplatesLive } from "../handlers/templates"
import { attachRateLimitHeaders } from "../lib/rate-limit-response"
import { AuthorizationLive, TestAuthorizationLive } from "../middleware/auth"
import { createTestPublicBankIpRateLimitLive, PublicBankIpRateLimitLive } from "../middleware/ip-rate-limit"
import {
  AiGenerateRateLimitLive,
  createTestAiGenerateRateLimitLive,
  createTestGlobalRateLimitLive,
  GlobalRateLimitLive
} from "../middleware/rate-limit"
import { type AiClient, TestAiLayer } from "../services/ai"
import { AnalyticsServiceLive } from "../services/analytics-service"
import type { AuthService } from "../services/auth-service"
import { AuthServiceLive } from "../services/auth-service"
import { BankServiceLive } from "../services/bank-service"
import { ClassServiceLive } from "../services/class-service"
import { type CurriculumService, TestCurriculumLayer } from "../services/curriculum-service"
import type { ExportService } from "../services/export-service"
import { ExportServiceLive } from "../services/export-service"
import { GradingServiceLive } from "../services/grading-service"
import { FilesystemObjectStorageLive } from "../services/object-storage-filesystem"
import { SessionServiceLive } from "../services/session-service"
import { TemplateServiceLive } from "../services/template-service"
import { createTestDbLayer, TestSqlLayer } from "../services/test-db"

import type { AiService } from "../../services/AiService"

const defaultTestAiService: AiService = {
  generate: () => Effect.succeed([]),
  generateRaw: () => Effect.succeed("[]"),
  validateCurriculum: ({ expectedCount }) =>
    Effect.succeed(
      Array.from({ length: expectedCount }, (_, i) => ({
        number: i + 1,
        status: "valid" as const,
        reason: "Sesuai CP."
      }))
    ),
  generateDiscussion: () => Effect.succeed(""),
  streamDiscussion: () => Stream.succeed("")
}

const HandlerLayers = Layer.mergeAll(
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

function createMiddlewareLayer(opts: {
  userId?: string
  rateLimit?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
  publicBankRateLimit?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
  aiRateLimit?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
  authLayer?: Layer.Layer<AuthService>
}) {
  const authMiddlewareLayer = opts.userId
    ? TestAuthorizationLive(opts.userId)
    : AuthorizationLive.pipe(Layer.provide(opts.authLayer ?? AuthServiceLive))
  const rateLayer = opts.rateLimit
    ? createTestGlobalRateLimitLive(opts.rateLimit)
    : GlobalRateLimitLive
  const publicBankRateLayer = opts.publicBankRateLimit
    ? createTestPublicBankIpRateLimitLive(opts.publicBankRateLimit)
    : PublicBankIpRateLimitLive
  const aiRateLayer = opts.aiRateLimit
    ? createTestAiGenerateRateLimitLive(opts.aiRateLimit)
    : AiGenerateRateLimitLive

  return Layer.mergeAll(authMiddlewareLayer, rateLayer, aiRateLayer, publicBankRateLayer)
}

const TestDbLayer = createTestDbLayer(db as unknown as AppDb)

export function createHttpApiTestLayer(opts: {
  userId?: string
  authenticated?: boolean
  aiService?: AiService
  rateLimit?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
  publicBankRateLimit?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
  aiRateLimit?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
  authLayer?: Layer.Layer<AuthService>
  curriculumLayer?: Layer.Layer<CurriculumService>
  exportServiceLayer?: Layer.Layer<ExportService>
} = {}) {
  const apiLayer = HttpApiBuilder.api(TeacherExamApi).pipe(
    Layer.provide(HandlerLayers),
    Layer.provide(
      createMiddlewareLayer({
        ...(opts.userId !== undefined ? { userId: opts.userId } : {}),
        ...(opts.rateLimit !== undefined ? { rateLimit: opts.rateLimit } : {}),
        ...(opts.publicBankRateLimit !== undefined
          ? { publicBankRateLimit: opts.publicBankRateLimit }
          : {}),
        ...(opts.aiRateLimit !== undefined ? { aiRateLimit: opts.aiRateLimit } : {}),
        ...(opts.authLayer !== undefined ? { authLayer: opts.authLayer } : {})
      })
    )
  )

  return Layer.mergeAll(
    apiLayer,
    createCorsLayer(),
    TestDbLayer,
    TestSqlLayer,
    TestAiLayer(opts.aiService ?? defaultTestAiService),
    BankServiceLive.pipe(Layer.provide(TestDbLayer)),
    TemplateServiceLive.pipe(Layer.provide(TestDbLayer)),
    ClassServiceLive.pipe(Layer.provide(TestDbLayer)),
    SessionServiceLive.pipe(Layer.provide(TestDbLayer)),
    GradingServiceLive.pipe(Layer.provide(TestDbLayer)),
    AnalyticsServiceLive.pipe(Layer.provide(TestDbLayer)),
    FilesystemObjectStorageLive.pipe(Layer.provide(NodeContext.layer)),
    opts.exportServiceLayer ?? ExportServiceLive,
    opts.curriculumLayer ?? TestCurriculumLayer(),
    opts.authLayer ?? AuthServiceLive,
    HttpServer.layerContext
  )
}

export function buildTestHandler(opts: Parameters<typeof createHttpApiTestLayer>[0] = {}) {
  const { dispose, handler } = HttpApiBuilder.toWebHandler(createHttpApiTestLayer(opts))

  return {
    request: async (path: string, init?: RequestInit) =>
      attachRateLimitHeaders(await handler(new Request(`http://localhost${path}`, init))),
    dispose
  }
}

export type { AiClient }
