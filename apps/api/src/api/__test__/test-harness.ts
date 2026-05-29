import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServer from "@effect/platform/HttpServer"
import { db } from "@teacher-exam/db"
import { Effect, Layer, Stream } from "effect"
import { createCorsLayer } from "../cors"
import { TeacherExamApi } from "../definition"
import { AiLive } from "../handlers/ai"
import { BankLive } from "../handlers/bank"
import { BankPublicLive } from "../handlers/bank-public"
import { DevAuthLive } from "../handlers/dev-auth"
import { ExamsLive } from "../handlers/exams"
import { HealthLive } from "../handlers/health"
import { MeLive } from "../handlers/me"
import { PublicExamsLive } from "../handlers/public-exams"
import { QuestionsLive } from "../handlers/questions"
import { attachRateLimitHeaders } from "../lib/rate-limit-response"
import { AuthorizationLive, TestAuthorizationLive } from "../middleware/auth"
import { createTestPublicBankIpRateLimitLive, PublicBankIpRateLimitLive } from "../middleware/ip-rate-limit"
import { AiGenerateRateLimitLive, createTestGlobalRateLimitLive, GlobalRateLimitLive } from "../middleware/rate-limit"
import { type AiClient, TestAiLayer } from "../services/ai"
import { AuthServiceLive } from "../services/auth-service"
import { BankServiceLive } from "../services/bank-service"
import { type CurriculumService, TestCurriculumLayer } from "../services/curriculum-service"
import type { AppDb } from "../services/db"
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
  MeLive,
  ExamsLive,
  QuestionsLive,
  AiLive,
  BankLive,
  BankPublicLive
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
  authLayer?: Layer.Layer<import("../services/auth-service").AuthService>
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

  return Layer.mergeAll(authMiddlewareLayer, rateLayer, AiGenerateRateLimitLive, publicBankRateLayer)
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
  authLayer?: Layer.Layer<import("../services/auth-service").AuthService>
  curriculumLayer?: Layer.Layer<CurriculumService>
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
