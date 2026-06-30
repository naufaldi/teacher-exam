CREATE TYPE "public"."pdf_upload_status" AS ENUM('uploaded', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_mode" AS ENUM('default', 'pdf_guru', 'combine');--> statement-breakpoint
ALTER TABLE "pdf_uploads" DROP CONSTRAINT IF EXISTS "pdf_uploads_exam_id_exams_id_fk";--> statement-breakpoint
ALTER TABLE "pdf_uploads" DROP COLUMN IF EXISTS "exam_id";--> statement-breakpoint
ALTER TABLE "pdf_uploads" DROP COLUMN IF EXISTS "expires_at";--> statement-breakpoint
ALTER TABLE "pdf_uploads" ADD COLUMN "storage_key" text;--> statement-breakpoint
UPDATE "pdf_uploads" SET "storage_key" = 'legacy/' || "id"::text WHERE "storage_key" IS NULL;--> statement-breakpoint
ALTER TABLE "pdf_uploads" ALTER COLUMN "storage_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pdf_uploads" ADD COLUMN "status" "pdf_upload_status" DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
ALTER TABLE "pdf_uploads" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "pdf_uploads" ADD COLUMN "page_count" integer;--> statement-breakpoint
ALTER TABLE "pdf_uploads" ADD COLUMN "ready_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pdf_uploads" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "pdf_uploads" SET "status" = 'ready', "ready_at" = COALESCE("uploaded_at", now()) WHERE "status" = 'uploaded';--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "source_mode" "source_mode" DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "pdf_upload_id" uuid;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "free_topic" text;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_pdf_upload_id_pdf_uploads_id_fk" FOREIGN KEY ("pdf_upload_id") REFERENCES "public"."pdf_uploads"("id") ON DELETE set null ON UPDATE no action;
