-- Repair databases that still have the pre-multi-topic exams.topic column.
ALTER TABLE "exams" DROP COLUMN IF EXISTS "topic";
