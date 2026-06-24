import type { Layer } from "effect"
import { buildTestHandler } from "../../api/__test__/test-harness"
import type { AuthService } from "../../api/services/auth-service"
import type { CurriculumService } from "../../api/services/curriculum-service"
import type { AiService } from "../../services/AiService"

export function buildHttpApiTestApp(opts: {
  userId?: string
  authenticated?: boolean
  aiService?: AiService
  authLayer?: Layer.Layer<AuthService>
  curriculumLayer?: Layer.Layer<CurriculumService>
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
} = {}) {
  return buildTestHandler({
    ...(opts.userId !== undefined ? { userId: opts.userId } : {}),
    ...(opts.authenticated !== undefined ? { authenticated: opts.authenticated } : {}),
    ...(opts.aiService !== undefined ? { aiService: opts.aiService } : {}),
    ...(opts.authLayer !== undefined ? { authLayer: opts.authLayer } : {}),
    ...(opts.curriculumLayer !== undefined ? { curriculumLayer: opts.curriculumLayer } : {}),
    ...(opts.rateLimit !== undefined ? { rateLimit: opts.rateLimit } : {}),
    ...(opts.publicBankRateLimit !== undefined
      ? { publicBankRateLimit: opts.publicBankRateLimit }
      : {}),
    ...(opts.aiRateLimit !== undefined ? { aiRateLimit: opts.aiRateLimit } : {})
  })
}
