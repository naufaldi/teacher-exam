import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { examSubjectEnum } from "./enums"
import { user } from "./users"

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    grade: integer("grade"),
    subject: examSubjectEnum("subject"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("classes_user_id_idx").on(t.userId)]
)

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    identifier: text("identifier"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("students_class_id_idx").on(t.classId)]
)
