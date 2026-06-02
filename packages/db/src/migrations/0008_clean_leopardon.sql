CREATE TABLE "bank_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"question_id" uuid NOT NULL,
	"subject" "exam_subject" NOT NULL,
	"grade" integer NOT NULL,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"difficulty" "exam_difficulty" NOT NULL,
	"type" text DEFAULT 'mcq_single' NOT NULL,
	"payload" jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_questions_user_id_question_id_unique" UNIQUE("user_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_questions_user_id_idx" ON "bank_questions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bank_questions_public_browse_idx" ON "bank_questions" USING btree ("is_public","subject","grade");