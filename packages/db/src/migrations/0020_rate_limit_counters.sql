CREATE TABLE IF NOT EXISTS "rate_limit_counters" (
  "bucket_key" text PRIMARY KEY,
  "hits" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
