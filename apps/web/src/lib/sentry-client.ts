import type { captureMessage, init } from "@sentry/react"
import { type FunnelSink } from "@teacher-exam/shared/funnel"

type SentryClient = {
  init: typeof init
  captureMessage: typeof captureMessage
}

let installed: FunnelSink | undefined
let client: Promise<SentryClient> | undefined

function readDsn(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) return undefined
  return value
}

function loadSentry(dsn: string): Promise<SentryClient> {
  if (client === undefined) {
    client = import("@sentry/react").then((sentry) => {
      sentry.init({ dsn })
      return sentry
    })
  }
  return client
}

export function initWebSentry(): Promise<void> {
  const dsn = readDsn(import.meta.env["VITE_SENTRY_DSN"])
  if (dsn === undefined) return Promise.resolve()
  return loadSentry(dsn).then(() => undefined)
}

function sentrySink(): FunnelSink {
  const dsn = readDsn(import.meta.env["VITE_SENTRY_DSN"])
  return {
    dsn,
    append(_stage) {},
    network(stage) {
      if (dsn === undefined) return
      void loadSentry(dsn).then((sentry) => {
        sentry.captureMessage("funnel", {
          level: "info",
          tags: { funnel_stage: stage }
        })
      })
    }
  }
}

export function installFunnelSink(sink: FunnelSink): void {
  installed = sink
}

export function resetFunnelSink(): void {
  installed = undefined
}

export function activeFunnelSink(): FunnelSink {
  if (installed !== undefined) return installed
  return sentrySink()
}
