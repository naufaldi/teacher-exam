CREATE TYPE "public"."answer" AS ENUM('a', 'b', 'c', 'd');--> statement-breakpoint
CREATE TYPE "public"."exam_difficulty" AS ENUM('mudah', 'sedang', 'sulit', 'campuran');--> statement-breakpoint
CREATE TYPE "public"."exam_status" AS ENUM('draft', 'final');--> statement-breakpoint
CREATE TYPE "public"."exam_subject" AS ENUM('bahasa_indonesia', 'pendidikan_pancasila');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_mode" AS ENUM('fast', 'slow');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subject" "exam_subject" NOT NULL,
	"grade" integer NOT NULL,
	"difficulty" "exam_difficulty" NOT NULL,
	"topic" text NOT NULL,
	"review_mode" "review_mode" DEFAULT 'fast' NOT NULL,
	"status" "exam_status" DEFAULT 'draft' NOT NULL,
	"school_name" text,
	"academic_year" text,
	"exam_type" text DEFAULT 'TKA' NOT NULL,
	"exam_date" text,
	"duration_minutes" integer,
	"instructions" text,
	"class_context" text,
	"discussion_md" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"text" text NOT NULL,
	"option_a" text NOT NULL,
	"option_b" text NOT NULL,
	"option_c" text NOT NULL,
	"option_d" text NOT NULL,
	"correct_answer" "answer" NOT NULL,
	"topic" text,
	"difficulty" text,
	"status" "question_status" DEFAULT 'pending' NOT NULL,
	"validation_status" text,
	"validation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pdf_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_id" uuid,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"extracted_text" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "exams" ADD CONSTRAINT "exams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pdf_uploads" ADD CONSTRAINT "pdf_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pdf_uploads" ADD CONSTRAINT "pdf_uploads_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
