CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."chunk_source" AS ENUM('corpus', 'teacher_pdf');--> statement-breakpoint
CREATE TABLE "ingest_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pdf_upload_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "ingest_jobs" ADD CONSTRAINT "ingest_jobs_pdf_upload_id_pdf_uploads_id_fk" FOREIGN KEY ("pdf_upload_id") REFERENCES "public"."pdf_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"questions_target" integer NOT NULL,
	"questions_done" integer DEFAULT 0 NOT NULL,
	"input_json" jsonb,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_exam_active_idx" ON "generation_jobs" ("exam_id") WHERE "status" IN ('queued', 'running');--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" text NOT NULL,
	"source" "chunk_source" NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" real[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "document_chunks_doc_id_idx" ON "document_chunks" ("doc_id");--> statement-breakpoint
CREATE INDEX "document_chunks_source_idx" ON "document_chunks" ("source");
