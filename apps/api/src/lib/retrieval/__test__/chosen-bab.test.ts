import { db } from "@teacher-exam/db"
import { Effect, Layer } from "effect"
import { beforeEach, describe, expect, it, type Mock } from "vitest"
import { TestCurriculumLayer } from "../../../api/services/curriculum-service.js"
import { DbClient } from "../../../api/services/db.js"
import { makeChain } from "../../../routes/__test__/helpers.js"
import { resolveRetrievalContext } from "../retrieval-service.js"

const CORPUS = `## Bab 1: Bunyi
Kalimat unik satu.

## Bab 2: Main
Kalimat unik dua.
`

beforeEach(() => {
  ;(db.select as Mock).mockImplementation(() => makeChain([]))
  ;(db.insert as Mock).mockImplementation(() => makeChain(undefined))
  ;(db.delete as Mock).mockImplementation(() => makeChain(undefined))
})

describe("resolveRetrievalContext", () => {
  it("sends only the chosen bab", async () => {
    const result = await Effect.runPromise(
      resolveRetrievalContext({
        sourceMode: "default",
        subject: "bahasa_indonesia",
        grade: 1,
        topics: ["Bab 2: Main"]
      }).pipe(
        Effect.provide(Layer.mergeAll(
          Layer.succeed(DbClient, db as never),
          TestCurriculumLayer(CORPUS)
        ))
      )
    )

    expect(result.curriculumText).toBe("## Bab 2: Main\nKalimat unik dua.")
    expect(result.curriculumText).not.toContain("Kalimat unik satu")
    expect(result.retrievalTrace.join(" ")).not.toContain("fallback:full-corpus")
  })
})
