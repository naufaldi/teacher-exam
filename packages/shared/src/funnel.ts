export type FunnelStage = "signup" | "generate" | "print"

export type FunnelSink = {
  readonly dsn: string | undefined
  append: (stage: FunnelStage) => void
  network: (stage: FunnelStage) => void
}

export function recordFunnelStage(stage: FunnelStage, sink: FunnelSink): void {
  sink.append(stage)
  if (sink.dsn !== undefined && sink.dsn.length > 0) {
    sink.network(stage)
  }
}
