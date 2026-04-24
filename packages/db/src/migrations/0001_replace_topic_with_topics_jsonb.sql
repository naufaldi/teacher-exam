-- Custom SQL migration file, put your code below! --
ALTER TABLE "exams" DROP COLUMN "topic";
ALTER TABLE "exams" ADD COLUMN "topics" jsonb DEFAULT '[]'::jsonb NOT NULL;
