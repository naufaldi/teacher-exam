CREATE TYPE "public"."exam_pilot_trigger" AS ENUM('export_pdf', 'export_docx', 'print_intent');
--> statement-breakpoint
CREATE TYPE "public"."exam_pilot_readiness" AS ENUM('ready', 'ready_after_edit', 'not_ready');
--> statement-breakpoint
CREATE TABLE "exam_pilot_outcomes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "exam_id" uuid NOT NULL UNIQUE,
  "trigger" "exam_pilot_trigger" NOT NULL,
  "readiness" "exam_pilot_readiness",
  "first_export_at" timestamp with time zone DEFAULT now() NOT NULL,
  "answered_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_pilot_outcomes" ADD CONSTRAINT "exam_pilot_outcomes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "exam_pilot_outcomes" ADD CONSTRAINT "exam_pilot_outcomes_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;
