import { logAiEvent } from '../ai-log'

export interface GenerateTextLogMeta {
  model: string
  event: string
  durationMs: number
  finishReason?: string
  usage?: unknown
  status?: number
  message?: string
}

export function logGenerateTextSuccess(meta: GenerateTextLogMeta): void {
  logAiEvent(meta.event, 'info', {
    model: meta.model,
    durationMs: meta.durationMs,
    ...(meta.finishReason !== undefined ? { finishReason: meta.finishReason } : {}),
    ...(meta.usage !== undefined ? { usage: meta.usage } : {}),
  })
}

export function logGenerateTextFailure(meta: GenerateTextLogMeta): void {
  logAiEvent(meta.event, 'warn', {
    model: meta.model,
    durationMs: meta.durationMs,
    ...(meta.status !== undefined ? { status: meta.status } : {}),
    ...(meta.message !== undefined ? { message: meta.message } : {}),
    ...(meta.finishReason !== undefined ? { finishReason: meta.finishReason } : {}),
  })
}
