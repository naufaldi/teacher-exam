import { assert, describe, it } from "@effect/vitest"
import { db } from "@teacher-exam/db"
import type { CurriculumSourceManifestItem, ExamSubject } from "@teacher-exam/shared"
import { Effect, Layer } from "effect"
import type { Mock } from "vitest"
import { DbClient } from "../../src/api/services/db.js"
import { makeChain } from "../../src/routes/__test__/helpers.js"
import {
  buildCorpusChunkRows,
  corpusDocId,
  indexCorpusSubjectGrade,
  listReadyCorpusTargets
} from "../lib/index-corpus-chunks.js"

const SAMPLE_MARKDOWN = `# Matematika Kelas 5

## Bab 1: Bilangan Bulat
Konten bab satu untuk pengujian chunk.

## Bab 2: Pecahan
Konten bab dua untuk pengujian chunk.
`

const baseManifestEntry = {
  subjectKey: "matematika",
  label: "Matematika",
  grade: 5,
  phase: "C",
  curriculumVersion: "merdeka-2025",
  sourceType: "sibi_pdf",
  sourceFilename: "Matematika-BS-KLS-V.pdf",
  status: "ready"
} satisfies CurriculumSourceManifestItem

describe("index-corpus-chunks", () => {
  it("builds corpus doc id from subject and grade", () => {
    assert.strictEqual(corpusDocId("matematika", 5), "corpus:matematika:5")
  })

  it("chunks markdown by Bab sections with corpus metadata", () => {
    const rows = buildCorpusChunkRows("matematika", 5, SAMPLE_MARKDOWN)
    assert.isTrue(rows.length >= 2)
    assert.strictEqual(rows[0]?.docId, "corpus:matematika:5")
    assert.strictEqual(rows[0]?.source, "corpus")
    assert.isTrue(rows.every((row) => row.embedding.length > 0))
    assert.isTrue(rows.some((row) => String(row.metadata["babHint"]).includes("Bab 1")))
    assert.isTrue(rows.some((row) => String(row.metadata["babHint"]).includes("Bab 2")))
  })

  it("lists only ready SIBI corpus targets from manifest", () => {
    const targets = listReadyCorpusTargets([
      baseManifestEntry,
      { ...baseManifestEntry, grade: 4, status: "missing" }
    ])
    assert.deepStrictEqual(targets, [{ subjectKey: "matematika", grade: 5 }])
  })

  it.effect("indexes corpus chunks once and skips on re-run", () =>
    Effect.gen(function*() {
      let insertedRows: ReadonlyArray<Record<string, unknown>> | undefined
      let storedMeta: Array<Record<string, unknown>> = []
      ;(db.select as Mock).mockImplementation(() =>
        makeChain(storedMeta.map((metadata, index) => ({
          id: `chunk-${index}`,
          metadata
        })))
      )
      ;(db.insert as Mock).mockImplementation(() => {
        return {
          values: (rows: ReadonlyArray<Record<string, unknown>>) => {
            insertedRows = rows
            storedMeta = rows.map((row) => (row["metadata"] ?? {}) as Record<string, unknown>)
            return makeChain(undefined)
          }
        }
      })

      const first = yield* indexCorpusSubjectGrade(
        "matematika" as ExamSubject,
        5,
        SAMPLE_MARKDOWN
      )
      const second = yield* indexCorpusSubjectGrade(
        "matematika" as ExamSubject,
        5,
        SAMPLE_MARKDOWN
      )

      assert.strictEqual(first.indexed, true)
      assert.isTrue((first.chunkCount ?? 0) > 0)
      assert.strictEqual(second.indexed, false)
      assert.strictEqual(second.chunkCount, 0)
      assert.isTrue((insertedRows?.length ?? 0) > 0)
    }).pipe(Effect.provide(Layer.succeed(DbClient, db as never))))

  it.effect("reindexes only the bab whose text changed", () =>
    Effect.gen(function*() {
      const inserted: Array<ReadonlyArray<Record<string, unknown>>> = []
      let stored: Array<Record<string, unknown>> = []
      ;(db.select as Mock).mockImplementation(() =>
        makeChain(stored.map((row) => ({
          id: row["id"],
          metadata: row["metadata"]
        })))
      )
      ;(db.insert as Mock).mockImplementation(() => ({
        values: (rows: ReadonlyArray<Record<string, unknown>>) => {
          inserted.push(rows)
          stored = [
            ...stored,
            ...rows.map((row, index) => ({
              ...row,
              id: `chunk-${stored.length + index}`
            }))
          ]
          return makeChain(undefined)
        }
      }))
      ;(db.delete as Mock).mockImplementation(() => makeChain(undefined))

      yield* indexCorpusSubjectGrade("matematika" as ExamSubject, 5, SAMPLE_MARKDOWN)
      inserted.length = 0
      const edited = SAMPLE_MARKDOWN.replace(
        "Konten bab dua untuk pengujian chunk.",
        "Konten bab dua sudah diubah."
      )
      const second = yield* indexCorpusSubjectGrade("matematika" as ExamSubject, 5, edited)
      const batch = inserted[0] ?? []
      const contents = batch.map((row) => String(row["content"])).join("\n")

      assert.strictEqual(second.indexed, true)
      assert.ok(contents.includes("Konten bab dua sudah diubah."))
      assert.ok(!contents.includes("Konten bab satu untuk pengujian chunk."))
    }).pipe(Effect.provide(Layer.succeed(DbClient, db as never))))
})
