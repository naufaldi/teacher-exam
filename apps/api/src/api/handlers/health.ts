import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import { Effect } from "effect"
import { probeOpenAiGenerate } from "../../lib/effect-ai/provider-http"
import { describeAiConfig } from "../../lib/production-ai-config"
import { TeacherExamApi } from "../definition"
import { ApiAiGenerationError, ApiForbidden } from "../errors/http"
import { TEACHER_EXAM_PEER_HEADER } from "../middleware/ip-rate-limit"

const LIVE_PROBE_FORBIDDEN = "AI live health is only available from inside the API container."

function isLoopbackPeer(peer: string | undefined): boolean {
  if (peer === undefined) return false
  const normalized = peer.toLowerCase().startsWith("::ffff:") ? peer.slice("::ffff:".length) : peer
  return normalized === "127.0.0.1" || normalized === "::1"
}

function readStampedPeer(headers: HttpServerRequest.HttpServerRequest["headers"]): string | undefined {
  const value = headers[TEACHER_EXAM_PEER_HEADER]
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const HealthLive = HttpApiBuilder.group(
  TeacherExamApi,
  "health",
  (handlers) =>
    handlers
      .handle("getHealth", () =>
        Effect.succeed({
          status: "ok",
          service: "teacher-exam-api",
          timestamp: new Date().toISOString()
        }))
      .handle("getAiHealth", () =>
        Effect.sync(() => {
          const presence = describeAiConfig(process.env)
          return {
            status: "ok" as const,
            provider: presence.provider,
            model: presence.model,
            keyConfigured: presence.keyConfigured
          }
        }))
      .handle("getAiLiveHealth", () =>
        Effect.gen(function*() {
          const request = yield* HttpServerRequest.HttpServerRequest
          if (!isLoopbackPeer(readStampedPeer(request.headers))) {
            return yield* Effect.fail(
              new ApiForbidden({
                error: "Forbidden",
                message: LIVE_PROBE_FORBIDDEN
              })
            )
          }
          const result = yield* Effect.promise(() => probeOpenAiGenerate(process.env))
          if (!result.ok) {
            return yield* Effect.fail(
              new ApiAiGenerationError({
                error: "AI generation failed",
                message: result.message
              })
            )
          }
          return {
            status: "ok" as const,
            provider: "openai" as const,
            model: result.model
          }
        }))
)
