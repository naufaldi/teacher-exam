import { NodeContext } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { getSharedDatabaseLayer } from "../api/services/bootstrap-db"
import { CurriculumServiceLive } from "../api/services/curriculum-service"
import { FilesystemObjectStorageLive } from "../api/services/object-storage-filesystem"
import { processQueuedGenerationJobs } from "../jobs/generation-worker"
import { processQueuedIngestJobs } from "../jobs/ingest-worker"
import { createDefaultAiService } from "../services/AiService"

const WORKER_INTERVAL_MS = 2000

export function startBackgroundWorkers(): () => void {
  const aiService = createDefaultAiService()
  const layer = Layer.mergeAll(
    getSharedDatabaseLayer(),
    CurriculumServiceLive,
    FilesystemObjectStorageLive
  ).pipe(Layer.provide(NodeContext.layer))

  const tick = () => {
    void Effect.runPromise(
      processQueuedIngestJobs(3).pipe(Effect.provide(layer), Effect.ignore)
    )
    void Effect.runPromise(
      processQueuedGenerationJobs(aiService, 2).pipe(Effect.provide(layer), Effect.ignore)
    )
  }

  tick()
  const handle = setInterval(tick, WORKER_INTERVAL_MS)
  return () => clearInterval(handle)
}
