CREATE TYPE "public"."exam_session_status" AS ENUM('scheduled', 'open', 'closed');--> statement-breakpoint
CREATE TABLE "exam_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"session_code" text NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer,
	"status" "exam_session_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_sessions_exam_id_idx" ON "exam_sessions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "exam_sessions_session_code_idx" ON "exam_sessions" USING btree ("session_code");--> statement-breakpoint
CREATE INDEX "exam_sessions_class_id_idx" ON "exam_sessions" USING btree ("class_id");--> statement-breakpoint
CREATE TABLE "session_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid,
	"student_name" text NOT NULL,
	"identifier" text,
	"token" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"answers" jsonb
);
--> statement-breakpoint
ALTER TABLE "session_students" ADD CONSTRAINT "session_students_session_id_exam_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."exam_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_students" ADD CONSTRAINT "session_students_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_students_session_id_idx" ON "session_students" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_students_token_idx" ON "session_students" USING btree ("token");
