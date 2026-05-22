import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { Effect, Layer } from 'effect'
import { HealthLive } from '../handlers/health'
import { DevAuthLive } from '../handlers/dev-auth'
import { PublicExamsLive } from '../handlers/public-exams'
import { MeLive } from '../handlers/me'
import { ExamsLive } from '../handlers/exams'
import { QuestionsLive } from '../handlers/questions'
import { AiLive } from '../handlers/ai'
import { TeacherExamApi } from '../definition'
import { createCorsLayer } from '../cors'
import { DbLayer } from '../services/db'
import { TestAiLayer, type AiClient } from '../services/ai'
import { AuthorizationLive, TestAuthorizationLive } from '../middleware/auth'
import {
  AiGenerateRateLimitLive,
  GlobalRateLimitLive,
  createTestGlobalRateLimitLive,
} from '../middleware/rate-limit'
import { attachRateLimitHeaders } from '../lib/rate-limit-response'

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
  streamDiscussion: async function* () {},
}

const HandlerLayers = Layer.mergeAll(
  HealthLive,
  DevAuthLive,
  PublicExamsLive,
  MeLive,
  ExamsLive,
  QuestionsLive,
  AiLive,
)

function createMiddlewareLayer(opts: {
  userId?: string
  rateLimit?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
}) {
  const authLayer = opts.userId ? TestAuthorizationLive(opts.userId) : AuthorizationLive
  const rateLayer = opts.rateLimit
    ? createTestGlobalRateLimitLive(opts.rateLimit)
    : GlobalRateLimitLive

  return Layer.mergeAll(authLayer, rateLayer, AiGenerateRateLimitLive)
}

export function createHttpApiTestLayer(opts: {
  userId?: string
  authenticated?: boolean
  aiService?: AiService
  rateLimit?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
} = {}) {
  const apiLayer = HttpApiBuilder.api(TeacherExamApi).pipe(
    Layer.provide(HandlerLayers),
    Layer.provide(
      createMiddlewareLayer({
        ...(opts.userId !== undefined ? { userId: opts.userId } : {}),
        ...(opts.rateLimit !== undefined ? { rateLimit: opts.rateLimit } : {}),
      }),
    ),
  )

  return Layer.mergeAll(
    apiLayer,
    createCorsLayer(),
    DbLayer,
    TestAiLayer(opts.aiService ?? defaultTestAiService),
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
