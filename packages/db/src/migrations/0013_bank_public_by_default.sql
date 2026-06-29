ALTER TABLE "bank_questions" ALTER COLUMN "is_public" SET DEFAULT true;--> statement-breakpoint
INSERT INTO "bank_questions"
	("id", "user_id", "question_id", "subject", "grade", "topics", "difficulty", "type", "payload", "is_public", "usage_count", "created_at")
SELECT
	gen_random_uuid(),
	e."user_id",
	q."id",
	e."subject",
	e."grade",
	CASE WHEN q."topic" IS NOT NULL AND q."topic" <> '' THEN jsonb_build_array(q."topic") ELSE '[]'::jsonb END,
	CASE WHEN q."difficulty" IN ('mudah', 'sedang', 'sulit', 'campuran') THEN q."difficulty"::"exam_difficulty" ELSE e."difficulty" END,
	q."type",
	COALESCE(q."payload", '{}'::jsonb),
	true,
	0,
	now()
FROM "questions" q
JOIN "exams" e ON q."exam_id" = e."id"
WHERE q."status" = 'accepted'
ON CONFLICT ("user_id", "question_id") DO NOTHING;--> statement-breakpoint
UPDATE "bank_questions" SET "is_public" = true WHERE "is_public" = false;
