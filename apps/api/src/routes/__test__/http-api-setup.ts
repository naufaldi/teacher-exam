import type { AiService } from '../../services/AiService'
import { buildTestHandler } from '../../api/__test__/test-harness'

export function buildHttpApiTestApp(opts: {
  userId?: string
  authenticated?: boolean
  aiService?: AiService
  rateLimit?: {
    windows: ReadonlyArray<{ windowMs: number; max: number }>
    now?: () => number
  }
} = {}) {
  return buildTestHandler({
    ...(opts.userId !== undefined ? { userId: opts.userId } : {}),
    ...(opts.authenticated !== undefined ? { authenticated: opts.authenticated } : {}),
    ...(opts.aiService !== undefined ? { aiService: opts.aiService } : {}),
    ...(opts.rateLimit !== undefined ? { rateLimit: opts.rateLimit } : {}),
  })
}
