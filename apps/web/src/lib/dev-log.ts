/**
 * Structured dev-only console logs. No-op in production builds.
 */
export function devLog(scope: string, data: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return
  console.info(`[dev] ${JSON.stringify({ scope, ...data })}`)
}
