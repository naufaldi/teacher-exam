import type { SqlClient } from "@effect/sql/SqlClient"
import { Effect } from "effect"
import type { ApiDatabaseError } from "../../api/errors/http"
import type { DbClient } from "../../api/services/db"
import { searchChunks } from "./search-chunks"

const MAX_AGENTIC_STEPS = 3

export interface AgenticSearchInput {
  readonly query: string
  readonly docIds: ReadonlyArray<string>
  readonly source: "corpus" | "teacher_pdf"
  readonly babNumbers?: ReadonlyArray<string> | undefined
}

export interface AgenticSearchResult {
  readonly material: string
  readonly trace: ReadonlyArray<string>
}

export function agenticSearch(
  input: AgenticSearchInput
): Effect.Effect<AgenticSearchResult, ApiDatabaseError, DbClient | SqlClient> {
  return Effect.gen(function*() {
    const trace: Array<string> = []
    const queries = [
      input.query,
      `${input.query} penjelasan materi`,
      `${input.query} contoh soal latihan`
    ]

    const seen = new Set<string>()
    const collected: Array<string> = []

    for (let step = 0; step < MAX_AGENTIC_STEPS; step++) {
      const stepQuery = queries[step] ?? input.query
      const chunks = yield* searchChunks(stepQuery, {
        docIds: input.docIds,
        source: input.source,
        ...(input.babNumbers !== undefined ? { babNumbers: input.babNumbers } : {})
      }).pipe(Effect.catchAll(() => Effect.succeed([])))

      trace.push(`step${step + 1}:${stepQuery}:${chunks.length}`)
      for (const chunk of chunks) {
        if (seen.has(chunk.id)) continue
        seen.add(chunk.id)
        collected.push(chunk.content)
      }
      if (collected.join("\n").length >= 4000) break
    }

    return {
      material: collected.join("\n\n"),
      trace
    }
  })
}
