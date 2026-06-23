import { NodeContext } from "@effect/platform-node"
import type { ExamSubject } from "@teacher-exam/shared"
import { Effect } from "effect"
import { describe, expect, test } from "vitest"
import { CurriculumService, CurriculumServiceLive } from "../../api/services/curriculum-service"
import { curriculumMdFilename } from "../curriculum"

describe("Matematika curriculum corpus", () => {
  test("uses the canonical Matematika markdown filename", () => {
    expect(curriculumMdFilename("matematika" as ExamSubject, 5)).toBe("matematika-kelas-5.md")
    expect(curriculumMdFilename("matematika" as ExamSubject, 6)).toBe("matematika-kelas-6.md")
  })

  test("loads Matematika class 5 extracted corpus when markdown is present", async () => {
    const text = await Effect.runPromise(
      Effect.gen(function*() {
        const curriculum = yield* CurriculumService
        return yield* curriculum.getText("matematika" as ExamSubject, 5)
      }).pipe(Effect.provide(CurriculumServiceLive), Effect.provide(NodeContext.layer))
    )

    expect(text).toMatch(/^# Matematika — Kelas (5|V) /m)
    expect(text).toContain("Fase C")
    expect(text).toContain("**Teks bacaan:**")
    expect(text).toContain("## Bab ")
  })
})
