import type { SqlClient } from "@effect/sql/SqlClient"
import type { ExamSubject, SourceMode } from "@teacher-exam/shared"
import { Data, Effect } from "effect"
import type { ApiDatabaseError } from "../../api/errors/http"
import type { CurriculumReadError } from "../../api/services/curriculum-service"
import { CurriculumService } from "../../api/services/curriculum-service"
import type { DbClient } from "../../api/services/db"
import { parseChosenBabNumbers, selectChosenBabText } from "../../curriculum/bab-index.js"
import { agenticSearch } from "./agentic-search"
import { indexCorpusSubjectGrade } from "./index-corpus.js"

export class InsufficientMateriError extends Data.TaggedError("InsufficientMateriError")<{
  message: string
}> {}

export interface RetrievalContext {
  readonly curriculumText: string
  readonly retrievalTrace: ReadonlyArray<string>
}

export function ensureCorpusIndexed(
  subject: string,
  grade: number
): Effect.Effect<void, ApiDatabaseError | CurriculumReadError, DbClient | CurriculumService> {
  return Effect.gen(function*() {
    const curriculum = yield* CurriculumService
    const markdown = yield* curriculum.getText(subject as ExamSubject, grade)
    yield* indexCorpusSubjectGrade(subject as ExamSubject, grade, markdown)
  })
}

export function resolveRetrievalContext(input: {
  sourceMode: SourceMode
  subject: string
  grade: number
  topics: ReadonlyArray<string>
  freeTopic?: string | undefined
  pdfUploadId?: string | undefined
}): Effect.Effect<
  RetrievalContext,
  ApiDatabaseError | CurriculumReadError | InsufficientMateriError,
  DbClient | SqlClient | CurriculumService
> {
  return Effect.gen(function*() {
    const query = input.sourceMode === "pdf_guru"
      ? (input.freeTopic?.trim() ?? input.topics.join(" "))
      : input.topics.join(" ")

    if (input.sourceMode === "pdf_guru") {
      if (!input.pdfUploadId) {
        return yield* Effect.fail(new InsufficientMateriError({ message: "PDF materi wajib dipilih." }))
      }
      const { material, trace } = yield* agenticSearch({
        query,
        docIds: [input.pdfUploadId],
        source: "teacher_pdf"
      })
      if (material.trim().length < 50) {
        return yield* Effect.fail(new InsufficientMateriError({ message: "Materi PDF tidak cukup untuk topik ini." }))
      }
      return { curriculumText: material, retrievalTrace: trace }
    }

    yield* ensureCorpusIndexed(input.subject, input.grade).pipe(Effect.catchAll(() => Effect.void))
    const curriculum = yield* CurriculumService
    const markdown = yield* curriculum.getText(input.subject as ExamSubject, input.grade)
    const babNumbers = parseChosenBabNumbers(input.topics)
    if (babNumbers.length > 0) {
      let combined = selectChosenBabText(markdown, input.topics)
      const trace = [`bab-only:${babNumbers.join(",")}`]
      if (input.sourceMode === "combine" && input.pdfUploadId) {
        const pdfResult = yield* agenticSearch({
          query,
          docIds: [input.pdfUploadId],
          source: "teacher_pdf"
        })
        combined = `${combined}\n\n--- Materi PDF Guru ---\n\n${pdfResult.material}`
        for (const step of pdfResult.trace) {
          trace.push(step)
        }
      }
      return { curriculumText: combined, retrievalTrace: trace }
    }

    const corpusDocId = `corpus:${input.subject}:${input.grade}`
    const corpusResult = yield* agenticSearch({
      query,
      docIds: [corpusDocId],
      source: "corpus"
    })

    let combined = corpusResult.material
    const trace = [...corpusResult.trace]

    if (input.sourceMode === "combine" && input.pdfUploadId) {
      const pdfResult = yield* agenticSearch({
        query,
        docIds: [input.pdfUploadId],
        source: "teacher_pdf"
      })
      combined = `${combined}\n\n--- Materi PDF Guru ---\n\n${pdfResult.material}`
      for (const step of pdfResult.trace) {
        trace.push(step)
      }
    }

    if (combined.trim().length < 50) {
      return { curriculumText: markdown, retrievalTrace: [...trace, "fallback:full-corpus"] }
    }

    return { curriculumText: combined, retrievalTrace: trace }
  })
}
