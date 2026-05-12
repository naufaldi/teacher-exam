ALTER TABLE "exams" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "public_share_slug" text;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_public_share_slug_unique" UNIQUE("public_share_slug");