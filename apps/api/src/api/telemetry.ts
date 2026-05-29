import { NodeSdk } from "@effect/opentelemetry"
import { trace } from "@opentelemetry/api"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { Effect, Layer, Option } from "effect"
import { AppConfig } from "./services/app-config"

export function createTelemetryLayer(): Layer.Layer<never, never, AppConfig> {
  return Layer.unwrapEffect(
    Effect.gen(function*() {
      const config = yield* AppConfig
      const endpoint = config.otelExporterOtlpEndpoint
      if (endpoint === undefined || endpoint.length === 0) {
        return Layer.empty
      }

      return NodeSdk.layer(() => ({
        resource: { serviceName: "teacher-exam-api" },
        spanProcessor: new BatchSpanProcessor(
          new OTLPTraceExporter({ url: endpoint })
        )
      }))
    })
  )
}

export function withDbSpan<A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> {
  return Effect.withSpan(name, { attributes: { "db.system": "postgresql" } })(effect)
}

export function withAiSpan<A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> {
  return Effect.withSpan(name, { attributes: { "ai.system": "teacher-exam" } })(effect)
}

export function withHttpSpan<A, E, R>(
  method: string,
  route: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> {
  return Effect.withSpan("api.request", {
    attributes: {
      "http.method": method,
      "http.route": route
    }
  })(effect)
}

export function isOtelExportEnabled(): boolean {
  const endpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]
  return endpoint !== undefined && endpoint.length > 0
}

export function getActiveTraceId(): string | undefined {
  if (!isOtelExportEnabled()) return undefined
  const span = trace.getActiveSpan()
  const traceId = span?.spanContext().traceId
  if (traceId === undefined || traceId === "00000000000000000000000000000000") {
    return undefined
  }
  return traceId
}

export function optionalSpanAttribute(
  key: string,
  value: string | undefined
): Record<string, string> {
  if (value === undefined) return {}
  return { [key]: value }
}

export { Option }
