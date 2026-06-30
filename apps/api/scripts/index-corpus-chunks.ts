import { Effect, Layer } from "effect"
import { startDatabase } from "../src/api/services/bootstrap-db.js"
import { DbClient } from "../src/api/services/db.js"
import { defaultCurriculumMdDir, indexCurriculumMdDirectory } from "../src/lib/retrieval/index-corpus-chunks.js"

async function main() {
  const db = await startDatabase()
  const dbLayer = Layer.succeed(DbClient, db)
  const mdDir = process.argv.includes("--dir")
    ? process.argv[process.argv.indexOf("--dir") + 1]
    : defaultCurriculumMdDir()

  if (mdDir === undefined || mdDir === "") {
    throw new Error("Usage: index-corpus-chunks.ts [--dir /path/to/md]")
  }

  const result = await Effect.runPromise(
    indexCurriculumMdDirectory(mdDir).pipe(Effect.provide(dbLayer))
  )

  console.log(
    `[index-corpus] indexed ${result.indexed} corpus file(s), ${result.chunks} chunk row(s) from ${mdDir}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
