import { Effect, Layer } from "effect"
import { readFile } from "node:fs/promises"
import { startDatabase } from "../src/api/services/bootstrap-db.js"
import { DbClient } from "../src/api/services/db.js"
import { CURRICULUM_MANIFEST } from "../src/curriculum/manifest.js"
import { curriculumMdPath } from "../src/lib/curriculum.js"
import { indexCorpusSubjectGrade, listReadyCorpusTargets } from "./lib/index-corpus-chunks.js"

/**
 * Pre-index curriculum/md Bab chunks into document_chunks (idempotent).
 * Run via `pnpm --filter @teacher-exam/api index-corpus`.
 */
const program = Effect.gen(function*() {
  const targets = listReadyCorpusTargets(CURRICULUM_MANIFEST)
  let indexedCount = 0
  let skippedCount = 0

  for (const target of targets) {
    const path = curriculumMdPath(target.subjectKey, target.grade)
    const markdown = yield* Effect.tryPromise({
      try: () => readFile(path, "utf8"),
      catch: (cause) => new Error(String(cause))
    }).pipe(
      Effect.catchAll((error) => {
        console.warn(`[index-corpus] skip missing file ${path}: ${error.message}`)
        return Effect.succeed("")
      })
    )
    if (markdown.trim().length === 0) {
      skippedCount += 1
      continue
    }

    const result = yield* indexCorpusSubjectGrade(target.subjectKey, target.grade, markdown)
    if (result.indexed) {
      indexedCount += 1
      console.log(
        `[index-corpus] indexed ${target.subjectKey} kelas ${target.grade} (${result.chunkCount} chunks)`
      )
    } else {
      skippedCount += 1
      console.log(`[index-corpus] skip ${target.subjectKey} kelas ${target.grade} (already indexed or empty)`)
    }
  }

  console.log(`[index-corpus] done — indexed=${indexedCount} skipped=${skippedCount}`)
})

async function main() {
  const db = await startDatabase()
  await Effect.runPromise(program.pipe(Effect.provide(Layer.succeed(DbClient, db))))
}

main().catch((error: unknown) => {
  console.error("[index-corpus] failed:", error)
  process.exit(1)
})
