import { exams, questions } from "@teacher-exam/db"
import {
  type Question,
  rasterBytesLookValid,
  sanitizeStimulusSvg,
  SetSoalImageInputSchema,
  type SoalImage,
  type SoalImageMediaType,
  UploadSoalImageInputSchema
} from "@teacher-exam/shared"
import { and, eq } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { stimulusSvgPrompt } from "../../lib/gpt-image"
import { questionToRow, rowToQuestion } from "../../lib/question-mapper"
import { ApiAiError, ApiDatabaseError, ApiNotFound, ApiValidationError422 } from "../errors/http"
import { runDb } from "../lib/db-effect"
import { CurrentUser } from "../middleware/auth"
import { AiClient } from "../services/ai"
import { DbClient } from "../services/db"
import { SoalImageModel } from "../services/soal-image-model"

function loadOwnedQuestion(id: string) {
  return Effect.gen(function*() {
    const { userId } = yield* CurrentUser
    const db = yield* DbClient
    const ownerRows = yield* runDb(
      db
        .select({ questionId: questions.id, examUserId: exams.userId })
        .from(questions)
        .innerJoin(exams, eq(questions.examId, exams.id))
        .where(and(eq(questions.id, id), eq(exams.userId, userId)))
        .limit(1)
    )
    if (!ownerRows[0]) {
      return yield* Effect.fail(new ApiNotFound({ error: "Question not found", code: "NOT_FOUND" }))
    }
    const existingRows = yield* runDb(db.select().from(questions).where(eq(questions.id, id)).limit(1))
    const row = existingRows[0]
    if (!row) {
      return yield* Effect.fail(new ApiNotFound({ error: "Question not found", code: "NOT_FOUND" }))
    }
    return { db, row }
  })
}

function writeImage(id: string, image: SoalImage | null) {
  return Effect.gen(function*() {
    const { db, row } = yield* loadOwnedQuestion(id)
    const existing = rowToQuestion(row)
    const next: Question = image === null
      ? { ...existing, image: null }
      : { ...existing, image }
    const cols = questionToRow(next)
    const updatedRows = yield* runDb(
      db.update(questions).set({ payload: cols.payload }).where(eq(questions.id, id)).returning()
    )
    const updated = updatedRows[0]
    if (!updated) {
      return yield* Effect.fail(new ApiDatabaseError({ error: "Question disappeared", code: "DATABASE_ERROR" }))
    }
    yield* runDb(db.update(exams).set({ updatedAt: new Date() }).where(eq(exams.id, row.examId)))
    return rowToQuestion(updated)
  })
}

export function setQuestionImageEffect(id: string, payload: unknown) {
  return Effect.gen(function*() {
    const parsed = Schema.decodeUnknownEither(SetSoalImageInputSchema)(payload)
    if (parsed._tag === "Left") {
      return yield* Effect.fail(
        new ApiValidationError422({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: String(parsed.left)
        })
      )
    }
    const { db, row } = yield* loadOwnedQuestion(id)
    const question = rowToQuestion(row)
    const image = yield* parsed.right.route === "svg"
      ? drawSvgImage(question.text)
      : drawModelImage(question.text)
    const next: Question = { ...question, image }
    const cols = questionToRow(next)
    const updatedRows = yield* runDb(
      db.update(questions).set({ payload: cols.payload }).where(eq(questions.id, id)).returning()
    )
    const updated = updatedRows[0]
    if (!updated) {
      return yield* Effect.fail(new ApiDatabaseError({ error: "Question disappeared", code: "DATABASE_ERROR" }))
    }
    yield* runDb(db.update(exams).set({ updatedAt: new Date() }).where(eq(exams.id, row.examId)))
    return rowToQuestion(updated)
  })
}

function drawSvgImage(questionText: string) {
  return Effect.gen(function*() {
    const ai = yield* AiClient
    const raw = yield* ai.generateRaw({
      system: "You draw exam stimulus pictures as SVG.",
      user: stimulusSvgPrompt(questionText)
    }).pipe(Effect.mapError(() => new ApiAiError({ error: "SVG image failed", code: "AI_ERROR" })))
    const svg = sanitizeStimulusSvg(raw)
    if (svg === null) {
      return yield* Effect.fail(new ApiAiError({ error: "SVG image failed", code: "AI_ERROR" }))
    }
    const image: SoalImage = { source: "svg", svg }
    return image
  })
}

function drawModelImage(questionText: string) {
  return Effect.gen(function*() {
    const model = yield* SoalImageModel
    const stem = questionText.replace(/\s+/g, " ").trim().slice(0, 500)
    const png = yield* model.generatePng(
      `Simple grayscale illustration for an Indonesian primary-school exam. No text. Scene: ${stem}`
    )
    if (!rasterBytesLookValid("image/png", png.dataBase64)) {
      return yield* Effect.fail(new ApiAiError({ error: "Image model returned no image", code: "AI_ERROR" }))
    }
    const image: SoalImage = { source: "generated", mediaType: "image/png", dataBase64: png.dataBase64 }
    return image
  })
}

export function uploadQuestionImageEffect(id: string, payload: unknown) {
  return Effect.gen(function*() {
    const parsed = Schema.decodeUnknownEither(UploadSoalImageInputSchema)(payload)
    if (parsed._tag === "Left") {
      return yield* Effect.fail(
        new ApiValidationError422({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: String(parsed.left)
        })
      )
    }
    const mediaType: SoalImageMediaType = parsed.right.mediaType
    if (!rasterBytesLookValid(mediaType, parsed.right.dataBase64)) {
      return yield* Effect.fail(
        new ApiValidationError422({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: "Image bytes do not match the declared type"
        })
      )
    }
    const image: SoalImage = {
      source: "upload",
      mediaType,
      dataBase64: parsed.right.dataBase64
    }
    return yield* writeImage(id, image)
  })
}

export function removeQuestionImageEffect(id: string) {
  return writeImage(id, null)
}
