ALTER TABLE "exams" ADD COLUMN "subject_label" text;--> statement-breakpoint
ALTER TABLE "exams" ALTER COLUMN "subject" DROP NOT NULL;
