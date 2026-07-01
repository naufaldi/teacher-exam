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
      let selectCount = 0
      let insertedRows: ReadonlyArray<Record<string, unknown>> | undefined
      ;(db.select as Mock).mockImplementation(() => {
        selectCount++
        if (selectCount === 1) return makeChain([])
        return makeChain([{ id: "chunk-1" }])
      })
      ;(db.insert as Mock).mockImplementation(() => {
        return {
          values: (rows: ReadonlyArray<Record<string, unknown>>) => {
            insertedRows = rows
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
})
