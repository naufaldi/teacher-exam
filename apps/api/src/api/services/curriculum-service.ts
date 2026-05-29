import * as FileSystem from "@effect/platform/FileSystem"
import type { ExamSubject } from "@teacher-exam/shared"
import { Context, Data, Effect, Layer, Ref } from "effect"
import { curriculumMdPath, getCurriculumFallback, SUBJECT_SLUG } from "../../lib/curriculum"
import { logWarn } from "../../lib/server-log"

export class CurriculumReadError extends Data.TaggedError("CurriculumReadError")<{
  cause: unknown
}> {}

export interface CurriculumServiceApi {
  readonly getText: (
    subject: ExamSubject,
    grade: number
  ) => Effect.Effect<string, CurriculumReadError>
  readonly resetCache: () => Effect.Effect<void>
}

export class CurriculumService extends Context.Tag("CurriculumService")<
  CurriculumService,
  CurriculumServiceApi
>() {}

function loadCurriculumText(
  fs: FileSystem.FileSystem,
  subject: ExamSubject,
  grade: number
): Effect.Effect<string, CurriculumReadError> {
  return Effect.gen(function*() {
    const path = curriculumMdPath(subject, grade)
    const result = yield* Effect.either(fs.readFileString(path, "utf8"))
    if (result._tag === "Right") {
      return result.right
    }
    const err = result.left
    if (err._tag === "SystemError" && err.reason === "NotFound") {
      logWarn(`[curriculum] missing ${path} — using PRD §8 fallback`)
      return getCurriculumFallback(subject)
    }
    return yield* Effect.fail(new CurriculumReadError({ cause: err }))
  })
}

export const CurriculumServiceLive = Layer.effect(
  CurriculumService,
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const cacheRef = yield* Ref.make(new Map<string, string>())

    const getText = (
      subject: ExamSubject,
      grade: number
    ): Effect.Effect<string, CurriculumReadError> =>
      Effect.gen(function*() {
        const key = `${subject}-${grade}`
        const cache = yield* Ref.get(cacheRef)
        const cached = cache.get(key)
        if (cached !== undefined) {
          return cached
        }
        const text = yield* loadCurriculumText(fs, subject, grade)
        yield* Ref.update(cacheRef, (current) => {
          const next = new Map(current)
          next.set(key, text)
          return next
        })
        return text
      })

    const resetCache = (): Effect.Effect<void> => Ref.set(cacheRef, new Map())

    return { getText, resetCache }
  })
)

export function TestCurriculumLayer(text: string = "mock curriculum text") {
  return Layer.succeed(CurriculumService, {
    getText: () => Effect.succeed(text),
    resetCache: () => Effect.void
  })
}

export function TestCurriculumFailingLayer() {
  return Layer.succeed(CurriculumService, {
    getText: () => Effect.fail(new CurriculumReadError({ cause: "curriculum unavailable" })),
    resetCache: () => Effect.void
  })
}

export { SUBJECT_SLUG }
