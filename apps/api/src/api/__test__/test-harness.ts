import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { Effect, Layer, Stream } from 'effect'
import { HealthLive } from '../handlers/health'
import { DevAuthLive } from '../handlers/dev-auth'
import { PublicExamsLive } from '../handlers/public-exams'
import { MeLive } from '../handlers/me'
import { ExamsLive } from '../handlers/exams'
import { QuestionsLive } from '../handlers/questions'
import { AiLive } from '../handlers/ai'
import { BankLive } from '../handlers/bank'
import { TeacherExamApi } from '../definition'
import { BankServiceLive } from '../services/bank-service'
import { createCorsLayer } from '../cors'
import { DbLayer } from '../services/db'
import { createTestDbLayer, TestSqlLayer } from '../services/test-db'
import { TestAiLayer, type AiClient } from '../services/ai'
import { TestCurriculumLayer, type CurriculumService } from '../services/curriculum-service'
import { TestAuthServiceLayer, AuthServiceLive } from '../services/auth-service'
import { AuthorizationLive, TestAuthorizationLive } from '../middleware/auth'
import {
  AiGenerateRateLimitLive,
  GlobalRateLimitLive,
  createTestGlobalRateLimitLive,
} from '../middleware/rate-limit'
import { attachRateLimitHeaders } from '../lib/rate-limit-response'
import { db } from '@teacher-exam/db'
import type { AppDb } from '../services/db'

import type { AiService } from '../../services/AiService'

const defaultTestAiService: AiService = {
  generate: () => Effect.succeed([]),
  generateRaw: () => Effect.succeed('[]'),
  validateCurriculum: ({ expectedCount }) =>
    Effect.succeed(
      Array.from({ length: expectedCount }, (_, i) => ({
        number: i + 1,
        status: 'valid' as const,
        reason: 'Sesuai CP.',
      })),
    ),
  generateDiscussion: () => Effect.succeed(''),
  streamDiscussion: () => Stream.succeed(''),
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
)

function createMiddlewareLayer(opts: {
  userId?: string
  rateLimit?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
  authLayer?: Layer.Layer<import('../services/auth-service').AuthService>
}) {
  const authMiddlewareLayer = opts.userId
    ? TestAuthorizationLive(opts.userId)
    : AuthorizationLive.pipe(Layer.provide(opts.authLayer ?? AuthServiceLive))
  const rateLayer = opts.rateLimit
    ? createTestGlobalRateLimitLive(opts.rateLimit)
    : GlobalRateLimitLive

  return Layer.mergeAll(authMiddlewareLayer, rateLayer, AiGenerateRateLimitLive)
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
  authLayer?: Layer.Layer<import('../services/auth-service').AuthService>
  curriculumLayer?: Layer.Layer<CurriculumService>
} = {}) {
  const apiLayer = HttpApiBuilder.api(TeacherExamApi).pipe(
    Layer.provide(HandlerLayers),
    Layer.provide(
      createMiddlewareLayer({
        ...(opts.userId !== undefined ? { userId: opts.userId } : {}),
        ...(opts.rateLimit !== undefined ? { rateLimit: opts.rateLimit } : {}),
        ...(opts.authLayer !== undefined ? { authLayer: opts.authLayer } : {}),
      }),
    ),
  )

  return Layer.mergeAll(
    apiLayer,
    createCorsLayer(),
    TestDbLayer,
    TestSqlLayer,
    TestAiLayer(opts.aiService ?? defaultTestAiService),
    BankServiceLive,
    opts.curriculumLayer ?? TestCurriculumLayer(),
    opts.authLayer ?? AuthServiceLive,
    HttpServer.layerContext,
  )
}

export function buildTestHandler(opts: Parameters<typeof createHttpApiTestLayer>[0] = {}) {
  const { handler, dispose } = HttpApiBuilder.toWebHandler(createHttpApiTestLayer(opts))

  return {
    request: async (path: string, init?: RequestInit) =>
      attachRateLimitHeaders(await handler(new Request(`http://localhost${path}`, init))),
    dispose,
  }
}

export type { AiClient }
