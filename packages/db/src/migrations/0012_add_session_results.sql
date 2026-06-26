CREATE TYPE "public"."graded_status" AS ENUM('auto', 'manual', 'pending');--> statement-breakpoint
CREATE TABLE "session_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_student_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_name" text NOT NULL,
	"score" integer NOT NULL,
	"correct_count" integer NOT NULL,
	"total_count" integer NOT NULL,
	"graded_status" "graded_status" DEFAULT 'auto' NOT NULL,
	"answers" jsonb,
	"graded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_session_student_id_session_students_id_fk" FOREIGN KEY ("session_student_id") REFERENCES "public"."session_students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_session_id_exam_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."exam_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_results_session_id_idx" ON "session_results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_results_session_student_id_idx" ON "session_results" USING btree ("session_student_id");--> statement-breakpoint
CREATE INDEX "session_results_exam_id_idx" ON "session_results" USING btree ("exam_id");
