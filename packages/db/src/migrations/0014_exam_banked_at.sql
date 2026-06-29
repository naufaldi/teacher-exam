ALTER TABLE "exams" ADD COLUMN "banked_at" timestamp with time zone;--> statement-breakpoint
UPDATE "exams"
SET
	"banked_at" = COALESCE("updated_at", "created_at", now()),
	"is_public" = true
WHERE "status" = 'final'
	AND "banked_at" IS NULL;--> statement-breakpoint
UPDATE "exams" e
SET
	"banked_at" = COALESCE(e."updated_at", e."created_at", now()),
	"is_public" = true
WHERE e."banked_at" IS NULL
	AND e."status" = 'final'
	AND EXISTS (
		SELECT 1
		FROM "questions" q
		INNER JOIN "bank_questions" bq ON bq."question_id" = q."id"
		WHERE q."exam_id" = e."id"
	);
