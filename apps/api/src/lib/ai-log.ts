import { getActiveTraceId } from '../api/telemetry'

function redactSecrets(msg: string, max = 800): string {
  const s = msg
    .replace(/\bsk-ant-[a-zA-Z0-9_-]{20,}/g, 'sk-ant-[REDACTED]')
    .replace(/\btp-[a-zA-Z0-9_-]{20,}/g, 'tp-[REDACTED]')
  return s.length > max ? `${s.slice(0, max)}…` : s
}

export function isAiLogEnabled(): boolean {
  const on = process.env['AI_LOG']
  if (on === '1' || on === 'true') return true
  if (process.env['DEV_AUTH_ENABLED'] === 'true') return true
  if (process.env['NODE_ENV'] === 'development') return true
  return false
}

/**
 * Structured AI logs (no raw API keys). Failures always emit `warn`.
 * Success / request detail: `AI_LOG=1`, or auto-on in local dev (`DEV_AUTH_ENABLED`, `NODE_ENV=development`).
 */
export function logAiEvent(
  scope: string,
  level: 'info' | 'warn',
  data: Record<string, unknown>,
): void {
  if (level === 'info' && !isAiLogEnabled()) return

  const traceId = getActiveTraceId()
  const safe: Record<string, unknown> = {
    scope,
    ...data,
    ...(traceId !== undefined ? { traceId } : {}),
  }
  for (const key of ['cause', 'message', 'error']) {
    const v = safe[key]
    if (typeof v === 'string') safe[key] = redactSecrets(v)
  }

  const line = `[ai] ${JSON.stringify(safe)}`
  if (level === 'warn') console.warn(line)
  else console.info(line)
}
