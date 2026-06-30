import type { SqlClient } from "@effect/sql/SqlClient"
import { documentChunks } from "@teacher-exam/db"
import { and, eq, inArray } from "drizzle-orm"
import { Effect } from "effect"
import type { ApiDatabaseError } from "../../api/errors/http"
import { runDb } from "../../api/lib/db-effect"
import { DbClient } from "../../api/services/db"
import { cosineSimilarity, embedText } from "./embed"

export interface RetrievalChunk {
  readonly id: string
  readonly content: string
  readonly metadata: Record<string, unknown>
  readonly score: number
}

const TOP_K = 15

export function searchChunks(
  query: string,
  filters: { docIds?: ReadonlyArray<string>; source?: "corpus" | "teacher_pdf"; babNumbers?: ReadonlyArray<string> },
  topK = TOP_K
): Effect.Effect<ReadonlyArray<RetrievalChunk>, ApiDatabaseError, DbClient | SqlClient> {
  return Effect.gen(function*() {
    const db = yield* DbClient
    const queryVector = embedText(query)

    const conditions = []
    if (filters.source !== undefined) {
      conditions.push(eq(documentChunks.source, filters.source))
    }
    if (filters.docIds !== undefined && filters.docIds.length > 0) {
      conditions.push(inArray(documentChunks.docId, [...filters.docIds]))
    }

    const rows = yield* runDb(
      db
        .select({
          id: documentChunks.id,
          content: documentChunks.content,
          metadata: documentChunks.metadata,
          embedding: documentChunks.embedding
        })
        .from(documentChunks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(topK * 10)
    )

    const babSet = filters.babNumbers !== undefined
      ? new Set(filters.babNumbers.map((bab) => String(bab)))
      : null

    return rows
      .map((row) => {
        const metadata = (row.metadata ?? {}) as Record<string, unknown>
        const babNumber = metadata["babNumber"] !== undefined ? String(metadata["babNumber"]) : null
        if (babSet !== null && babNumber !== null && !babSet.has(babNumber)) {
          return null
        }
        const stored = row.embedding ?? []
        const score = stored.length > 0
          ? cosineSimilarity(queryVector, stored)
          : cosineSimilarity(queryVector, embedText(row.content))
        return {
          id: row.id,
          content: row.content,
          metadata,
          score
        }
      })
      .filter((row): row is RetrievalChunk => row !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  })
}
