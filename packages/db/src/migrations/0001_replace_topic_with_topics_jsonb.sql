-- Pre-launch: existing topic values are intentionally discarded (test data only).
ALTER TABLE "exams" DROP COLUMN "topic";
--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "topics" jsonb DEFAULT '[]'::jsonb NOT NULL;
