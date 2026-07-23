import { pgEnum } from "drizzle-orm/pg-core"

export const examSubjectEnum = pgEnum("exam_subject", [
  "bahasa_indonesia",
  "pendidikan_pancasila",
  "ipas",
  "bahasa_inggris",
  "matematika"
])
export const examDifficultyEnum = pgEnum("exam_difficulty", [
  "mudah",
  "sedang",
  "sulit",
  "campuran"
])
export const reviewModeEnum = pgEnum("review_mode", ["fast", "slow"])
export const examStatusEnum = pgEnum("exam_status", ["draft", "final"])
export const pdfUploadStatusEnum = pgEnum("pdf_upload_status", [
  "uploaded",
  "processing",
  "ready",
  "failed"
])
export const sourceModeEnum = pgEnum("source_mode", ["default", "pdf_guru", "combine"])
export const examPilotTriggerEnum = pgEnum("exam_pilot_trigger", [
  "export_pdf",
  "export_docx",
  "print_intent"
])
export const examPilotReadinessEnum = pgEnum("exam_pilot_readiness", [
  "ready",
  "ready_after_edit",
  "not_ready"
])
export const questionStatusEnum = pgEnum("question_status", [
  "pending",
  "accepted",
  "rejected"
])
export const answerEnum = pgEnum("answer", ["a", "b", "c", "d"])
