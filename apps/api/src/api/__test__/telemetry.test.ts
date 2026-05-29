import { Effect } from "effect"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getActiveTraceId, isOtelExportEnabled, withHttpSpan } from "../telemetry"

describe("telemetry helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("isOtelExportEnabled is false when env unset", () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    expect(isOtelExportEnabled()).toBe(false)
  })

  it("isOtelExportEnabled is true when env set", () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318/v1/traces")
    expect(isOtelExportEnabled()).toBe(true)
  })

  it("getActiveTraceId returns undefined when OTEL export disabled", () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    expect(getActiveTraceId()).toBeUndefined()
  })

  it("withHttpSpan runs the wrapped effect", async () => {
    const result = await Effect.runPromise(
      withHttpSpan("GET", "/api/health", Effect.succeed("ok"))
    )
    expect(result).toBe("ok")
  })
})

describe("logAiEvent trace correlation", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("omits traceId when no active OTEL span", async () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318/v1/traces")
    vi.stubEnv("AI_LOG", "1")

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})

    const { logAiEvent } = await import("../../lib/ai-log")

    logAiEvent("test.ai", "info", { model: "test-model" })

    expect(infoSpy).toHaveBeenCalled()
    const line = String(infoSpy.mock.calls[0]?.[0])
    const payload = JSON.parse(line.replace("[ai] ", "")) as { traceId?: string; model: string }
    expect(payload.model).toBe("test-model")
    expect(payload.traceId).toBeUndefined()
  })
})
