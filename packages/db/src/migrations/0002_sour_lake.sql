ALTER TABLE "questions" ALTER COLUMN "option_a" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "option_b" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "option_c" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "option_d" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "correct_answer" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "type" text DEFAULT 'mcq_single' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "payload" jsonb;