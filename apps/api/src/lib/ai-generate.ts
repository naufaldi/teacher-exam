import { SqlClient } from "@effect/sql/SqlClient"
import { exams, questions } from "@teacher-exam/db"
import {
  ExamIdSchema,
  FigureSpecSchema,
  formatExamTitle,
  normalizeExamType,
  QuestionIdSchema,
  SUBJECT_LABEL,
  validateGenerateExamInput
} from "@teacher-exam/shared"
import type { ExamSubject, FigureSpec, GeneratedQuestion, GenerateExamInput, Question } from "@teacher-exam/shared"
import { Data, Effect, Either, Match, Schema } from "effect"
import type { ApiDatabaseError } from "../api/errors/http"
import { runDb } from "../api/lib/db-effect"
import { CurriculumReadError, CurriculumService } from "../api/services/curriculum-service"
import { DbClient } from "../api/services/db"
import type { ObjectStorage } from "../api/services/object-storage"
import { isReadySibiPdfForGenerate } from "../curriculum/catalog.js"
import { AiGenerationError } from "../errors"
import { type AiService } from "../services/AiService"
import { logAiEvent } from "./ai-log"
import { EXAM_SUBJECT_ENUM_MIGRATE_MESSAGE, isExamSubjectEnumMismatch } from "./db-errors"
import { EXAM_TYPE_PROFILE, resolveComposition } from "./exam-type-profile"
import { fetchExamWithQuestions } from "./exams-query"
import { completeGenerationJob, createGenerationJob, updateGenerationJobProgress } from "./generation-job-service"
import { type LatexValidationResult, validateGeneratedQuestionLatex } from "./latex-validator"
import { normalizeGeneratedQuestionLatexFields } from "./normalize-matematika-latex.js"
import { type ParsedItemFailure, parseGeneratedQuestions } from "./parse-generated-questions"
import { loadReadyPdfUpload } from "./pdf-upload-service"
import { buildExamPrompt } from "./prompt"
import { questionToRow } from "./question-mapper"
import { InsufficientMateriError, resolveRetrievalContext } from "./retrieval/retrieval-service"

const PLACEHOLDER_STUB_TEXT = "Soal belum berhasil dibuat — gunakan Regenerate untuk membuat ulang."

function resolveInputSubjectLabel(input: GenerateExamInput): string {
  const custom = input.subjectLabel?.trim()
  if (custom) return custom
  if (input.subject) return SUBJECT_LABEL[input.subject]
  return "Mata Pelajaran"
}

function examSubjectInsertFields(
  sourceMode: NonNullable<GenerateExamInput["sourceMode"]> | "default",
  input: GenerateExamInput
): { subject: ExamSubject | null; subjectLabel: string | null } {
  if (sourceMode === "pdf_guru") {
    return {
      subject: null,
      subjectLabel: input.subjectLabel?.trim() ?? null
    }
  }
  return {
    subject: input.subject ?? null,
    subjectLabel: null
  }
}

class CompositionValidationError extends Data.TaggedError("CompositionValidationError")<{
  message: string
}> {}

function makeFakeQuestionShape(number: number): GeneratedQuestion {
  return {
    _tag: "mcq_single",
    number,
    text: `Soal simulasi ${number}`,
    option_a: "A",
    option_b: "B",
    option_c: "C",
    option_d: "D",
    correct_answer: "a",
    topic: "Simulasi",
    difficulty: "mudah"
  }
}

type SalvageGenerationResult = {
  questions: ReadonlyArray<Question>
  generationIncomplete: boolean
  failedQuestionNumbers: ReadonlyArray<number>
}

function convertGeneratedToQuestion(
  q: GeneratedQuestion,
  meta: {
    id: string
    examId: string
    number: number
    status: "accepted" | "pending"
    createdAt: Date
    generationFailed?: boolean
  },
  latexResult: LatexValidationResult = { _tag: "valid" }
): Question {
  const figureResult = decodeGeneratedFigure(q.figure)
  const latexReason = latexResult._tag === "invalid"
    ? `LaTeX validation failed: ${latexResult.reason}`
    : null
  const validationReasons = [figureResult.reason, latexReason].filter((reason): reason is string => reason !== null)
  const common = {
    id: Schema.decodeSync(QuestionIdSchema)(meta.id),
    examId: Schema.decodeSync(ExamIdSchema)(meta.examId),
    number: meta.number,
    text: q.text,
    topic: q.topic ?? null,
    difficulty: q.difficulty ?? null,
    status: meta.status,
    validationStatus: validationReasons.length > 0 ? "needs_review" as const : null,
    validationReason: validationReasons.length > 0 ? validationReasons.join("\n") : null,
    ...(meta.generationFailed === true ? { generationFailed: true as const } : {}),
    figure: figureResult.figure,
    createdAt: meta.createdAt.toISOString()
  }
  const result = Match.value(q).pipe(
    Match.tag("mcq_single", (x) => ({
      ...common,
      _tag: "mcq_single" as const,
      options: { a: x.option_a, b: x.option_b, c: x.option_c, d: x.option_d },
      correct: x.correct_answer
    })),
    Match.tag("mcq_multi", (x) => ({
      ...common,
      _tag: "mcq_multi" as const,
      options: { a: x.option_a, b: x.option_b, c: x.option_c, d: x.option_d },
      correct: x.correct_answers
    })),
    Match.tag("true_false", (x) => ({
      ...common,
      _tag: "true_false" as const,
      statements: x.statements.map((s) => ({ text: s.text, answer: s.answer === "B" }))
    })),
    Match.exhaustive
  )
  return result
}

function failureReasonForNumber(
  number: number,
  failed: ReadonlyArray<ParsedItemFailure>,
  missingNumbers: ReadonlyArray<number>
): string {
  const failAtNumber = failed.find((f) => f.index + 1 === number)
  if (failAtNumber) return failAtNumber.error
  if (missingNumbers.includes(number)) return "Soal tidak ada dalam output AI."
  return "Soal gagal divalidasi."
}

function makePlaceholderQuestion(
  examId: string,
  number: number,
  createdAt: Date,
  reason: string
): Question {
  return {
    id: Schema.decodeSync(QuestionIdSchema)(crypto.randomUUID()),
    examId: Schema.decodeSync(ExamIdSchema)(examId),
    number,
    text: PLACEHOLDER_STUB_TEXT,
    topic: null,
    difficulty: null,
    status: "pending",
    validationStatus: "needs_review",
    validationReason: reason,
    generationFailed: true,
    _tag: "mcq_single",
    options: { a: "—", b: "—", c: "—", d: "—" },
    correct: "a",
    createdAt: createdAt.toISOString()
  }
}

async function generateWithSalvage(
  aiService: AiService,
  request: {
    system: string
    user: string
    pdfBytes?: Buffer
    expectedCount: number
    shouldValidateLatex: boolean
    reviewMode: "fast" | "slow"
    examId: string
    createdAt: Date
    includePdfImages?: boolean
  }
): Promise<Either.Either<SalvageGenerationResult, AiGenerationError>> {
  const maxAttempts = request.shouldValidateLatex ? 3 : 1
  let lastSalvage:
    | {
      valid: ReadonlyArray<GeneratedQuestion>
      failed: ReadonlyArray<ParsedItemFailure>
      missingNumbers: ReadonlyArray<number>
      latexByNumber: Map<number, LatexValidationResult>
    }
    | null = null
  let lastParseError: AiGenerationError | null = null

  const devSimulateSalvage = process.env["DEV_SIMULATE_SALVAGE"] === "1"

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const rawResult = devSimulateSalvage
      ? Either.right(
        JSON.stringify(
          Array.from({ length: request.expectedCount }, (_, i) => {
            const n = i + 1
            if (n === request.expectedCount) {
              return { ...makeFakeQuestionShape(n), correct_answer: "z" }
            }
            return makeFakeQuestionShape(n)
          })
        )
      )
      : await Effect.runPromise(
        Effect.either(
          aiService.generateRaw({
            system: request.system,
            user: request.user,
            ...(request.pdfBytes !== undefined ? { pdfBytes: request.pdfBytes } : {})
          })
        )
      )
    if (Either.isLeft(rawResult)) return Either.left(rawResult.left)

    const parsed = parseGeneratedQuestions(rawResult.right, request.expectedCount)
    if (Either.isLeft(parsed)) {
      lastParseError = parsed.left
      continue
    }

    const { failed, missingNumbers, valid } = parsed.right
    const latexByNumber = new Map<number, LatexValidationResult>()
    for (const question of valid) {
      latexByNumber.set(
        question.number,
        request.shouldValidateLatex
          ? validateGeneratedQuestionLatex(question)
          : { _tag: "valid" }
      )
    }

    const hasInvalidLatex = [...latexByNumber.values()].some((r) => r._tag === "invalid")
    lastSalvage = { valid, failed, missingNumbers, latexByNumber }
    if (!hasInvalidLatex) break
  }

  if (!lastSalvage) {
    if (lastParseError) return Either.left(lastParseError)
    return Either.left(new AiGenerationError({ cause: "AI generation produced no output" }))
  }

  const validNumbers = new Set(lastSalvage.valid.map((q) => q.number))
  const failedQuestionNumbers: Array<number> = []
  for (let n = 1; n <= request.expectedCount; n++) {
    if (!validNumbers.has(n)) failedQuestionNumbers.push(n)
  }
  const generationIncomplete = failedQuestionNumbers.length > 0

  if (lastSalvage.valid.length === 0 && failedQuestionNumbers.length === 0) {
    return Either.left(new AiGenerationError({ cause: "AI generation produced no valid questions" }))
  }

  logAiEvent("api.ai.generate.salvage", "warn", {
    path: "/api/ai/generate",
    valid: lastSalvage.valid.length,
    failedItems: lastSalvage.failed.length,
    missing: lastSalvage.missingNumbers.length,
    gaps: failedQuestionNumbers.length
  })

  const statusForValid: "accepted" | "pending" = request.reviewMode === "fast" ? "accepted" : "pending"

  const byNumber = new Map<number, Question>()
  for (const q of lastSalvage.valid) {
    const latex = lastSalvage.latexByNumber.get(q.number) ?? { _tag: "valid" as const }
    const stored = request.shouldValidateLatex ? normalizeGeneratedQuestionLatexFields(q) : q
    byNumber.set(
      q.number,
      convertGeneratedToQuestion(
        stored,
        {
          id: crypto.randomUUID(),
          examId: request.examId,
          number: q.number,
          status: statusForValid,
          createdAt: request.createdAt
        },
        latex
      )
    )
  }

  for (const number of failedQuestionNumbers) {
    if (byNumber.has(number)) continue
    byNumber.set(
      number,
      makePlaceholderQuestion(
        request.examId,
        number,
        request.createdAt,
        failureReasonForNumber(number, lastSalvage.failed, lastSalvage.missingNumbers)
      )
    )
  }

  const questions: Array<Question> = []
  for (let n = 1; n <= request.expectedCount; n++) {
    const row = byNumber.get(n)
    if (row) questions.push(row)
  }

  return Either.right({
    questions,
    generationIncomplete,
    failedQuestionNumbers
  })
}

function decodeGeneratedFigure(raw: unknown): {
  figure: FigureSpec | null
  status: "needs_review" | null
  reason: string | null
} {
  if (raw === undefined || raw === null) {
    return { figure: null, status: null, reason: null }
  }

  const decoded = Schema.decodeUnknownEither(FigureSpecSchema)(raw)
  if (Either.isRight(decoded)) {
    return { figure: decoded.right, status: null, reason: null }
  }

  return {
    figure: null,
    status: "needs_review",
    reason: `FigureSpec validation failed; diagram was removed: ${String(decoded.left)}`
  }
}

export type GenerateExamResult =
  | { readonly _tag: "success"; readonly body: Record<string, unknown>; readonly status: 201 }
  | { readonly _tag: "accepted"; readonly body: { examId: string; jobId: string }; readonly status: 202 }
  | { readonly _tag: "ai_error"; readonly message: string }
  | { readonly _tag: "database_error"; readonly message: string }
  | { readonly _tag: "validation_error"; readonly details: string }
  | { readonly _tag: "conflict_error"; readonly details: string }
  | { readonly _tag: "insufficient_materi"; readonly details: string }

export function pdfUploadLoadFailureToResult(
  err: { readonly status: number; readonly message: string }
): GenerateExamResult {
  if (err.status === 409) {
    return { _tag: "conflict_error", details: err.message }
  }
  return { _tag: "validation_error", details: err.message }
}

export function generateExam(
  userId: string,
  input: GenerateExamInput,
  aiService: AiService
): Effect.Effect<
  GenerateExamResult,
  AiGenerationError | ApiDatabaseError | CurriculumReadError,
  DbClient | SqlClient | CurriculumService | ObjectStorage
> {
  if (input.asyncJob === true) {
    return startAsyncGenerateExam(userId, input)
  }
  return executeGenerateExam(userId, input, aiService)
}

function startAsyncGenerateExam(
  userId: string,
  input: GenerateExamInput
): Effect.Effect<
  GenerateExamResult,
  ApiDatabaseError | CurriculumReadError,
  DbClient | SqlClient | CurriculumService | ObjectStorage
> {
  return Effect.gen(function*() {
    const prepared = yield* prepareGenerateContext(userId, input)
    if (prepared._tag === "err") {
      return prepared.result
    }

    const { examId, now, promptTopics, title, totalSoal } = prepared
    const db = yield* DbClient
    const sourceMode = input.sourceMode ?? "default"
    const effectivePdfUploadId = sourceMode === "default" ? undefined : input.pdfUploadId

    const subjectFields = examSubjectInsertFields(sourceMode, input)

    yield* runDb(
      db.insert(exams).values({
        id: examId,
        userId,
        title,
        ...subjectFields,
        grade: input.grade,
        difficulty: input.difficulty,
        topics: [...promptTopics],
        reviewMode: input.reviewMode,
        status: "draft",
        examType: prepared.examType,
        classContext: input.classContext ?? null,
        sourceMode,
        pdfUploadId: effectivePdfUploadId ?? null,
        freeTopic: input.freeTopic?.trim() ?? null,
        createdAt: now,
        updatedAt: now
      })
    )

    const jobId = yield* createGenerationJob(examId, totalSoal, { ...input, userId })
    return {
      _tag: "accepted",
      status: 202,
      body: { examId, jobId }
    }
  })
}

export function executeGenerateExam(
  userId: string,
  input: GenerateExamInput,
  aiService: AiService,
  opts?: { examId?: string; jobId?: string }
): Effect.Effect<
  GenerateExamResult,
  AiGenerationError | ApiDatabaseError | CurriculumReadError,
  DbClient | SqlClient | CurriculumService | ObjectStorage
> {
  return Effect.gen(function*() {
    const handlerT0 = Date.now()
    const prepared = yield* prepareGenerateContext(userId, input)
    if (prepared._tag === "err") {
      return prepared.result
    }

    const {
      composition,
      curriculumText,
      effectivePdfUploadId,
      examId,
      examType,
      now,
      pdfBytes,
      promptTopics,
      sourceMode,
      title,
      totalSoal
    } = prepared

    const resolvedExamId = opts?.examId ?? examId

    const { system, user } = buildExamPrompt({
      examType,
      difficulty: input.difficulty,
      ...(input.subject !== undefined ? { examSubject: input.subject } : {}),
      subjectLabel: resolveInputSubjectLabel(input),
      grade: input.grade,
      topics: [...promptTopics],
      totalSoal,
      composition,
      curriculumText,
      sourceMode,
      classContext: input.classContext,
      exampleQuestions: input.exampleQuestions
    })

    const generated = yield* Effect.tryPromise({
      try: () =>
        generateWithSalvage(aiService, {
          system,
          user,
          ...(pdfBytes !== undefined ? { pdfBytes } : {}),
          expectedCount: totalSoal,
          shouldValidateLatex: input.subject === "matematika" && sourceMode !== "pdf_guru",
          reviewMode: input.reviewMode,
          examId: resolvedExamId,
          createdAt: now,
          includePdfImages: input.includePdfImages === true
        }),
      catch: (cause) => new AiGenerationError({ cause })
    })
    if (Either.isLeft(generated)) {
      const err = generated.left
      logAiEvent("api.ai.generate", "warn", {
        path: "/api/ai/generate",
        message: String((err as { cause?: unknown }).cause)
      })
      return { _tag: "ai_error", message: String((err as { cause?: unknown }).cause) }
    }

    const insertedQuestions = [...generated.right.questions]
    const generationIncomplete = generated.right.generationIncomplete
    const failedQuestionNumbers = [...generated.right.failedQuestionNumbers]

    const db = yield* DbClient
    const sql = yield* SqlClient

    const insertTransaction = sql.withTransaction(
      Effect.gen(function*() {
        if (opts?.examId === undefined) {
          const subjectFields = examSubjectInsertFields(sourceMode, input)
          yield* runDb(
            db.insert(exams).values({
              id: resolvedExamId,
              userId,
              title,
              ...subjectFields,
              grade: input.grade,
              difficulty: input.difficulty,
              topics: [...promptTopics],
              reviewMode: input.reviewMode,
              status: "draft",
              examType,
              classContext: input.classContext ?? null,
              sourceMode,
              pdfUploadId: effectivePdfUploadId ?? null,
              freeTopic: input.freeTopic?.trim() ?? null,
              createdAt: now,
              updatedAt: now
            })
          )
        }

        yield* runDb(
          db.insert(questions).values(
            insertedQuestions.map((dbQuestion) => {
              const rowFields = questionToRow(dbQuestion)
              return {
                id: dbQuestion.id,
                examId: dbQuestion.examId,
                number: dbQuestion.number,
                text: dbQuestion.text,
                topic: dbQuestion.topic,
                difficulty: dbQuestion.difficulty,
                status: dbQuestion.status,
                validationStatus: dbQuestion.validationStatus,
                validationReason: dbQuestion.validationReason,
                createdAt: now,
                type: rowFields.type,
                optionA: rowFields.optionA,
                optionB: rowFields.optionB,
                optionC: rowFields.optionC,
                optionD: rowFields.optionD,
                correctAnswer: rowFields.correctAnswer,
                payload: rowFields.payload
              }
            })
          )
        )
      })
    )

    const insertResult = yield* Effect.either(insertTransaction)
    if (insertResult._tag === "Left") {
      const err = insertResult.left
      if (isExamSubjectEnumMismatch(err)) {
        return { _tag: "database_error", message: EXAM_SUBJECT_ENUM_MIGRATE_MESSAGE }
      }
      return {
        _tag: "database_error",
        message: err instanceof Error ? err.message : "Database error"
      }
    }

    if (opts?.jobId !== undefined) {
      yield* updateGenerationJobProgress(opts.jobId, insertedQuestions.length)
      yield* completeGenerationJob(opts.jobId, insertedQuestions.length)
    }

    const result = yield* fetchExamWithQuestions(resolvedExamId)
    if (!result) {
      return { _tag: "database_error", message: "Failed to retrieve generated exam" }
    }

    logAiEvent("api.ai.generate", "info", {
      path: "/api/ai/generate",
      examId: resolvedExamId,
      questionCount: insertedQuestions.length,
      durationMs: Date.now() - handlerT0
    })

    return {
      _tag: "success",
      status: 201,
      body: {
        ...result,
        ...(generationIncomplete ? { generationIncomplete: true, failedQuestionNumbers } : {})
      }
    }
  })
}

type PrepareOk = {
  readonly _tag: "ok"
  readonly examId: string
  readonly title: string
  readonly promptTopics: ReadonlyArray<string>
  readonly totalSoal: number
  readonly composition: { mcqSingle: number; mcqMulti: number; trueFalse: number }
  readonly examType: ReturnType<typeof normalizeExamType>
  readonly curriculumText: string
  readonly pdfBytes: Buffer | undefined
  readonly now: Date
  readonly sourceMode: NonNullable<GenerateExamInput["sourceMode"]> | "default"
  readonly effectivePdfUploadId: string | undefined
}

type PrepareResult =
  | PrepareOk
  | { readonly _tag: "err"; readonly result: GenerateExamResult }

function prepareGenerateContext(
  userId: string,
  input: GenerateExamInput
): Effect.Effect<
  PrepareResult,
  ApiDatabaseError | CurriculumReadError,
  DbClient | SqlClient | CurriculumService | ObjectStorage
> {
  return Effect.gen(function*() {
    const sourceMode = input.sourceMode ?? "default"
    const modeError = validateGenerateExamInput(input)
    if (modeError !== null) {
      return { _tag: "err", result: { _tag: "validation_error", details: modeError } }
    }

    const examType = normalizeExamType(input.examType ?? "formatif")
    const totalSoal = input.totalSoal ?? EXAM_TYPE_PROFILE[examType].defaultTotalSoal

    if (sourceMode === "default") {
      if (input.subject === undefined || !isReadySibiPdfForGenerate(input.subject, input.grade)) {
        return {
          _tag: "err",
          result: {
            _tag: "validation_error",
            details: "Materi kurikulum untuk mata pelajaran dan kelas ini belum siap dari PDF Buku Siswa."
          }
        }
      }
    }

    const compositionResult = yield* Effect.either(
      Effect.try({
        try: () => resolveComposition(examType, totalSoal, input.composition),
        catch: (err): CompositionValidationError =>
          new CompositionValidationError({
            message: err instanceof Error ? err.message : String(err)
          })
      })
    )
    if (Either.isLeft(compositionResult)) {
      return { _tag: "err", result: { _tag: "validation_error", details: compositionResult.left.message } }
    }
    const composition = compositionResult.right

    const promptTopics = sourceMode === "pdf_guru"
      ? (input.topics.length > 0 ? [...input.topics] : [input.freeTopic?.trim() ?? ""])
      : [...input.topics]

    const effectivePdfUploadId = sourceMode === "default" ? undefined : input.pdfUploadId
    const useRag = process.env["USE_RAG"] === "1"

    let curriculumText: string
    if (!useRag && sourceMode !== "pdf_guru") {
      const curriculum = yield* CurriculumService
      curriculumText = yield* curriculum.getText(input.subject!, input.grade)
    } else {
      const retrievalResult = yield* Effect.either(
        resolveRetrievalContext({
          sourceMode,
          subject: input.subject ?? "",
          grade: input.grade,
          topics: [...promptTopics],
          freeTopic: input.freeTopic,
          pdfUploadId: effectivePdfUploadId
        })
      )
      if (Either.isRight(retrievalResult)) {
        curriculumText = retrievalResult.right.curriculumText
      } else if (retrievalResult.left instanceof InsufficientMateriError) {
        return {
          _tag: "err",
          result: { _tag: "insufficient_materi", details: retrievalResult.left.message }
        }
      } else if (retrievalResult.left instanceof CurriculumReadError) {
        return yield* Effect.fail(retrievalResult.left)
      } else if (sourceMode !== "pdf_guru") {
        const curriculum = yield* CurriculumService
        curriculumText = yield* curriculum.getText(input.subject!, input.grade)
      } else {
        return {
          _tag: "err",
          result: { _tag: "database_error", message: "Retrieval failed" }
        }
      }
    }

    let pdfBytes: Buffer | undefined
    if (effectivePdfUploadId !== undefined && input.includePdfImages === true) {
      const loadResult = yield* Effect.either(loadReadyPdfUpload(userId, effectivePdfUploadId))
      if (Either.isLeft(loadResult)) {
        if (loadResult.left._tag === "PdfUploadValidationError") {
          return { _tag: "err", result: pdfUploadLoadFailureToResult(loadResult.left) }
        }
        return {
          _tag: "err",
          result: { _tag: "database_error", message: "Gagal memuat PDF." }
        }
      }
      pdfBytes = loadResult.right.bytes
    } else if (effectivePdfUploadId !== undefined && sourceMode !== "default") {
      const loadResult = yield* Effect.either(loadReadyPdfUpload(userId, effectivePdfUploadId))
      if (Either.isLeft(loadResult)) {
        if (loadResult.left._tag === "PdfUploadValidationError") {
          return { _tag: "err", result: pdfUploadLoadFailureToResult(loadResult.left) }
        }
        return {
          _tag: "err",
          result: { _tag: "database_error", message: "Gagal memuat PDF." }
        }
      }
      if (sourceMode === "pdf_guru" && curriculumText.length < 100) {
        pdfBytes = loadResult.right.bytes
      }
    }

    const title = formatExamTitle({
      subjectLabel: resolveInputSubjectLabel(input),
      grade: input.grade,
      examType,
      examDate: null,
      topics: [...promptTopics]
    })

    return {
      _tag: "ok",
      examId: crypto.randomUUID(),
      title,
      promptTopics,
      totalSoal,
      composition,
      examType,
      curriculumText,
      pdfBytes,
      now: new Date(),
      sourceMode,
      effectivePdfUploadId
    }
  })
}
