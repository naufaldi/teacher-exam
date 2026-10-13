import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const rateLimitCounters = pgTable("rate_limit_counters", {
  bucketKey: text("bucket_key").primaryKey(),
  hits: jsonb("hits").$type<Record<string, Array<number>>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
})
