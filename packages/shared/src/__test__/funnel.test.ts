import { describe, expect, it } from "vitest"
import { recordFunnelStage, type FunnelSink, type FunnelStage } from "../funnel.js"

function fakeSink(dsn: string | undefined): {
  sink: FunnelSink
  stages: FunnelStage[]
  networkStages: FunnelStage[]
} {
  const stages: FunnelStage[] = []
  const networkStages: FunnelStage[] = []
  const sink: FunnelSink = {
    dsn,
    append(stage) {
      stages.push(stage)
    },
    network(stage) {
      networkStages.push(stage)
    }
  }
  return { sink, stages, networkStages }
}

describe("recordFunnelStage", () => {
  it("records signup, then generate, then print, and skips network when the DSN is missing", () => {
    const missing = fakeSink(undefined)
    recordFunnelStage("signup", missing.sink)
    recordFunnelStage("generate", missing.sink)
    recordFunnelStage("print", missing.sink)

    expect(missing.stages).toEqual(["signup", "generate", "print"])
    expect(missing.networkStages).toEqual([])

    const present = fakeSink("https://public@example.ingest.sentry.io/1")
    recordFunnelStage("signup", present.sink)
    recordFunnelStage("generate", present.sink)
    recordFunnelStage("print", present.sink)

    expect(present.stages).toEqual(["signup", "generate", "print"])
    expect(present.networkStages).toEqual(["signup", "generate", "print"])
  })
})
